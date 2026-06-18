import test from "node:test";
import assert from "node:assert/strict";
import { WipWorktreeManager, parseAndValidateNaming, resolvePaths } from "./manager";

test("naming parser accepts valid and rejects invalid", () => {
  assert.doesNotThrow(() => parseAndValidateNaming("pi-agent", "EXT-004", "sync-worktree"));
  assert.throws(() => parseAndValidateNaming("bad path", "EXT-004", "sync-worktree"));
  assert.throws(() => parseAndValidateNaming("pi", "bad", "sync-worktree"));
  assert.throws(() => parseAndValidateNaming("pi", "EXT-004", "BadSlug"));
});

test("path resolver keeps paths under workspace", () => {
  const p = resolvePaths("/Users/john.bresson/workspace", "pi-agent", "EXT-004", "sync-worktree");
  assert.match(p.canonicalPath, /\/workspace\/pi-agent$/);
  assert.match(p.worktreePath, /\/workspace\/wip\/pi-agent\/EXT-004__sync-worktree$/);
});

function fakeEnv() {
  const files = new Map<string, string>();
  const calls: Array<{ cmd: string; args: string[] }> = [];

  const exec = async (cmd: string, args: string[]) => {
    calls.push({ cmd, args });
    const joined = [cmd, ...args].join(" ");

    if (joined.includes("rev-parse --is-inside-work-tree")) return { code: 0, stdout: "true\n", stderr: "" };
    if (joined.includes("worktree list --porcelain")) return { code: 0, stdout: "", stderr: "" };
    if (joined.includes("show-ref --verify --quiet refs/heads/main")) return { code: 0, stdout: "", stderr: "" };
    if (joined.includes("show-ref --verify --quiet")) return { code: 1, stdout: "", stderr: "" };
    if (joined.includes("worktree add -b")) return { code: 0, stdout: "ok", stderr: "" };
    if (joined.includes("status --porcelain")) return { code: 0, stdout: "", stderr: "" };
    if (joined.includes("rev-parse HEAD")) return { code: 0, stdout: "abc123\n", stderr: "" };
    if (joined.includes("rev-list --reverse")) return { code: 0, stdout: "c1\nc2\n", stderr: "" };
    if (joined.includes("checkout main")) return { code: 0, stdout: "", stderr: "" };
    if (joined.includes("cherry-pick c1") || joined.includes("cherry-pick c2")) return { code: 0, stdout: "", stderr: "" };
    if (joined.includes("diff --name-only")) return { code: 0, stdout: "src/a.ts\nREADME.md\n", stderr: "" };
    if (joined.includes("worktree remove")) return { code: 0, stdout: "", stderr: "" };

    return { code: 0, stdout: "", stderr: "" };
  };

  const read = async (p: string) => {
    if (!files.has(p)) throw new Error("ENOENT");
    return files.get(p)!;
  };
  const write = async (p: string, c: string) => {
    files.set(p, c);
  };

  return { exec, read, write, files, calls };
}

test("lock acquire blocks second mutation command", async () => {
  const env = fakeEnv();
  const mgr = new WipWorktreeManager("/Users/john.bresson/workspace", env.exec as any, env.read, env.write);

  const a = await mgr.wipGraduate({ project: "pi-agent", issue: "EXT-004", slug: "sync-worktree", to: "main", noPrune: true });
  assert.equal(a.details.code, "WIP_OK");

  const lockPath = "/Users/john.bresson/workspace/.pi/state/wip-sync.lock";
  await env.write(lockPath, "occupied");
  const b = await mgr.wipGraduate({ project: "pi-agent", issue: "EXT-004", slug: "sync-worktree", to: "main", noPrune: true });
  assert.equal(b.isError, true);
});

test("audit event writer appends jsonl on prepare", async () => {
  const env = fakeEnv();
  const mgr = new WipWorktreeManager("/Users/john.bresson/workspace", env.exec as any, env.read, env.write);
  const r = await mgr.wipPrepare({ project: "pi-agent", issue: "EXT-004", slug: "sync-worktree" });
  assert.equal(r.details.code, "WIP_OK");

  const audit = env.files.get("/Users/john.bresson/workspace/.pi/logs/wip-graduations.jsonl") || "";
  assert.match(audit, /"command":"wip-prepare"/);
  assert.match(audit, /"status":"success"/);
});

test("graduate conflict returns conflict_paused contract", async () => {
  const env = fakeEnv();
  const origExec = env.exec;
  env.exec = async (cmd: string, args: string[]) => {
    const joined = [cmd, ...args].join(" ");
    if (joined.includes("show-ref --verify --quiet refs/heads/main")) return { code: 0, stdout: "", stderr: "" };
    if (joined.includes("cherry-pick c2")) return { code: 1, stdout: "", stderr: "conflict" };
    if (joined.includes("diff --name-only --diff-filter=U")) return { code: 0, stdout: "src/conflict.ts\n", stderr: "" };
    return origExec(cmd, args);
  };

  const mgr = new WipWorktreeManager("/Users/john.bresson/workspace", env.exec as any, env.read, env.write);
  const r = await mgr.wipGraduate({ project: "pi-agent", issue: "EXT-004", slug: "sync-worktree", to: "main", noPrune: true, noSquash: true });
  assert.equal(r.details.code, "WIP_E_CHERRYPICK_CONFLICT");
  assert.equal(r.details.status, "conflict_paused");
  assert.equal(r.details.resumeRequired, true);
});
