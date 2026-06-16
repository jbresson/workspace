import * as path from "path";

type ExecResult = { code: number; stdout: string; stderr: string };

export type ExecFn = (command: string, args: string[]) => Promise<ExecResult>;
export type ReadFn = (filePath: string) => Promise<string>;
export type WriteFn = (filePath: string, content: string) => Promise<void>;

export type CmdResult = {
  content: Array<{ type: "text"; text: string }>;
  details: Record<string, any>;
  isError?: boolean;
};

const PROJECT_RE = /^[a-zA-Z0-9._-]+$/;
const ISSUE_RE = /^[A-Z]+-[0-9]+$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

export function parseAndValidateNaming(project: string, issue: string, slug: string) {
  if (!PROJECT_RE.test(project) || !ISSUE_RE.test(issue) || !SLUG_RE.test(slug)) {
    throw new Error("WIP_E_INPUT_INVALID");
  }
  if ([project, issue, slug].some((v) => v.includes("/") || v.includes("\\") || v.includes("..") || /\s/.test(v))) {
    throw new Error("WIP_E_INPUT_INVALID");
  }
  return { project, issue, slug };
}

export function resolvePaths(workspaceRoot: string, project: string, issue: string, slug: string) {
  const canonicalPath = path.join(workspaceRoot, project);
  const worktreePath = path.join(workspaceRoot, "wip", project, `${issue}__${slug}`);
  const sourceBranch = `wip/${project}/${issue}/${slug}`;

  const realCanon = path.resolve(canonicalPath);
  const realWorktree = path.resolve(worktreePath);
  const realRoot = path.resolve(workspaceRoot);
  if (!realCanon.startsWith(realRoot) || !realWorktree.startsWith(realRoot)) {
    throw new Error("WIP_E_INPUT_INVALID");
  }

  return { canonicalPath: realCanon, worktreePath: realWorktree, sourceBranch };
}

function txt(details: Record<string, any>, isError = false): CmdResult {
  return {
    content: [{ type: "text", text: JSON.stringify(details, null, 2) }],
    details,
    isError,
  };
}

export class WipWorktreeManager {
  constructor(
    private readonly workspaceRoot: string,
    private readonly exec: ExecFn,
    private readonly readFile: ReadFn,
    private readonly writeFile: WriteFn,
  ) {}

  private lockPath() {
    return path.join(this.workspaceRoot, ".pi", "state", "wip-sync.lock");
  }

  private auditPath() {
    return path.join(this.workspaceRoot, ".pi", "logs", "wip-graduations.jsonl");
  }

  private async runGit(repoPath: string, args: string[]) {
    return this.exec("git", ["-C", repoPath, ...args]);
  }

  private async ensureGitRepo(repoPath: string): Promise<void> {
    const probe = await this.runGit(repoPath, ["rev-parse", "--is-inside-work-tree"]);
    if (probe.code !== 0 || probe.stdout.trim() !== "true") throw new Error("WIP_E_NOT_GIT_REPO");
  }

  private async acquireLock(command: string, ref: { project: string; issue: string; slug: string }) {
    try {
      const existing = await this.readFile(this.lockPath());
      if (existing.trim().length > 0) throw new Error("WIP_E_LOCKED");
    } catch (e: any) {
      if (!String(e.message || e).includes("ENOENT")) throw e;
    }
    const txId = `wipgrad_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${Math.random().toString(36).slice(2, 6)}`;
    await this.writeFile(this.lockPath(), JSON.stringify({ txId, command, ...ref, startedAt: new Date().toISOString() }, null, 2));
    return txId;
  }

  private async releaseLock() {
    await this.writeFile(this.lockPath(), "");
  }

  private async appendAuditEvent(event: Record<string, any>) {
    let cur = "";
    try {
      cur = await this.readFile(this.auditPath());
    } catch {
      cur = "";
    }
    const line = JSON.stringify({ ts: new Date().toISOString(), ...event });
    await this.writeFile(this.auditPath(), `${cur}${cur.endsWith("\n") || cur.length === 0 ? "" : "\n"}${line}\n`);
  }

  async wipPrepare(params: { project: string; issue: string; slug: string; base?: string }) {
    try {
      const { project, issue, slug } = parseAndValidateNaming(params.project, params.issue, params.slug);
      const { canonicalPath, worktreePath, sourceBranch } = resolvePaths(this.workspaceRoot, project, issue, slug);
      await this.ensureGitRepo(canonicalPath);

      const list = await this.runGit(canonicalPath, ["worktree", "list", "--porcelain"]);
      const exists = list.stdout.includes(`worktree ${worktreePath}`);
      const branchExists = (await this.runGit(canonicalPath, ["show-ref", "--verify", "--quiet", `refs/heads/${sourceBranch}`])).code === 0;

      let created = false;
      let attached = false;
      const baseRef = params.base || "HEAD";

      if (exists) {
        attached = true;
      } else if (branchExists) {
        const add = await this.runGit(canonicalPath, ["worktree", "add", worktreePath, sourceBranch]);
        if (add.code !== 0) throw new Error(add.stderr || "WIP_E_INTERNAL");
        attached = true;
      } else {
        const add = await this.runGit(canonicalPath, ["worktree", "add", "-b", sourceBranch, worktreePath, baseRef]);
        if (add.code !== 0) throw new Error(add.stderr || "WIP_E_INTERNAL");
        created = true;
      }

      const details = { code: "WIP_OK", project, issue, slug, canonicalPath, worktreePath, branch: sourceBranch, baseRef, created, attached };
      await this.appendAuditEvent({ command: "wip-prepare", status: "success", ...details });
      return txt(details);
    } catch (e: any) {
      const code = String(e.message || "WIP_E_INTERNAL").startsWith("WIP_") ? e.message : "WIP_E_INTERNAL";
      const details = { code, error: String(e.message || e) };
      await this.appendAuditEvent({ command: "wip-prepare", status: "failed", ...details });
      return txt(details, true);
    }
  }

  async wipList(params: { project?: string }) {
    try {
      const projects = params.project ? [params.project] : [];
      const targets = projects.length ? projects : ["."];
      const rows: any[] = [];

      for (const p of targets) {
        const canonicalPath = p === "." ? this.workspaceRoot : path.join(this.workspaceRoot, p);
        const wt = await this.runGit(canonicalPath, ["worktree", "list", "--porcelain"]);
        if (wt.code !== 0) continue;

        const chunks = wt.stdout.split("\n\n").map((c) => c.trim()).filter(Boolean);
        for (const ch of chunks) {
          const line = ch.split("\n");
          const worktree = line.find((x) => x.startsWith("worktree "))?.replace("worktree ", "") || "";
          const branch = line.find((x) => x.startsWith("branch "))?.replace("branch refs/heads/", "") || "";
          if (!branch.startsWith("wip/")) continue;
          const parts = branch.split("/");
          rows.push({ project: parts[1], issue: parts[2], slug: parts[3], branch, worktreePath: worktree, dirty: null, ahead: null, behind: null, headSha: line.find((x) => x.startsWith("HEAD "))?.replace("HEAD ", "") || "" });
        }
      }

      return txt({ code: "WIP_OK", rows });
    } catch (e: any) {
      return txt({ code: "WIP_E_INTERNAL", error: String(e.message || e) }, true);
    }
  }

  async wipStatus(params: { project: string; issue: string; slug: string }) {
    try {
      const { project, issue, slug } = parseAndValidateNaming(params.project, params.issue, params.slug);
      const { canonicalPath, worktreePath } = resolvePaths(this.workspaceRoot, project, issue, slug);
      await this.ensureGitRepo(canonicalPath);

      const status = await this.runGit(worktreePath, ["status", "--porcelain"]);
      const lines = status.stdout.split("\n").filter(Boolean);
      const staged = lines.filter((l) => l[0] !== " " && l[0] !== "?").length;
      const unstaged = lines.filter((l) => l[1] !== " " && l[0] !== "?").length;
      const untracked = lines.filter((l) => l.startsWith("??")).length;

      const branch = await this.runGit(worktreePath, ["rev-parse", "--abbrev-ref", "HEAD"]);
      const ahead = await this.runGit(worktreePath, ["rev-list", "--count", `HEAD`, `^${branch.stdout.trim()}`]);

      return txt({ code: "WIP_OK", project, issue, slug, clean: lines.length === 0, staged, unstaged, untracked, commitsAhead: Number(ahead.stdout.trim() || 0), changedFiles: lines.map((l) => l.slice(3)) });
    } catch (e: any) {
      return txt({ code: "WIP_E_INTERNAL", error: String(e.message || e) }, true);
    }
  }

  async wipGraduate(params: { project: string; issue: string; slug: string; to: string; noSquash?: boolean; description?: string; issueLink?: string; noPrune?: boolean }) {
    let txId = "";
    try {
      const { project, issue, slug } = parseAndValidateNaming(params.project, params.issue, params.slug);
      const { canonicalPath, worktreePath, sourceBranch } = resolvePaths(this.workspaceRoot, project, issue, slug);
      await this.ensureGitRepo(canonicalPath);
      txId = await this.acquireLock("wip-graduate", { project, issue, slug });

      const targetBranch = params.to;
      const targetExists = (await this.runGit(canonicalPath, ["show-ref", "--verify", "--quiet", `refs/heads/${targetBranch}`])).code === 0;
      if (!targetExists) {
        await this.releaseLock();
        return txt({ code: "WIP_E_TARGET_BRANCH_MISSING", targetBranch }, true);
      }

      const dirty = await this.runGit(worktreePath, ["status", "--porcelain"]);
      if (dirty.stdout.trim()) return txt({ code: "WIP_E_DIRTY_TREE", message: "commit or stash worktree changes first" }, true);

      const preHead = (await this.runGit(canonicalPath, ["rev-parse", "HEAD"])).stdout.trim();
      const commitsRes = await this.runGit(canonicalPath, ["rev-list", "--reverse", `${targetBranch}..${sourceBranch}`]);
      const sourceCommits = commitsRes.stdout.split("\n").filter(Boolean);

      if (!sourceCommits.length) {
        await this.appendAuditEvent({ txId, command: "wip-graduate", status: "success", project, issue, slug, sourceBranch, targetBranch, sourceCommits: [], movedCommits: [], preHead, postHead: preHead, filesChanged: [] });
        if (!params.noPrune) await this.wipPrune({ project, issue, slug, force: false });
        return txt({ code: "WIP_OK", status: "noop", txId });
      }

      const squash = !params.noSquash;
      let movedCommits = [...sourceCommits];
      if (squash) {
        const msg = `wip(${project}): ${issue} ${slug}\n\n${params.description || ""}\n${params.issueLink || ""}`.trim();
        const reset = await this.runGit(worktreePath, ["reset", "--soft", `${targetBranch}`]);
        if (reset.code !== 0) throw new Error(reset.stderr || "WIP_E_INTERNAL");
        const commit = await this.runGit(worktreePath, ["commit", "-m", msg]);
        if (commit.code !== 0) throw new Error(commit.stderr || "WIP_E_INTERNAL");
        const s = await this.runGit(worktreePath, ["rev-parse", "HEAD"]);
        movedCommits = [s.stdout.trim()];
      }

      const checkout = await this.runGit(canonicalPath, ["checkout", targetBranch]);
      if (checkout.code !== 0) throw new Error(checkout.stderr || "WIP_E_INTERNAL");

      for (const sha of movedCommits) {
        const cp = await this.runGit(canonicalPath, ["cherry-pick", sha]);
        if (cp.code !== 0) {
          const err = `${cp.stderr || ""}\n${cp.stdout || ""}`.toLowerCase();
          if (err.includes("previous cherry-pick is now empty") || err.includes("nothing to commit")) {
            await this.runGit(canonicalPath, ["cherry-pick", "--skip"]);
            continue;
          }
          const files = (await this.runGit(canonicalPath, ["diff", "--name-only", "--diff-filter=U"])).stdout.split("\n").filter(Boolean);
          await this.appendAuditEvent({ txId, command: "wip-graduate", status: "conflict", project, issue, slug, sourceBranch, targetBranch, sourceCommits, movedCommits, preHead, postHead: null, filesChanged: files, error: "WIP_E_CHERRYPICK_CONFLICT" });
          await this.releaseLock();
          return txt({
            code: "WIP_E_CHERRYPICK_CONFLICT",
            status: "conflict_paused",
            resumeRequired: true,
            message: `CONFLICT during cherry-pick to ${targetBranch}`,
            nextSteps: [
              `cd ${canonicalPath}`,
              "git status",
              "resolve files",
              "git add <resolved-files>",
              "git cherry-pick --continue OR git cherry-pick --abort",
            ],
            files,
          }, true);
        }
      }

      const postHead = (await this.runGit(canonicalPath, ["rev-parse", "HEAD"])).stdout.trim();
      const changed = (await this.runGit(canonicalPath, ["diff", "--name-only", `${preHead}..${postHead}`])).stdout.split("\n").filter(Boolean);
      await this.appendAuditEvent({ txId, command: "wip-graduate", status: "success", project, issue, slug, issueLink: params.issueLink || null, description: params.description || null, worktreePath, sourceBranch, targetBranch, squash, sourceCommits, movedCommits, preHead, postHead, filesChanged: changed, error: null });

      if (!params.noPrune) await this.wipPrune({ project, issue, slug, force: false });
      await this.releaseLock();
      return txt({ code: "WIP_OK", txId, status: "success", movedCommits, postHead });
    } catch (e: any) {
      if (txId) {
        await this.releaseLock();
      }
      await this.appendAuditEvent({ txId, command: "wip-graduate", status: "failed", error: String(e.message || e) });
      return txt({ code: "WIP_E_INTERNAL", error: String(e.message || e) }, true);
    }
  }

  async wipPrune(params: { project: string; issue: string; slug: string; force?: boolean }) {
    try {
      const { project, issue, slug } = parseAndValidateNaming(params.project, params.issue, params.slug);
      const { canonicalPath, worktreePath, sourceBranch } = resolvePaths(this.workspaceRoot, project, issue, slug);
      const dirty = await this.runGit(worktreePath, ["status", "--porcelain"]);
      if (dirty.stdout.trim() && !params.force) return txt({ code: "WIP_E_PRUNE_BLOCKED_DIRTY" }, true);

      const rm = await this.runGit(canonicalPath, ["worktree", "remove", ...(params.force ? ["--force"] : []), worktreePath]);
      if (rm.code !== 0) throw new Error(rm.stderr || "WIP_E_INTERNAL");
      await this.appendAuditEvent({ command: "wip-prune", status: "success", project, issue, slug, worktreePath, sourceBranch });
      return txt({ code: "WIP_OK", removed: true, worktreePath, sourceBranch });
    } catch (e: any) {
      await this.appendAuditEvent({ command: "wip-prune", status: "failed", error: String(e.message || e) });
      return txt({ code: "WIP_E_INTERNAL", error: String(e.message || e) }, true);
    }
  }

  async wipSeed(params: { project: string; issue: string; slug: string; paths: string[]; overwrite?: boolean }) {
    try {
      const { project, issue, slug } = parseAndValidateNaming(params.project, params.issue, params.slug);
      const { canonicalPath, worktreePath } = resolvePaths(this.workspaceRoot, project, issue, slug);

      const copied: string[] = [];
      for (const rel of params.paths) {
        if (path.isAbsolute(rel) || rel.includes("..")) return txt({ code: "WIP_E_INPUT_INVALID", rel }, true);
        const src = path.join(canonicalPath, rel);
        const dst = path.join(worktreePath, rel);
        const cat = await this.exec("cp", params.overwrite ? ["-f", src, dst] : ["-n", src, dst]);
        if (cat.code === 0) copied.push(rel);
      }
      return txt({ code: "WIP_OK", copied, overwrite: !!params.overwrite });
    } catch (e: any) {
      return txt({ code: "WIP_E_INTERNAL", error: String(e.message || e) }, true);
    }
  }
}
