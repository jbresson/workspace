/**
 * WIP Git Worktree Backend — EXT-010
 *
 * Model:
 *   Worktree root:  ~/wip/<issue>/<repo>/
 *   Wip branch:     <ISSUE>-<repo>
 *   Ticket branch:  <ISSUE>  (graduation target, auto-created from master if absent)
 *   BUDDY.md:       ~/wip/<issue>/BUDDY.md  (outside worktrees)
 *   Events:         ~/wip/<issue>/graduation.events.json  (ticket-level)
 *                   ~/wip/<issue>/<repo>/graduation.events.json  (repo-level)
 *
 * Graduation:  USER-ONLY — structurally absent from agent subActions.
 * Auto-stage:  draft/amend in librarian auto-runs `git add` in the worktree (AC-4).
 * Commit verb: wip commit — only agent git-write pathway (AC-3).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_WIP_ROOT = path.join(os.homedir(), "wip");
const LEDGER_FILES = new Set(["BUDDY.md", "graduation.events.json"]);

// ─── Input validation ────────────────────────────────────────────────────────

/** ISSUE-ID format: uppercase letters + digits, hyphen-separated, e.g. EXT-010 */
const ISSUE_RE = /^[A-Z][A-Z0-9]*-[0-9]+$/;
/** Repo name: lowercase alphanumeric + hyphens/dots/underscores, 1-63 chars */
const REPO_RE = /^[a-z0-9][a-z0-9._-]{0,62}$/;
/** Commit message: 3–500 printable chars */
const MSG_RE = /^.{3,500}$/s;

export function validateIssue(issue: string) {
  if (!ISSUE_RE.test(issue)) throw new Error(`WIP_E_INPUT_INVALID: issue='${issue}'`);
}

export function validateRepo(repo: string) {
  if (!REPO_RE.test(repo)) throw new Error(`WIP_E_INPUT_INVALID: repo='${repo}'`);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExecResult = { code: number; stdout: string; stderr: string };
export type ExecFn = (command: string, args: string[]) => Promise<ExecResult>;
export type ReadFn = (filePath: string) => Promise<string>;
export type WriteFn = (filePath: string, content: string) => Promise<void>;

export type CmdResult = {
  content: Array<{ type: "text"; text: string }>;
  details: Record<string, any>;
  isError?: boolean;
};

function txt(details: Record<string, any>, isError = false): CmdResult {
  return {
    content: [{ type: "text", text: JSON.stringify(details, null, 2) }],
    details,
    isError,
  };
}

// ─── Repo spec parser ────────────────────────────────────────────────────────

export interface ResolvedRepo {
  repoName: string;
  canonicalPath: string;
}

/**
 * Parse comma-separated repo spec string.
 *
 * Format: "<path1>,<name2>,<path3>,<name4>"
 *   - Entry containing '/' → full path; repoName = last segment; sets new "lastParent"
 *   - Bare name (no '/') → joined with lastParent from the previous full-path entry
 *
 * Example:
 *   "~/workspace,~/vivint/platform/rule,provisioning,platform-core"
 *   → [
 *       { repoName: "workspace",     canonicalPath: "~/workspace" },
 *       { repoName: "rule",          canonicalPath: "~/vivint/platform/rule" },
 *       { repoName: "provisioning",  canonicalPath: "~/vivint/platform/provisioning" },
 *       { repoName: "platform-core", canonicalPath: "~/vivint/platform/platform-core" },
 *     ]
 */
export function parseRepoSpec(spec: string): ResolvedRepo[] {
  const home = os.homedir();
  const parts = spec.split(",").map((s) => s.trim()).filter(Boolean);
  const result: ResolvedRepo[] = [];
  let lastParent: string | null = null;

  for (const part of parts) {
    // Expand ~
    const expanded = part.startsWith("~/") ? path.join(home, part.slice(2)) : part;

    if (expanded.includes(path.sep) || path.isAbsolute(expanded)) {
      // Full path entry
      const resolved = path.resolve(expanded);
      const repoName = path.basename(resolved);
      lastParent = path.dirname(resolved);
      result.push({ repoName, canonicalPath: resolved });
    } else {
      // Bare name — inherit lastParent
      if (!lastParent) {
        throw new Error(`WIP_E_REPO_SPEC: bare name '${part}' has no preceding full path to inherit parent from`);
      }
      validateRepo(expanded);
      const resolved = path.join(lastParent, expanded);
      result.push({ repoName: expanded, canonicalPath: resolved });
    }
  }

  if (result.length === 0) throw new Error("WIP_E_REPO_SPEC: empty repo spec");
  return result;
}

// ─── Path resolution ─────────────────────────────────────────────────────────

export interface WipPaths {
  ticketRoot: string;
  worktreePath: string;
  wipBranch: string;
  buddyPath: string;
  ticketEventsPath: string;
  repoEventsPath: string;
}

/**
 * Resolve all paths for a given issue + repo.
 */
export function resolveWipPaths(wipRoot: string, issue: string, repoName: string): WipPaths {
  const ticketRoot = path.join(wipRoot, issue);
  const worktreePath = path.join(ticketRoot, repoName);
  return {
    ticketRoot,
    worktreePath,
    wipBranch: `${issue}-${repoName}`,
    buddyPath: path.join(ticketRoot, "BUDDY.md"),
    ticketEventsPath: path.join(ticketRoot, "graduation.events.json"),
    repoEventsPath: path.join(worktreePath, "graduation.events.json"),
  };
}

// ─── BUDDY.md schema ─────────────────────────────────────────────────────────

export type BuddyStatus = "IN_PROGRESS" | "BLOCKED" | "READY_FOR_GRADUATION" | "GRADUATED" | "ABORTED";

export interface BuddySchema {
  status: BuddyStatus;
  objective: string;
  repos: Array<{ name: string; status: string }>;
  tasks: Array<{ done: boolean; text: string }>;
  findings: string[];
  decisions: string[];
  uncertainties: string[];
  graduation: Array<{ repo: string; status: string; timestamp: string }>;
  handover: string;
}

export function renderBuddy(b: BuddySchema): string {
  const lines = (arr: string[]) => arr.length ? arr.map((s) => `- ${s}`).join("\n") : "(none)";
  const repoList = b.repos.length
    ? b.repos.map((r) => `- ${r.name}: ${r.status}`).join("\n")
    : "(none)";
  const taskList = b.tasks.length
    ? b.tasks.map((t) => `- [${t.done ? "x" : " "}] ${t.text}`).join("\n")
    : "(none)";
  const gradList = b.graduation.length
    ? b.graduation.map((g) => `- ${g.repo}: ${g.status} — ${g.timestamp}`).join("\n")
    : "(none)";

  return [
    `## STATUS`,      b.status,
    ``,
    `## OBJECTIVE`,   b.objective,
    ``,
    `## REPOS`,       repoList,
    ``,
    `## TASKS`,       taskList,
    ``,
    `## FINDINGS`,    lines(b.findings),
    ``,
    `## DECISIONS`,   lines(b.decisions),
    ``,
    `## UNCERTAINTIES`, lines(b.uncertainties),
    ``,
    `## GRADUATION`,  gradList,
    ``,
    `## HANDOVER`,    b.handover,
  ].join("\n");
}

export function parseBuddy(content: string): Partial<BuddySchema> {
  const getSection = (header: string): string => {
    const re = new RegExp(`## ${header}\\n([\\s\\S]*?)(?=\\n## |$)`);
    return (content.match(re)?.[1] ?? "").trim();
  };

  const listLines = (raw: string) =>
    raw.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).trim());

  return {
    status: getSection("STATUS") as BuddyStatus,
    objective: getSection("OBJECTIVE"),
    repos: listLines(getSection("REPOS")).map((l) => {
      const idx = l.indexOf(": ");
      return idx >= 0
        ? { name: l.slice(0, idx), status: l.slice(idx + 2) }
        : { name: l, status: "IN_PROGRESS" };
    }),
    tasks: listLines(getSection("TASKS")).map((l) => {
      // "- [x] text" or "- [ ] text" → already stripped leading "- " by listLines
      // listLines gives us "[x] text" or "[ ] text"
      return { done: l[1] === "x", text: l.slice(4) };
    }),
    findings: listLines(getSection("FINDINGS")),
    decisions: listLines(getSection("DECISIONS")),
    uncertainties: listLines(getSection("UNCERTAINTIES")),
    graduation: listLines(getSection("GRADUATION")).map((l) => {
      const m = l.match(/^(.+?): (.+?) —\s*(.*)$/);
      return m
        ? { repo: m[1], status: m[2], timestamp: m[3] }
        : { repo: l, status: "PENDING", timestamp: "" };
    }),
    handover: getSection("HANDOVER"),
  };
}

// ─── WipManager ──────────────────────────────────────────────────────────────

export type ExistsFn = (p: string) => boolean;

export class WipManager {
  private readonly wipRoot: string;
  private readonly exists: ExistsFn;

  constructor(
    private readonly exec: ExecFn,
    private readonly readFile: ReadFn,
    private readonly writeFile: WriteFn,
    wipRoot?: string,
    existsFn?: ExistsFn,
  ) {
    this.wipRoot = wipRoot ?? DEFAULT_WIP_ROOT;
    this.exists = existsFn ?? fs.existsSync;
  }

  // ── Git helpers ────────────────────────────────────────────────────────────

  private git(repoPath: string, args: string[]) {
    return this.exec("git", ["-C", repoPath, ...args]);
  }

  private async isGitRepo(repoPath: string): Promise<boolean> {
    const r = await this.git(repoPath, ["rev-parse", "--is-inside-work-tree"]);
    return r.code === 0 && r.stdout.trim() === "true";
  }

  // ── Event log helpers ──────────────────────────────────────────────────────

  private async appendEvent(eventsPath: string, event: Record<string, any>): Promise<void> {
    let cur = "";
    try { cur = await this.readFile(eventsPath); } catch { cur = ""; }
    const sep = cur.length > 0 && !cur.endsWith("\n") ? "\n" : "";
    const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
    await this.writeFile(eventsPath, `${cur}${sep}${line}\n`);
  }

  // ── BUDDY.md helpers ───────────────────────────────────────────────────────

  private async readBuddy(buddyPath: string): Promise<Partial<BuddySchema>> {
    try {
      return parseBuddy(await this.readFile(buddyPath));
    } catch {
      return {};
    }
  }

  private async writeBuddy(buddyPath: string, schema: BuddySchema): Promise<void> {
    await this.writeFile(buddyPath, renderBuddy(schema));
  }

  private mergeBuddyRepo(
    existing: Partial<BuddySchema>,
    repoEntry: { name: string; status: string },
    issue: string,
  ): BuddySchema {
    const repos = [...(existing.repos ?? [])];
    const idx = repos.findIndex((r) => r.name === repoEntry.name);
    if (idx >= 0) repos[idx] = repoEntry;
    else repos.push(repoEntry);

    return {
      status: (existing.status as BuddyStatus) ?? "IN_PROGRESS",
      objective: existing.objective ?? `Worktree for ${issue}`,
      repos,
      tasks: existing.tasks ?? [],
      findings: existing.findings ?? [],
      decisions: existing.decisions ?? [],
      uncertainties: existing.uncertainties ?? [],
      graduation: existing.graduation ?? [],
      handover: new Date().toISOString(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-1, AC-2: wip init
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * wip init <issue> <repo-spec> [--base <branch>]
   *
   * For each resolved repo:
   *   1. Verify canonical is a git repo.
   *   2. AC-2: run git worktree prune defensively.
   *   3. Create worktree at ~/wip/<issue>/<repo>/ on branch <ISSUE>-<repo> from <base>.
   *   4. Append worktree_created event to graduation.events.json (ticket + repo).
   *   5. Init/update BUDDY.md.
   */
  async wipInit(params: { issue: string; repoSpec: string; base?: string }): Promise<CmdResult> {
    try {
      validateIssue(params.issue);
      const repos = parseRepoSpec(params.repoSpec);
      const base = params.base ?? "master";
      const results: any[] = [];

      for (const repo of repos) {
        const p = resolveWipPaths(this.wipRoot, params.issue, repo.repoName);

        // Verify git repo
        if (!(await this.isGitRepo(repo.canonicalPath))) {
          results.push({ repo: repo.repoName, code: "WIP_E_NOT_GIT_REPO", canonicalPath: repo.canonicalPath });
          continue;
        }

        // AC-2: defensive prune
        await this.git(repo.canonicalPath, ["worktree", "prune"]);

        // Check if worktree already exists
        const wtList = await this.git(repo.canonicalPath, ["worktree", "list", "--porcelain"]);
        const alreadyExists = wtList.stdout.includes(`worktree ${p.worktreePath}`);

        if (alreadyExists) {
          results.push({ repo: repo.repoName, code: "WIP_OK", status: "already_exists", worktreePath: p.worktreePath, branch: p.wipBranch });
        } else {
          // Ensure ticket root dir exists (BUDDY.md lives here, outside worktree)
          await this.exec("mkdir", ["-p", p.ticketRoot]);

          // If branch already exists, attach to it; otherwise create new
          const branchExists =
            (await this.git(repo.canonicalPath, ["show-ref", "--verify", "--quiet", `refs/heads/${p.wipBranch}`])).code === 0;

          const addArgs = branchExists
            ? ["worktree", "add", p.worktreePath, p.wipBranch]
            : ["worktree", "add", "-b", p.wipBranch, p.worktreePath, base];

          const addResult = await this.git(repo.canonicalPath, addArgs);
          if (addResult.code !== 0) {
            results.push({ repo: repo.repoName, code: "WIP_E_INTERNAL", error: addResult.stderr });
            continue;
          }

          // Append events
          const eventData = {
            type: "worktree_created",
            repo: repo.repoName,
            branch: p.wipBranch,
            base,
            worktreePath: p.worktreePath,
            canonicalPath: repo.canonicalPath,
          };
          await this.appendEvent(p.ticketEventsPath, eventData);
          await this.appendEvent(p.repoEventsPath, { ...eventData });

          results.push({
            repo: repo.repoName,
            code: "WIP_OK",
            status: "created",
            worktreePath: p.worktreePath,
            branch: p.wipBranch,
            base,
            canonicalPath: repo.canonicalPath,
          });
        }

        // Init/update BUDDY.md (AC-13)
        const existing = await this.readBuddy(p.buddyPath);
        const buddy = this.mergeBuddyRepo(existing, { name: repo.repoName, status: "IN_PROGRESS" }, params.issue);
        await this.writeBuddy(p.buddyPath, buddy);
      }

      return txt({ code: "WIP_OK", issue: params.issue, base, repos: results });
    } catch (e: any) {
      const code = String(e?.message ?? "WIP_E_INTERNAL").startsWith("WIP_") ? e.message : "WIP_E_INTERNAL";
      return txt({ code, error: String(e?.message ?? e) }, true);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-5: wip sync
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * wip sync <issue> <repo> [--base <branch>]
   *
   * git fetch origin → git rebase origin/<base>
   * Aborts rebase on conflict and returns WIP_E_REBASE_CONFLICT.
   */
  async wipSync(params: { issue: string; repo: string; base?: string }): Promise<CmdResult> {
    try {
      validateIssue(params.issue);
      validateRepo(params.repo);
      const p = resolveWipPaths(this.wipRoot, params.issue, params.repo);
      const base = params.base ?? "master";

      if (!this.exists(p.worktreePath)) {
        return txt({ code: "WIP_E_WORKTREE_NOT_FOUND", worktreePath: p.worktreePath }, true);
      }

      const fetch = await this.git(p.worktreePath, ["fetch", "origin"]);
      const rebase = await this.git(p.worktreePath, ["rebase", `origin/${base}`]);
      if (rebase.code !== 0) {
        await this.git(p.worktreePath, ["rebase", "--abort"]);
        return txt({
          code: "WIP_E_REBASE_CONFLICT",
          base,
          stdout: rebase.stdout,
          stderr: rebase.stderr,
          message: "Rebase aborted. Resolve conflicts manually and re-run wip sync.",
        }, true);
      }

      const head = (await this.git(p.worktreePath, ["rev-parse", "HEAD"])).stdout.trim();
      return txt({ code: "WIP_OK", issue: params.issue, repo: params.repo, base, head, fetchStderr: fetch.stderr });
    } catch (e: any) {
      return txt({ code: "WIP_E_INTERNAL", error: String(e?.message ?? e) }, true);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-6: wip diff
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * wip diff <issue> <repo> [--base <branch>]
   *
   * Returns code-only diff (excludes BUDDY.md and graduation.events.json).
   */
  async wipDiff(params: { issue: string; repo: string; base?: string }): Promise<CmdResult> {
    try {
      validateIssue(params.issue);
      validateRepo(params.repo);
      const p = resolveWipPaths(this.wipRoot, params.issue, params.repo);
      const base = params.base ?? "master";

      if (!this.exists(p.worktreePath)) {
        return txt({ code: "WIP_E_WORKTREE_NOT_FOUND", worktreePath: p.worktreePath }, true);
      }

      // Get list of changed files, then filter out ledger files
      const filesRes = await this.git(p.worktreePath, ["diff", `origin/${base}...HEAD`, "--name-only"]);
      const changedFiles = filesRes.stdout
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f && !LEDGER_FILES.has(path.basename(f)));

      if (changedFiles.length === 0) {
        return txt({ code: "WIP_OK", issue: params.issue, repo: params.repo, base, diff: "", changedFiles: [] });
      }

      const diffRes = await this.git(p.worktreePath, ["diff", `origin/${base}...HEAD`, "--", ...changedFiles]);
      return txt({
        code: "WIP_OK",
        issue: params.issue,
        repo: params.repo,
        base,
        branch: p.wipBranch,
        diff: diffRes.stdout,
        changedFiles,
      });
    } catch (e: any) {
      return txt({ code: "WIP_E_INTERNAL", error: String(e?.message ?? e) }, true);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-13: wip status
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * wip status <issue>
   *
   * Aggregates BUDDY.md + commits-ahead + dirty state per repo.
   */
  async wipStatus(params: { issue: string }): Promise<CmdResult> {
    try {
      validateIssue(params.issue);
      const ticketRoot = path.join(this.wipRoot, params.issue);
      const buddyPath = path.join(ticketRoot, "BUDDY.md");

      if (!this.exists(ticketRoot)) {
        return txt({ code: "WIP_E_TICKET_NOT_FOUND", issue: params.issue }, true);
      }

      const buddy = await this.readBuddy(buddyPath);
      const repoStatuses: any[] = [];

      for (const repo of buddy.repos ?? []) {
        const p = resolveWipPaths(this.wipRoot, params.issue, repo.name);

        if (!this.exists(p.worktreePath)) {
          repoStatuses.push({ repo: repo.name, status: "WORKTREE_MISSING" });
          continue;
        }

        const logRes = await this.git(p.worktreePath, ["log", "--oneline", "origin/master..HEAD"]);
        const commits = logRes.stdout.split("\n").filter(Boolean);
        const statusRes = await this.git(p.worktreePath, ["status", "--short"]);
        const dirtyFiles = statusRes.stdout.split("\n").filter(Boolean);

        repoStatuses.push({
          repo: repo.name,
          branch: p.wipBranch,
          status: repo.status,
          commitsAhead: commits.length,
          commits,
          dirtyFiles: dirtyFiles.length,
          worktreePath: p.worktreePath,
        });
      }

      return txt({
        code: "WIP_OK",
        issue: params.issue,
        status: buddy.status,
        objective: buddy.objective,
        repos: repoStatuses,
        tasks: buddy.tasks,
        handover: buddy.handover,
      });
    } catch (e: any) {
      return txt({ code: "WIP_E_INTERNAL", error: String(e?.message ?? e) }, true);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-3: wip commit
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * wip commit <issue> <repo> -m "<message>"
   *
   * Only agent git-write pathway.
   * draft/amend auto-stage files via `git add`; this command commits staged changes.
   */
  async wipCommit(params: { issue: string; repo: string; message: string }): Promise<CmdResult> {
    try {
      validateIssue(params.issue);
      validateRepo(params.repo);
      if (!MSG_RE.test(params.message)) {
        return txt({ code: "WIP_E_INPUT_INVALID", field: "message", message: params.message }, true);
      }

      const p = resolveWipPaths(this.wipRoot, params.issue, params.repo);

      if (!this.exists(p.worktreePath)) {
        return txt({ code: "WIP_E_WORKTREE_NOT_FOUND", worktreePath: p.worktreePath }, true);
      }

      const commit = await this.git(p.worktreePath, ["commit", "-m", params.message]);
      if (commit.code !== 0) {
        const out = `${commit.stdout}\n${commit.stderr}`.toLowerCase();
        if (out.includes("nothing to commit")) {
          return txt({ code: "WIP_E_NOTHING_TO_COMMIT", issue: params.issue, repo: params.repo });
        }
        return txt({ code: "WIP_E_COMMIT_FAILED", stderr: commit.stderr, stdout: commit.stdout }, true);
      }

      const sha = (await this.git(p.worktreePath, ["rev-parse", "HEAD"])).stdout.trim();
      await this.appendEvent(p.ticketEventsPath, { type: "commit", repo: params.repo, sha, message: params.message });
      await this.appendEvent(p.repoEventsPath, { type: "commit", sha, message: params.message });

      return txt({ code: "WIP_OK", issue: params.issue, repo: params.repo, sha, message: params.message });
    } catch (e: any) {
      return txt({ code: "WIP_E_INTERNAL", error: String(e?.message ?? e) }, true);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-11, AC-12: wip abort
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * wip abort <issue> [<repo>]
   *
   * 1. If graduation in-flight: rollback destination branch to preHead (AC-11).
   * 2. For each repo: git worktree remove --force → git branch -D → rm -rf (AC-12).
   * 3. If aborting full ticket (no repo specified): mark BUDDY.md ABORTED.
   */
  async wipAbort(params: { issue: string; repo?: string }): Promise<CmdResult> {
    try {
      validateIssue(params.issue);
      if (params.repo !== undefined) validateRepo(params.repo);

      const ticketRoot = path.join(this.wipRoot, params.issue);
      const ticketEventsPath = path.join(ticketRoot, "graduation.events.json");

      // AC-11: detect in-flight graduation
      await this.rollbackIfGraduationInFlight(ticketEventsPath, params.repo);

      // Determine repos to abort
      const reposToAbort: string[] = [];
      if (params.repo) {
        reposToAbort.push(params.repo);
      } else if (this.exists(ticketRoot)) {
        for (const entry of fs.readdirSync(ticketRoot, { withFileTypes: true })) {
          if (entry.isDirectory()) reposToAbort.push(entry.name);
        }
      }

      const aborted: any[] = [];

      for (const repoName of reposToAbort) {
        const p = resolveWipPaths(this.wipRoot, params.issue, repoName);
        const canonicalPath = await this.resolveCanonicalFromEvents(p.repoEventsPath);

        let removedWorktree = false;
        let deletedBranch = false;

        if (canonicalPath && this.exists(p.worktreePath)) {
          const rm = await this.git(canonicalPath, ["worktree", "remove", "--force", p.worktreePath]);
          removedWorktree = rm.code === 0;

          const del = await this.git(canonicalPath, ["branch", "-D", p.wipBranch]);
          deletedBranch = del.code === 0;
        }

        // rm -rf any remaining directory
        let removedDir = false;
        if (this.exists(p.worktreePath)) {
          try {
            fs.rmSync(p.worktreePath, { recursive: true, force: true });
            removedDir = true;
          } catch {}
        } else {
          removedDir = true; // already gone
        }

        await this.appendEvent(ticketEventsPath, {
          type: "abort_rolled_back_destination",
          repo: repoName,
          wipBranch: p.wipBranch,
          removedWorktree,
          deletedBranch,
          removedDir,
        });

        aborted.push({ repo: repoName, wipBranch: p.wipBranch, removedWorktree, deletedBranch, removedDir });
      }

      // If aborting entire ticket: mark BUDDY.md ABORTED + log event
      if (!params.repo) {
        const buddyPath = path.join(ticketRoot, "BUDDY.md");
        const existing = await this.readBuddy(buddyPath);
        await this.writeBuddy(buddyPath, {
          status: "ABORTED",
          objective: existing.objective ?? "",
          repos: existing.repos ?? [],
          tasks: existing.tasks ?? [],
          findings: existing.findings ?? [],
          decisions: existing.decisions ?? [],
          uncertainties: existing.uncertainties ?? [],
          graduation: existing.graduation ?? [],
          handover: new Date().toISOString(),
        });
        await this.appendEvent(ticketEventsPath, { type: "ticket_aborted", issue: params.issue });
      }

      return txt({ code: "WIP_OK", issue: params.issue, aborted });
    } catch (e: any) {
      return txt({ code: "WIP_E_INTERNAL", error: String(e?.message ?? e) }, true);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * AC-11: If a graduation was force_started with no subsequent finalization,
   * roll back the destination branch to preHead.
   */
  private async rollbackIfGraduationInFlight(
    ticketEventsPath: string,
    forRepo?: string,
  ): Promise<void> {
    let eventsRaw = "";
    try { eventsRaw = await this.readFile(ticketEventsPath); } catch { return; }

    const events = eventsRaw
      .split("\n")
      .filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);

    const lastForceStarted = [...events].reverse().find(
      (e) => e.type === "force_started" && (!forRepo || e.repo === forRepo),
    );
    if (!lastForceStarted) return;

    const lastFinalized = [...events].reverse().find(
      (e) =>
        (e.type === "force_succeeded_finalized" || e.type === "force_failed_rolled_back") &&
        (!forRepo || e.repo === forRepo),
    );
    if (lastFinalized && new Date(lastFinalized.ts) >= new Date(lastForceStarted.ts)) return;

    // In-flight: rollback
        // graduation events emit `targetBranch`; support both field names for robustness
    const canonicalPath = lastForceStarted.canonicalPath;
    const preHead = lastForceStarted.preHead;
    const targetBranch = lastForceStarted.targetBranch ?? lastForceStarted.ticketBranch;
    const repo = lastForceStarted.repo;
    if (!canonicalPath || !preHead || !targetBranch) return;

    await this.git(canonicalPath, ["reset", "--hard", preHead]);
    await this.appendEvent(ticketEventsPath, {
      type: "force_failed_rolled_back",
      repo,
      targetBranch,
      preHead,
      reason: "abort triggered",
    });
  }

  /**
   * Look up canonicalPath from the first worktree_created event in repo events.
   */
  private async resolveCanonicalFromEvents(repoEventsPath: string): Promise<string | null> {
    try {
      const raw = await this.readFile(repoEventsPath);
      for (const line of raw.split("\n").filter(Boolean)) {
        const e = JSON.parse(line);
        if (e.canonicalPath) return e.canonicalPath;
      }
    } catch {}
    return null;
  }
}

// ─── Graduation flow (USER-ONLY) ─────────────────────────────────────────────
// AC-8, AC-9, AC-10, AC-14 — implemented as /wip-graduation CLI command only.
// NOT registered as an omnitool subAction. See index.ts for CLI registration.

/**
 * Graduation flow steps (for CLI handler in index.ts):
 *
 * 1. Check graduation.events.json — block if conflict_paused
 * 2. git fetch origin
 * 3. If <ISSUE> branch absent → git checkout -b <ISSUE> origin/master + push -u
 * 4. git merge --squash <ISSUE>-<repo>
 * 5. git commit -m "feat(<repo>): <ISSUE> — <summary>\n\nSquashed from: <ISSUE>-<repo>\nWip HEAD SHA: <sha>"
 * 6. Record SHA mapping → graduation.events.json (ticket + repo)
 * 7. git worktree remove --force ~/wip/<ISSUE>/<repo>/
 * 8. git branch -D <ISSUE>-<repo>
 * 9. rm -rf ~/wip/<ISSUE>/<repo>/
 * 10. If all repos graduated → mark BUDDY.md STATUS: GRADUATED
 *
 * AC-14: No auto-push at any point.
 */

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Route wip subActions from omnitool dispatch.
 * AC-7: graduation is structurally absent — blocked with a clear user-facing error.
 */
export async function executeWipSubAction(
  wipRoot: string,
  params: any,
  pi?: { exec: ExecFn; readFile: ReadFn; writeFile: WriteFn },
): Promise<CmdResult | { content: Array<{ type: "text"; text: string }>; isError: boolean }> {
  const { subAction } = params ?? {};

  // AC-7: structural absence of graduation from agent-callable pathways
  if (subAction === "graduation") {
    return {
      content: [{
        type: "text",
        text: "🛡️ wip graduation is USER-ONLY. Use the /wip-graduation CLI command from your terminal. Agents cannot call this pathway.",
      }],
      isError: true,
    };
  }

  const agentSubActions = new Set(["init", "sync", "diff", "status", "commit", "abort"]);

  if (agentSubActions.has(subAction)) {
    if (!pi) {
      return {
        content: [{ type: "text", text: `subAction '${subAction}' requires pi API (exec/readFile/writeFile)` }],
        isError: true,
      };
    }
    const mgr = new WipManager(pi.exec, pi.readFile, pi.writeFile, wipRoot);

    switch (subAction) {
      case "init":   return mgr.wipInit(params);
      case "sync":   return mgr.wipSync(params);
      case "diff":   return mgr.wipDiff(params);
      case "status": return mgr.wipStatus(params);
      case "commit": return mgr.wipCommit(params);
      case "abort":  return mgr.wipAbort(params);
    }
  }

  return {
    content: [{
      type: "text",
      text: `Unknown wip subAction: '${subAction}'. Valid agent subActions: init, sync, diff, status, commit, abort`,
    }],
    isError: true,
  };
}
