/**
 * WIP Manager index — EXT-010
 *
 * Registers:
 *   - omnitool core.wip subAction router (init, sync, diff, status, commit, abort)
 *   - /wip-graduation CLI command (USER-ONLY, AC-7)
 *   - /wip-init, /wip-sync, /wip-diff, /wip-status, /wip-commit, /wip-abort CLI commands
 *
 * graduation is ONLY available as a /wip-graduation CLI command.
 * It is NOT registered as an omnitool subAction.
 */

import * as path from "node:path";
import * as os from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { WipManager, resolveWipPaths, parseBuddy } from "./manager";

const DEFAULT_WIP_ROOT = path.join(os.homedir(), "wip");

function parseArgs(raw: any): Record<string, any> {
  if (typeof raw === "object" && raw !== null) return raw;
  const s = String(raw ?? "").trim();
  const out: Record<string, any> = {};
  for (const part of s.split(/\s+/).filter(Boolean)) {
    if (part.startsWith("--")) {
      const eq = part.indexOf("=");
      if (eq >= 0) {
        const k = part.slice(2, eq).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        out[k] = part.slice(eq + 1);
      } else {
        const k = part.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        out[k] = true;
      }
      continue;
    }
    if (part.startsWith("-m")) {
      // Handle -m "<msg>" — value is next part or inline
      continue;
    }
    if (!out._) out._ = [];
    out._.push(part);
  }
  return out;
}

export default async function (pi: ExtensionAPI) {
  const wipRoot = DEFAULT_WIP_ROOT;
  const mgr = new WipManager(
    (cmd, args) => pi.exec(cmd, args),
    (p) => pi.readFile(p),
    (p, c) => pi.writeFile(p, c),
    wipRoot,
  );

  // ── Agent CLI shorthands ──────────────────────────────────────────────────

  pi.registerCommand("wip-init", {
    description: "/wip-init <issue> <repo-spec> [--base <branch>]",
    handler: async (args) => {
      const a = parseArgs(args);
      const [issue, repoSpec] = a._ ?? [];
      return mgr.wipInit({ issue, repoSpec, base: a.base });
    },
  });

  pi.registerCommand("wip-sync", {
    description: "/wip-sync <issue> <repo> [--base <branch>]",
    handler: async (args) => {
      const a = parseArgs(args);
      const [issue, repo] = a._ ?? [];
      return mgr.wipSync({ issue, repo, base: a.base });
    },
  });

  pi.registerCommand("wip-diff", {
    description: "/wip-diff <issue> <repo> [--base <branch>]",
    handler: async (args) => {
      const a = parseArgs(args);
      const [issue, repo] = a._ ?? [];
      return mgr.wipDiff({ issue, repo, base: a.base });
    },
  });

  pi.registerCommand("wip-status", {
    description: "/wip-status <issue>",
    handler: async (args) => {
      const a = parseArgs(args);
      const [issue] = a._ ?? [];
      return mgr.wipStatus({ issue });
    },
  });

  pi.registerCommand("wip-commit", {
    description: '/wip-commit <issue> <repo> -m "<message>"',
    handler: async (args) => {
      const a = parseArgs(args);
      const [issue, repo] = a._ ?? [];
      return mgr.wipCommit({ issue, repo, message: a.m ?? a.message });
    },
  });

  pi.registerCommand("wip-abort", {
    description: "/wip-abort <issue> [<repo>]",
    handler: async (args) => {
      const a = parseArgs(args);
      const [issue, repo] = a._ ?? [];
      return mgr.wipAbort({ issue, repo });
    },
  });

  // ── USER-ONLY graduation CLI ──────────────────────────────────────────────
  // AC-7: graduation is user-only, registered only as a CLI command.
  // Agents calling omnitool with subAction="graduation" receive a structural block.

  pi.registerCommand("wip-graduation", {
    description: [
      "/wip-graduation <issue> <repo> [--base <branch>] [--summary <text>]",
      "",
      "USER-ONLY: Squash-merges wip branch onto ticket branch.",
      "  1. git fetch origin",
      "  2. Auto-create <ISSUE> branch from master if absent (AC-8)",
      "  3. git merge --squash <ISSUE>-<repo>",
      "  4. git commit with SHA provenance (AC-9)",
      "  5. Cleanup: worktree remove + branch delete + rm -rf (AC-10)",
      "  6. No auto-push (AC-14)",
    ].join("\n"),
    handler: async (args) => {
      const a = parseArgs(args);
      const [issue, repo] = a._ ?? [];
      const base = a.base ?? "master";

      if (!issue || !repo) {
        return { content: [{ type: "text", text: "Usage: /wip-graduation <issue> <repo> [--base <branch>] [--summary <text>]" }] };
      }

      const p = resolveWipPaths(wipRoot, issue, repo);

      // 1. Check for conflict_paused
      let conflictPaused = false;
      try {
        const eventsRaw = await pi.readFile(p.ticketEventsPath);
        const events = eventsRaw.split("\n").filter(Boolean).map((l: string) => JSON.parse(l));
        const lastConflict = [...events].reverse().find((e: any) => e.type === "conflict_paused" && e.repo === repo);
        const lastFinalized = [...events].reverse().find((e: any) =>
          (e.type === "force_succeeded_finalized" || e.type === "force_failed_rolled_back") && e.repo === repo
        );
        if (lastConflict && (!lastFinalized || new Date(lastFinalized.ts) < new Date(lastConflict.ts))) {
          conflictPaused = true;
        }
      } catch {}

      if (conflictPaused) {
        return {
          content: [{ type: "text", text: `❌ conflict_paused: resolve the merge conflict in ${p.worktreePath} then re-run.` }],
          isError: true,
        };
      }

      // Look up canonicalPath from events
      let canonicalPath: string | null = null;
      try {
        const repoEventsRaw = await pi.readFile(p.repoEventsPath);
        for (const line of repoEventsRaw.split("\n").filter(Boolean)) {
          const e = JSON.parse(line);
          if (e.canonicalPath) { canonicalPath = e.canonicalPath; break; }
        }
      } catch {}

      if (!canonicalPath) {
        return { content: [{ type: "text", text: `❌ Cannot determine canonical repo path. Was wip init run for ${issue}/${repo}?` }], isError: true };
      }

      const appendEvent = async (evPath: string, event: Record<string, any>) => {
        let cur = ""; try { cur = await pi.readFile(evPath); } catch {}
        const sep = cur.length > 0 && !cur.endsWith("\n") ? "\n" : "";
        await pi.writeFile(evPath, `${cur}${sep}${JSON.stringify({ ts: new Date().toISOString(), ...event })}\n`);
      };

      // 2. git fetch origin
      await pi.exec("git", ["-C", canonicalPath, "fetch", "origin"]);

      // 3. AC-8: auto-create ticket branch from master if absent
      const ticketBranch = issue;
      const ticketBranchExists =
        (await pi.exec("git", ["-C", canonicalPath, "show-ref", "--verify", "--quiet", `refs/heads/${ticketBranch}`])).code === 0;
      if (!ticketBranchExists) {
        const create = await pi.exec("git", ["-C", canonicalPath, "checkout", "-b", ticketBranch, `origin/${base}`]);
        if (create.code !== 0) {
          return { content: [{ type: "text", text: `❌ Failed to create ticket branch ${ticketBranch}: ${create.stderr}` }], isError: true };
        }
      }

      // Record force_started (pre-graduation state for rollback)
      const preHead = (await pi.exec("git", ["-C", canonicalPath, "rev-parse", ticketBranch])).stdout.trim();
      await appendEvent(p.ticketEventsPath, { type: "force_started", repo, ticketBranch, preHead, canonicalPath });

      // 4. Checkout ticket branch
      await pi.exec("git", ["-C", canonicalPath, "checkout", ticketBranch]);

      // 5. git merge --squash <wipBranch>
      const wipHead = (await pi.exec("git", ["-C", p.worktreePath, "rev-parse", "HEAD"])).stdout.trim();
      const merge = await pi.exec("git", ["-C", canonicalPath, "merge", "--squash", p.wipBranch]);
      if (merge.code !== 0) {
        await appendEvent(p.ticketEventsPath, { type: "conflict_paused", repo, wipBranch: p.wipBranch, ticketBranch });
        await appendEvent(p.repoEventsPath, { type: "conflict_paused" });
        return {
          content: [{
            type: "text",
            text: [
              `❌ Merge conflict during squash into ${ticketBranch}`,
              `Next steps:`,
              `  cd ${canonicalPath}`,
              `  git status`,
              `  # resolve conflicts`,
              `  git add <resolved-files>`,
              `  git merge --continue OR git merge --abort`,
            ].join("\n"),
          }],
          isError: true,
        };
      }

      // 6. git commit with provenance
      const summary = a.summary ?? `squashed from ${p.wipBranch}`;
      const commitMsg = [
        `feat(${repo}): ${issue} — ${summary}`,
        ``,
        `Squashed from: ${p.wipBranch}`,
        `Wip HEAD SHA: ${wipHead}`,
      ].join("\n");
      const commit = await pi.exec("git", ["-C", canonicalPath, "commit", "-m", commitMsg]);
      if (commit.code !== 0) {
        return { content: [{ type: "text", text: `❌ Commit failed: ${commit.stderr}` }], isError: true };
      }

      // AC-9: record SHA mapping
      const postHead = (await pi.exec("git", ["-C", canonicalPath, "rev-parse", "HEAD"])).stdout.trim();
      await appendEvent(p.ticketEventsPath, {
        type: "force_succeeded_finalized",
        repo,
        wipBranch: p.wipBranch,
        ticketBranch,
        wipHead,
        postHead,
      });
      await appendEvent(p.repoEventsPath, { type: "force_succeeded_finalized", ticketBranch, wipHead, postHead });

      // AC-10: cleanup — worktree remove + branch delete + rm -rf
      await pi.exec("git", ["-C", canonicalPath, "worktree", "remove", "--force", p.worktreePath]);
      await pi.exec("git", ["-C", canonicalPath, "branch", "-D", p.wipBranch]);
      try { require("node:fs").rmSync(p.worktreePath, { recursive: true, force: true }); } catch {}

      // Update BUDDY.md graduation section
      try {
        const buddyRaw = await pi.readFile(p.buddyPath);
        const buddy = parseBuddy(buddyRaw);
        const grad = buddy.graduation ?? [];
        const idx = grad.findIndex((g: any) => g.repo === repo);
        const entry = { repo, status: "GRADUATED", timestamp: new Date().toISOString() };
        if (idx >= 0) grad[idx] = entry; else grad.push(entry);

        const allGraduated = (buddy.repos ?? []).every((r: any) =>
          grad.find((g: any) => g.repo === r.name && g.status === "GRADUATED")
        );

        const { renderBuddy } = await import("./manager");
        await pi.writeFile(p.buddyPath, renderBuddy({
          ...(buddy as any),
          graduation: grad,
          status: allGraduated ? "GRADUATED" : buddy.status,
          handover: new Date().toISOString(),
        }));
      } catch {}

      return {
        content: [{
          type: "text",
          text: [
            `✅ Graduation complete for ${issue}/${repo}`,
            `  Ticket branch: ${ticketBranch}`,
            `  Post-merge HEAD: ${postHead}`,
            `  Wip HEAD SHA: ${wipHead}`,
            `  ⚠️  No auto-push — run: git push origin ${ticketBranch}`,
          ].join("\n"),
        }],
      };
    },
  });
}
