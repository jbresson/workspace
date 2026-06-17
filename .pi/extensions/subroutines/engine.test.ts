import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { SubroutineEngine } from "./engine";

function seed() {
  const engine = new SubroutineEngine();
  const started = engine.startTaskPacket({
    objective: "AC-1; AC-2",
    owner: "pi",
    targetPhase: "Map",
    acceptanceCriteria: ["AC-1", "AC-2"],
    falseWinRisks: ["No regression test"],
  });
  assert.equal(started.ok, true);
  if (!started.ok) throw new Error("seed failed");
  return { engine, taskId: started.taskId };
}

test("startTaskPacket idempotent replay", () => {
  const { engine } = seed();
  const a = engine.startTaskPacket({ objective: "X;Y", owner: "pi", targetPhase: "Map" });
  const b = engine.startTaskPacket({ objective: "X;Y", owner: "pi", targetPhase: "Map" });
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  if (!b.ok) return;
  assert.equal(b.details.replayed, true);
});

test("initRegistries success then duplicate fail", () => {
  const { engine, taskId } = seed();
  const first = engine.initRegistries({ taskId, riskSeed: ["r1"] });
  assert.equal(first.ok, true);
  const dup = engine.initRegistries({ taskId });
  assert.equal(dup.ok, false);
  if (dup.ok) return;
  assert.equal(dup.error.code, "E_DUP_REGISTRY");
});

test("recordFindingStrict requires evidence", () => {
  const { engine, taskId } = seed();
  const bad = engine.recordFindingStrict({ taskId, finding: "f", evidenceRefs: [], confidence: 0.9, category: "c" });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.equal(bad.error.code, "E_NO_EVIDENCE");
});

test("recordDecisionStrict irreversible requires rollback", () => {
  const { engine, taskId } = seed();
  const bad = engine.recordDecisionStrict({ taskId, decision: "drop", reasoning: "why", reversibility: "IRREVERSIBLE", alternatives: ["alt"] });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.equal(bad.error.code, "E_IRREV_NO_ROLLBACK");
});

test("recordUncertainty requires owner + trigger", () => {
  const { engine, taskId } = seed();
  const bad = engine.recordUncertainty({ taskId, question: "q", owner: "", resolutionTrigger: "later" });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.equal(bad.error.code, "E_OWNER_MISSING");

  const ok = engine.recordUncertainty({ taskId, question: "q", owner: "pi", resolutionTrigger: "after benchmark" });
  assert.equal(ok.ok, true);
});

test("buildTaskGraph catches cycle", () => {
  const { engine, taskId } = seed();
  const bad = engine.buildTaskGraph({
    taskId,
    tasks: ["A", "B"],
    dependencies: [
      { from: "A", to: "B" },
      { from: "B", to: "A" },
    ],
  });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.equal(bad.error.code, "E_CYCLE_DETECTED");
});

test("nextBestAction returns first runnable task", () => {
  const { engine, taskId } = seed();
  const graph = engine.buildTaskGraph({ taskId, tasks: ["A", "B", "C"], dependencies: [{ from: "A", to: "B" }] });
  assert.equal(graph.ok, true);
  if (!graph.ok) return;

  const next = engine.nextBestAction({ taskId, taskGraphId: graph.details.graphVersion, completed: ["A"], blocked: [] });
  assert.equal(next.ok, true);
  if (!next.ok) return;
  assert.equal(next.details.nextTask, "B");
});

test("runCheckpoint fails when validator fails", () => {
  const { engine, taskId } = seed();
  const result = engine.runCheckpoint({ taskId, checkpointId: "CP1", phase: "Verify", validatorRef: "unit", passed: false });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "E_VALIDATION_FAIL");
});

test("verifyAc fails on gaps", () => {
  const { engine, taskId } = seed();
  const result = engine.verifyAc({ taskId, acceptanceCriteria: ["AC-1"], evidenceMap: {} });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "E_GAPS_PRESENT");
});

test("falseWinScan fails on unmitigated high", () => {
  const { engine, taskId } = seed();
  const result = engine.falseWinScan({ taskId, falseWinRisks: ["No rollback test"], executedMitigations: ["lint only"] });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "E_UNMITIGATED_HIGH");
});

test("pressureCheck fails with contradictions", () => {
  const { engine, taskId } = seed();
  const result = engine.pressureCheck({ taskId, iteration: 5, openUnknowns: 1, openContradictions: 1 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "E_CONTRADICTION_OPEN");
});

test("openBlockerIssue creates deterministic path", () => {
  const { engine, taskId } = seed();
  const result = engine.openBlockerIssue({ taskId, title: "Missing API key", impact: "Cannot run", blockedBy: "secret", neededFromHuman: "Provide key" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.details.issuePath, /^issues\/active\/BLOCK-/);
});

test("proposeFollowupIssue validates reference shape", () => {
  const { engine, taskId } = seed();
  const bad = engine.proposeFollowupIssue({ taskId, gap: "add perf test", impact: "risk", references: ["badref"] });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.equal(bad.error.code, "E_BAD_REFERENCE");

  const ok = engine.proposeFollowupIssue({ taskId, gap: "add perf test", impact: "risk", references: ["file.ts:@[1-3]"] });
  assert.equal(ok.ok, true);
});

test("contextTrimPlan requires retain set", () => {
  const { engine, taskId } = seed();
  const bad = engine.contextTrimPlan({ taskId, activeFiles: [], staleCandidates: ["a.ts"] });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.equal(bad.error.code, "E_EMPTY_RETAIN_SET");
});

test("closeTaskWithTax fails with active blockers", () => {
  const { engine, taskId } = seed();
  const blocker = engine.openBlockerIssue({ taskId, title: "No access", impact: "hard stop", blockedBy: "perm", neededFromHuman: "grant" });
  assert.equal(blocker.ok, true);

  const close = engine.closeTaskWithTax({ taskId, acProof: { overallPass: true }, findings: ["f1"], decisions: ["d1"], openUncertainties: [] });
  assert.equal(close.ok, false);
  if (close.ok) return;
  assert.equal(close.error.code, "E_CLOSE_WITH_OPEN_BLOCKER");
});

test("promoteL2ToL3 requires lineage metadata", () => {
  const { engine, taskId } = seed();
  const bad = engine.promoteL2ToL3({ taskId, entries: ["fact"], targetMemoryPath: "memory/knowledge.md", lineage: {} });
  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.equal(bad.error.code, "E_LINEAGE_INCOMPLETE");

  const ok = engine.promoteL2ToL3({ taskId, entries: ["fact"], targetMemoryPath: "memory/knowledge.md", lineage: { why: "validated", when: "2026-06-15" } });
  assert.equal(ok.ok, true);
});

test("graduate review-only does not cherry-pick/commit", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grad-"));
  const workspace = path.join(tmp, "ws");
  const srcRoot = path.join(tmp, "src");
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-a"), { recursive: true });
  await fs.writeFile(path.join(workspace, "wip", "T1", "BUDDY.md"), "STATUS: IN_PROGRESS\n");
  await fs.mkdir(path.join(srcRoot, "repo-a"), { recursive: true });

  const calls: string[] = [];
  const git = async (_repo: string, args: string[]) => {
    const cmd = args.join(" ");
    calls.push(cmd);
    if (cmd === "rev-parse --abbrev-ref HEAD") return { code: 0, stdout: "main\n", stderr: "" };
    if (cmd === "rev-parse HEAD") return { code: 0, stdout: "prehead\n", stderr: "" };
    if (cmd.startsWith("remote add") || cmd.startsWith("remote remove") || cmd.startsWith("fetch")) return { code: 0, stdout: "", stderr: "" };
    if (cmd.includes("/HEAD")) return { code: 0, stdout: "remotehead\n", stderr: "" };
    if (cmd.startsWith("rev-list --reverse")) return { code: 0, stdout: "s1\ns2\n", stderr: "" };
    return { code: 0, stdout: "", stderr: "" };
  };

  const engine = new SubroutineEngine(workspace, srcRoot, git as any);
  const result = await engine.graduateReview({ issue: "T1", repo: "repo-a" });
  assert.equal(result.status, "review_ready");
  assert.equal(result.sourceShas.length, 2);
  assert.ok(!calls.some((c) => c.startsWith("cherry-pick")));
  assert.ok(!calls.some((c) => c.startsWith("commit -m")));
});

test("graduate traversal alphabetical selection", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grad-"));
  const workspace = path.join(tmp, "ws");
  const srcRoot = path.join(tmp, "src");
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-b"), { recursive: true });
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-a"), { recursive: true });
  await fs.writeFile(path.join(workspace, "wip", "T1", "BUDDY.md"), "STATUS: IN_PROGRESS\n");
  await fs.mkdir(path.join(srcRoot, "repo-a"), { recursive: true });

  const git = async (_repo: string, args: string[]) => {
    const cmd = args.join(" ");
    if (cmd === "rev-parse --abbrev-ref HEAD") return { code: 0, stdout: "main\n", stderr: "" };
    if (cmd === "rev-parse HEAD") return { code: 0, stdout: "prehead\n", stderr: "" };
    if (cmd.startsWith("remote add") || cmd.startsWith("remote remove") || cmd.startsWith("fetch")) return { code: 0, stdout: "", stderr: "" };
    if (cmd.includes("/HEAD")) return { code: 0, stdout: "remotehead\n", stderr: "" };
    if (cmd.startsWith("rev-list --reverse")) return { code: 0, stdout: "s1\n", stderr: "" };
    return { code: 0, stdout: "", stderr: "" };
  };

  const engine = new SubroutineEngine(workspace, srcRoot, git as any);
  const result = await engine.graduateReview({ issue: "T1" });
  assert.equal(result.repo, "repo-a");
});

test("graduate happy path multi-bucket success + mapping", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grad-"));
  const workspace = path.join(tmp, "ws");
  const srcRoot = path.join(tmp, "src");
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-a"), { recursive: true });
  await fs.mkdir(path.join(workspace, "wip", "T1", ".archives"), { recursive: true });
  await fs.writeFile(path.join(workspace, "wip", "T1", "repo-a", "BUDDY.md"), "STATUS: READY_FOR_GRADUATION\n");
  await fs.writeFile(path.join(workspace, "wip", "T1", "repo-a", "tool_call.json"), "[]\n");
  await fs.writeFile(path.join(workspace, "wip", "T1", "BUDDY.md"), "STATUS: IN_PROGRESS\n");
  await fs.mkdir(path.join(srcRoot, "repo-a"), { recursive: true });

  const calls: string[] = [];
  const git = async (_repo: string, args: string[]) => {
    calls.push(args.join(" "));
    const cmd = args.join(" ");
    if (cmd === "rev-parse --is-inside-work-tree") return { code: 0, stdout: "true\n", stderr: "" };
    if (cmd === "rev-parse --abbrev-ref HEAD") return { code: 0, stdout: "main\n", stderr: "" };
    if (cmd === "status --porcelain") return { code: 0, stdout: "", stderr: "" };
    if (cmd === "rev-parse HEAD") return { code: 0, stdout: "prehead\n", stderr: "" };
    if (cmd.startsWith("remote add") || cmd.startsWith("remote remove") || cmd === "fetch wip-T1-repo-a") return { code: 0, stdout: "", stderr: "" };
    if (cmd === "rev-parse wip-T1-repo-a/HEAD") return { code: 0, stdout: "remotehead\n", stderr: "" };
    if (cmd === "rev-list --reverse prehead..remotehead") return { code: 0, stdout: "s1\ns2\n", stderr: "" };
    if (cmd.startsWith("cherry-pick -n s")) return { code: 0, stdout: "", stderr: "" };
    if (cmd === "diff --cached --name-only") return { code: 0, stdout: "a.ts\n", stderr: "" };
    if (cmd.startsWith("commit -m")) return { code: 0, stdout: "", stderr: "" };
    return { code: 0, stdout: "destsha\n", stderr: "" };
  };

  const engine = new SubroutineEngine(workspace, srcRoot, git as any);
  const result = await engine.graduateForce({ issue: "T1", repo: "repo-a" });
  assert.equal(result.status, "success");
  assert.equal(result.sourceToDestination.length, 2);
  assert.ok(calls.some((c) => c.includes("cherry-pick -n s1")));
  assert.ok(calls.some((c) => c.includes("cherry-pick -n s2")));
});

test("graduate unknown/ambiguous ticket resolution", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grad-"));
  const workspace = path.join(tmp, "ws");
  const srcRoot = path.join(tmp, "src");
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-a"), { recursive: true });
  await fs.mkdir(path.join(workspace, "wip", "T2", "repo-a"), { recursive: true });
  const engine = new SubroutineEngine(workspace, srcRoot, async () => ({ code: 0, stdout: "", stderr: "" }));
  await assert.rejects(() => engine.graduateReview({ issue: "missing", repo: "repo-a" }), /GRAD_E_TICKET_NOT_FOUND/);
  await assert.rejects(() => engine.graduateReview({ issue: "T1", repo: "repo-x" }), /GRAD_E_WIP_REPO_MISSING/);
});

test("graduate dirty working tree gate fail + missing wip repo", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grad-"));
  const workspace = path.join(tmp, "ws");
  const srcRoot = path.join(tmp, "src");
  await fs.mkdir(path.join(workspace, "wip", "T1"), { recursive: true });
  await fs.mkdir(path.join(srcRoot, "repo-a"), { recursive: true });
  const engineMissing = new SubroutineEngine(workspace, srcRoot, async () => ({ code: 0, stdout: "", stderr: "" }));
  await assert.rejects(() => engineMissing.graduateForce({ issue: "T1", repo: "repo-a" }), /GRAD_E_WIP_REPO_MISSING/);

  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-a"), { recursive: true });
  const git = async (_repo: string, args: string[]) => {
    const cmd = args.join(" ");
    if (cmd === "rev-parse --is-inside-work-tree") return { code: 0, stdout: "true\n", stderr: "" };
    if (cmd === "rev-parse --abbrev-ref HEAD") return { code: 0, stdout: "main\n", stderr: "" };
    if (cmd === "status --porcelain") return { code: 0, stdout: " M x.ts\n", stderr: "" };
    return { code: 0, stdout: "", stderr: "" };
  };
  const engineDirty = new SubroutineEngine(workspace, srcRoot, git as any);
  await assert.rejects(() => engineDirty.graduateForce({ issue: "T1", repo: "repo-a" }), /GRAD_E_DIRTY_WORKTREE/);
});

test("graduate-force traversal execution path", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grad-"));
  const workspace = path.join(tmp, "ws");
  const srcRoot = path.join(tmp, "src");
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-b"), { recursive: true });
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-a"), { recursive: true });
  await fs.writeFile(path.join(workspace, "wip", "T1", "repo-a", "tool_call.json"), "[]\n");
  await fs.writeFile(path.join(workspace, "wip", "T1", "BUDDY.md"), "STATUS: IN_PROGRESS\n");
  await fs.mkdir(path.join(srcRoot, "repo-a"), { recursive: true });

  const git = async (_repo: string, args: string[]) => {
    const cmd = args.join(" ");
    if (cmd === "rev-parse --is-inside-work-tree") return { code: 0, stdout: "true\n", stderr: "" };
    if (cmd === "rev-parse --abbrev-ref HEAD") return { code: 0, stdout: "main\n", stderr: "" };
    if (cmd === "status --porcelain") return { code: 0, stdout: "", stderr: "" };
    if (cmd === "rev-parse HEAD") return { code: 0, stdout: "pre\n", stderr: "" };
    if (cmd.startsWith("remote") || cmd.startsWith("fetch")) return { code: 0, stdout: "", stderr: "" };
    if (cmd.includes("/HEAD")) return { code: 0, stdout: "rh\n", stderr: "" };
    if (cmd.startsWith("rev-list")) return { code: 0, stdout: "s1\n", stderr: "" };
    if (cmd.startsWith("cherry-pick -n")) return { code: 0, stdout: "", stderr: "" };
    if (cmd === "diff --cached --name-only") return { code: 0, stdout: "a.ts\n", stderr: "" };
    if (cmd.startsWith("commit -m")) return { code: 0, stdout: "", stderr: "" };
    return { code: 0, stdout: "dest\n", stderr: "" };
  };

  const engine = new SubroutineEngine(workspace, srcRoot, git as any);
  const r = await engine.graduateForce({ issue: "T1" });
  assert.equal(r.status, "success");
  assert.equal(r.repo, "repo-a");
});

test("graduate conflict returns paused contract", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grad-"));
  const workspace = path.join(tmp, "ws");
  const srcRoot = path.join(tmp, "src");
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-a"), { recursive: true });
  await fs.writeFile(path.join(workspace, "wip", "T1", "repo-a", "tool_call.json"), "[]\n");
  await fs.mkdir(path.join(srcRoot, "repo-a"), { recursive: true });
  const git = async (_repo: string, args: string[]) => {
    const cmd = args.join(" ");
    if (cmd === "rev-parse --is-inside-work-tree") return { code: 0, stdout: "true\n", stderr: "" };
    if (cmd === "rev-parse --abbrev-ref HEAD") return { code: 0, stdout: "main\n", stderr: "" };
    if (cmd === "status --porcelain") return { code: 0, stdout: "", stderr: "" };
    if (cmd === "rev-parse HEAD") return { code: 0, stdout: "pre\n", stderr: "" };
    if (cmd.startsWith("remote") || cmd.startsWith("fetch")) return { code: 0, stdout: "", stderr: "" };
    if (cmd.includes("/HEAD")) return { code: 0, stdout: "rh\n", stderr: "" };
    if (cmd.startsWith("rev-list")) return { code: 0, stdout: "s1\n", stderr: "" };
    if (cmd.startsWith("cherry-pick -n")) return { code: 1, stdout: "", stderr: "conflict" };
    if (cmd.startsWith("diff --name-only --diff-filter=U")) return { code: 0, stdout: "x.ts\n", stderr: "" };
    return { code: 0, stdout: "", stderr: "" };
  };
  const engine = new SubroutineEngine(workspace, srcRoot, git as any);
  const r = await engine.graduateForce({ issue: "T1", repo: "repo-a" });
  assert.equal(r.status, "conflict_paused");
});

test("graduate-status reports pending/done/outcome", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grad-"));
  const workspace = path.join(tmp, "ws");
  const srcRoot = path.join(tmp, "src");
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-b"), { recursive: true });
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-a"), { recursive: true });
  await fs.writeFile(
    path.join(workspace, "wip", "T1", "graduation.events.json"),
    JSON.stringify([
      { ts: "2026-01-01T00:00:00.000Z", event: "review_created", repo: "repo-a" },
      { ts: "2026-01-01T01:00:00.000Z", event: "force_succeeded_finalized", repo: "repo-a" }
    ], null, 2),
  );
  const engine = new SubroutineEngine(workspace, srcRoot, async () => ({ code: 0, stdout: "", stderr: "" }));
  const s = await engine.graduateStatus({ issue: "T1" });
  assert.deepEqual(s.doneTraversal, ["repo-a"]);
  assert.deepEqual(s.pendingTraversal, ["repo-b"]);
  assert.equal(s.latestOutcome, "force_succeeded_finalized");
});

test("graduate fatal failure restores prior state", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "grad-"));
  const workspace = path.join(tmp, "ws");
  const srcRoot = path.join(tmp, "src");
  await fs.mkdir(path.join(workspace, "wip", "T1", "repo-a"), { recursive: true });
  await fs.writeFile(path.join(workspace, "wip", "T1", "repo-a", "tool_call.json"), "[]\n");
  await fs.mkdir(path.join(srcRoot, "repo-a"), { recursive: true });
  const calls: string[] = [];
  const git = async (_repo: string, args: string[]) => {
    const cmd = args.join(" ");
    calls.push(cmd);
    if (cmd === "rev-parse --is-inside-work-tree") return { code: 0, stdout: "true\n", stderr: "" };
    if (cmd === "rev-parse --abbrev-ref HEAD") return { code: 0, stdout: "main\n", stderr: "" };
    if (cmd === "status --porcelain") return { code: 0, stdout: "", stderr: "" };
    if (cmd === "rev-parse HEAD") return { code: 0, stdout: "pre\n", stderr: "" };
    if (cmd.startsWith("remote") || cmd.startsWith("fetch")) return { code: 0, stdout: "", stderr: "" };
    if (cmd.includes("/HEAD")) return { code: 0, stdout: "rh\n", stderr: "" };
    if (cmd.startsWith("rev-list")) return { code: 0, stdout: "s1\n", stderr: "" };
    if (cmd.startsWith("cherry-pick -n")) return { code: 0, stdout: "", stderr: "" };
    if (cmd === "diff --cached --name-only") return { code: 0, stdout: "a.ts\n", stderr: "" };
    if (cmd.startsWith("commit -m")) return { code: 1, stdout: "", stderr: "fail" };
    return { code: 0, stdout: "", stderr: "" };
  };
  const engine = new SubroutineEngine(workspace, srcRoot, git as any);
  await assert.rejects(() => engine.graduateForce({ issue: "T1", repo: "repo-a" }), /GRAD_E_COMMIT_FAILED/);
  assert.ok(calls.includes("cherry-pick --abort"));
  assert.ok(calls.includes("reset --hard pre"));
});

test("full happy path for all major gates", () => {
  const { engine, taskId } = seed();
  const regs = engine.initRegistries({ taskId });
  assert.equal(regs.ok, true);

  const graph = engine.buildTaskGraph({ taskId, tasks: ["impl", "test"], dependencies: [{ from: "impl", to: "test" }] });
  assert.equal(graph.ok, true);
  if (!graph.ok) return;

  const next = engine.nextBestAction({ taskId, taskGraphId: graph.details.graphVersion, completed: [], blocked: [] });
  assert.equal(next.ok, true);

  const f = engine.recordFindingStrict({ taskId, finding: "AC-1 satisfied", evidenceRefs: ["a.ts:@[1-2]"], confidence: 0.9, category: "ac" });
  assert.equal(f.ok, true);

  const d = engine.recordDecisionStrict({ taskId, decision: "Use engine", reasoning: "clean", reversibility: "REVERSIBLE", alternatives: ["inline"] });
  assert.equal(d.ok, true);

  const cp = engine.runCheckpoint({ taskId, checkpointId: "CP-VERIFY", phase: "Verify", validatorRef: "unit", passed: true, evidenceRefs: ["engine.test.ts:@[1-10]"] });
  assert.equal(cp.ok, true);

  const ac = engine.verifyAc({ taskId, acceptanceCriteria: ["AC-1", "AC-2"], evidenceMap: { "AC-1": ["a.ts:@[1-2]"], "AC-2": ["b.ts:@[3-4]"] } });
  assert.equal(ac.ok, true);

  const fw = engine.falseWinScan({ taskId, falseWinRisks: ["No regression test"], executedMitigations: ["No regression test covered"] });
  assert.equal(fw.ok, true);

  const pc = engine.pressureCheck({ taskId, iteration: 2, openUnknowns: 1, openContradictions: 0 });
  assert.equal(pc.ok, true);

  const trim = engine.contextTrimPlan({ taskId, activeFiles: ["engine.ts"], staleCandidates: ["old.ts", "engine.ts"] });
  assert.equal(trim.ok, true);

  const close = engine.closeTaskWithTax({ taskId, acProof: { overallPass: true }, findings: ["AC-1 satisfied"], decisions: ["Use engine"], openUncertainties: [] });
  assert.equal(close.ok, true);

  const promote = engine.promoteL2ToL3({ taskId, entries: ["AC-1 satisfied", "Use engine"], targetMemoryPath: "memory/knowledgebase/projects/subroutines.md", lineage: { why: "closure approved", when: "2026-06-15" } });
  assert.equal(promote.ok, true);
});
