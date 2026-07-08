import { createHash } from "crypto";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

export type RiskLevel = "low" | "medium" | "high";
export type Reversibility = "REVERSIBLE" | "IRREVERSIBLE";

type GuardrailMeta = {
  phase: string;
  riskLevel: RiskLevel;
  checkpointId?: string;
  requiresOversight: boolean;
  evidenceRefs: string[];
};

type Trace = {
  callId: string;
  timestamp: string;
  idempotencyKey: string;
  replayed?: boolean;
};

type ResultOk<T> = {
  ok: true;
  subroutine: string;
  tier: "S1" | "S2" | "S3";
  taskId: string;
  details: T & { replayed?: boolean };
  guardrail: GuardrailMeta;
  trace: Trace;
};

type ResultErr = {
  ok: false;
  error: { code: string; message: string; retryable: boolean };
  details?: Record<string, unknown>;
  trace: { callId: string; timestamp: string };
};

export type SubroutineResult<T = any> = ResultOk<T> | ResultErr;

type TaskPacket = {
  taskId: string;
  objective: string;
  constraints: string[];
  owner: string;
  targetPhase: string;
  acceptanceCriteria: string[];
  falseWinRisks: string[];
  criticalPath: string[];
  checkpoints: string[];
};

type RegistryIds = {
  riskRegisterId: string;
  uncertaintyRegistryId: string;
  blockerLogId: string;
};

type InvariantClass = "security" | "data" | "behavior" | "performance" | "compliance";

type GateStatus = "pass" | "fail";

type GateResult = {
  gate_id: "A" | "B" | "C";
  item_id: string;
  status: GateStatus;
  exit_code: number;
  reasons: string[];
  evidence: string[];
  timestamp: string;
};

type SpecInvariant = {
  id: string;
  class: InvariantClass;
  statement: string;
  authority?: string;
  anti_patterns: string[];
  verification_mode: "unit" | "integration" | "property" | "static" | "manual";
};

type SpecFile = {
  item_id: string;
  issue_id: string;
  objective: string;
  invariants: SpecInvariant[];
  scenarios: string[];
  policy?: {
    safe_write_threshold_bytes?: number;
  };
  updated_at: string;
};

type LogEntry = {
  log_id: string;
  timestamp: string;
  actor_type: "buddy";
  files: string[];
  reason: string;
  decision_ref?: string;
  hash_before: string;
  hash_after: string;
  verification: string;
  status: "pending" | "verified" | "failed" | "reverted";
};

type LogsFile = {
  item_id: string;
  entries: LogEntry[];
};

type VerifyMapping = {
  invariant_id: string;
  verification_mode: "unit" | "integration" | "property" | "static" | "manual";
  target: string;
  expected_signal: string;
  last_result: {
    status: "pass" | "fail" | "pending";
    checked_at: string;
    evidence?: string;
  };
};

type VerifyFile = {
  item_id: string;
  mappings: VerifyMapping[];
};

type GraduateActionParams = {
  issue: string;
  repo?: string;
};

type ToolCallEntry = {
  call_id: string;
  timestamp: string;
  actor_type: "buddy" | "agent" | "user";
  tool: string;
  action?: string;
  params_hash: string;
  result_status: "pass" | "fail" | "ok";
  item_id?: string;
  issue_id?: string;
  log_id?: string;
  phase?: string;
};

type ToolCallsFile = { entries: ToolCallEntry[] };

const mkCallId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();
const DEFAULT_WORKSPACE_ROOT = "/Users/john.bresson/workspace";
const DEFAULT_SOURCE_CACHE_ROOT = path.join(os.homedir(), "workspace");
const HIGH_RISK_CLASSES = new Set<InvariantClass>(["security", "data", "compliance"]);
const SAFE_WRITE_DECISIONREF_BYTES = 50 * 1024;
const execFileAsync = promisify(execFile);

function hash(v: unknown): string {
  return createHash("sha256").update(JSON.stringify(v)).digest("hex");
}

function splitBulletLines(input: string): string[] {
  return input
    .split(/[\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export class SubroutineEngine {
  private idempotent = new Map<string, SubroutineResult>();
  private packets = new Map<string, TaskPacket>();
  private registries = new Map<string, RegistryIds>();
  private findings = new Map<string, any[]>();
  private decisions = new Map<string, any[]>();
  private checkpoints = new Map<string, any[]>();
  private uncertainties = new Map<string, any[]>();
  private blockerIssues = new Map<string, any[]>();
  private followups = new Map<string, any[]>();
  private taskGraphs = new Map<string, { graphVersion: string; tasks: string[]; dependencies: Array<{ from: string; to: string }>; blockedNodes: string[]; criticalPath: string[] }>();

  constructor(
    private readonly workspaceRoot = DEFAULT_WORKSPACE_ROOT,
    private readonly sourceCacheRoot = DEFAULT_SOURCE_CACHE_ROOT,
    private readonly gitExec: (repoPath: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }> = async (repoPath, args) => {
      try {
        const { stdout, stderr } = await execFileAsync("git", ["-C", repoPath, ...args]);
        return { code: 0, stdout: stdout ?? "", stderr: stderr ?? "" };
      } catch (e: any) {
        return {
          code: Number(e?.code ?? 1),
          stdout: String(e?.stdout ?? ""),
          stderr: String(e?.stderr ?? e?.message ?? ""),
        };
      }
    },
  ) {}

  private async git(repoPath: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
    return this.gitExec(repoPath, args);
  }

  private parsePorcelainStatus(raw: string): boolean {
    return raw.split("\n").some((line) => line.trim().length > 0);
  }

  private maybeJsonBlock(content: string, header: string) {
    const match = content.match(new RegExp(`## ${header}\\n([\\s\\S]*?)(?:\\n## |$)`));
    if (!match) return [];
    try {
      return JSON.parse(match[1].trim());
    } catch {
      return [];
    }
  }

  private maybeReplay<T>(key: string): SubroutineResult<T> | undefined {
    const found = this.idempotent.get(key);
    if (!found || !found.ok) return undefined;
    return {
      ...found,
      details: { ...found.details, replayed: true },
      trace: { ...found.trace, replayed: true, timestamp: now() },
    } as SubroutineResult<T>;
  }

  private fail(code: string, message: string, details?: Record<string, unknown>, retryable = false): ResultErr {
    return {
      ok: false,
      error: { code, message, retryable },
      details,
      trace: { callId: mkCallId(), timestamp: now() },
    };
  }

  private taskMissing(taskId: string) {
    return !this.packets.has(taskId);
  }

  startTaskPacket(params: {
    objective: string;
    constraints?: string[];
    owner: string;
    targetPhase: string;
    acceptanceCriteria?: string[];
    falseWinRisks?: string[];
    criticalPath?: string[];
    checkpoints?: string[];
  }): SubroutineResult<{ acceptanceCriteria: string[]; falseWinRisks: string[]; criticalPath: string[]; checkpoints: string[]; taskId: string }> {
    if (!params.objective?.trim()) return this.fail("E_BAD_OBJECTIVE", "objective required");
    if (!params.owner?.trim()) return this.fail("E_OWNER_MISSING", "owner required");

    const acceptanceCriteria = (params.acceptanceCriteria?.length ? params.acceptanceCriteria : splitBulletLines(params.objective)).filter(Boolean);
    if (!acceptanceCriteria.length) return this.fail("E_EMPTY_AC", "acceptance criteria empty");

    const taskId = `TASK-${hash({ objective: params.objective, owner: params.owner }).slice(0, 8).toUpperCase()}`;
    const normalized = {
      objective: params.objective.trim(),
      constraints: params.constraints ?? [],
      owner: params.owner.trim(),
      targetPhase: params.targetPhase || "Map",
      acceptanceCriteria,
      falseWinRisks: params.falseWinRisks ?? ["AC passed but no edge-case coverage"],
      criticalPath: params.criticalPath ?? ["Implement", "Test", "Verify"],
      checkpoints: params.checkpoints ?? ["CP-START", "CP-VERIFY", "CP-CLOSE"],
      taskId,
    };

    const key = hash({ subroutine: "start_task_packet", taskId, normalized });
    const replay = this.maybeReplay<typeof normalized>(key);
    if (replay) return replay;

    this.packets.set(taskId, normalized);

    const result: SubroutineResult<typeof normalized> = {
      ok: true,
      subroutine: "start_task_packet",
      tier: "S2",
      taskId,
      details: normalized,
      guardrail: { phase: "Map", riskLevel: "medium", requiresOversight: false, evidenceRefs: [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  initRegistries(params: { taskId: string; riskSeed?: string[]; uncertaintySeed?: string[] }): SubroutineResult<RegistryIds> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    if (this.registries.has(params.taskId)) return this.fail("E_DUP_REGISTRY", "registries already initialized");

    const key = hash({ subroutine: "init_registries", params });
    const replay = this.maybeReplay<RegistryIds>(key);
    if (replay) return replay;

    const ids: RegistryIds = {
      riskRegisterId: `RISK-${hash({ taskId: params.taskId }).slice(0, 8)}`,
      uncertaintyRegistryId: `UN-${hash({ taskId: params.taskId, t: 1 }).slice(0, 8)}`,
      blockerLogId: `BLK-${hash({ taskId: params.taskId, t: 2 }).slice(0, 8)}`,
    };
    this.registries.set(params.taskId, ids);
    this.uncertainties.set(params.taskId, (params.uncertaintySeed ?? []).map((q, i) => ({ uncertaintyId: `U-SEED-${i}`, question: q, status: "OPEN" })));

    const result: SubroutineResult<RegistryIds> = {
      ok: true,
      subroutine: "init_registries",
      tier: "S1",
      taskId: params.taskId,
      details: ids,
      guardrail: { phase: "Map", riskLevel: "medium", requiresOversight: false, evidenceRefs: [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  recordFindingStrict(params: { taskId: string; finding: string; evidenceRefs: string[]; confidence: number; category: string }): SubroutineResult<{ findingId: string; conflicts: string[]; saved: true }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    if (!params.evidenceRefs?.length) return this.fail("E_NO_EVIDENCE", "evidenceRefs required", { missing: ["evidenceRefs"] });

    const key = hash({ subroutine: "record_finding_strict", params });
    const replay = this.maybeReplay<{ findingId: string; conflicts: string[]; saved: true }>(key);
    if (replay) return replay;

    const findingId = `F-${hash(params).slice(0, 8)}`;
    const bucket = this.findings.get(params.taskId) ?? [];
    const conflicts = bucket.filter((f) => f.category === params.category && f.finding !== params.finding).map((f) => f.findingId);

    bucket.push({ ...params, findingId });
    this.findings.set(params.taskId, bucket);

    const result: SubroutineResult<{ findingId: string; conflicts: string[]; saved: true }> = {
      ok: true,
      subroutine: "record_finding_strict",
      tier: "S1",
      taskId: params.taskId,
      details: { findingId, conflicts, saved: true },
      guardrail: { phase: "Do", riskLevel: params.confidence < 0.6 ? "high" : "low", requiresOversight: params.confidence < 0.6, evidenceRefs: params.evidenceRefs },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  recordDecisionStrict(params: { taskId: string; decision: string; reasoning: string; reversibility: Reversibility; alternatives: string[]; rollbackPlan?: string; evidenceRefs?: string[] }): SubroutineResult<{ decisionId: string; riskLevel: RiskLevel; validated: boolean }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    if (!params.alternatives?.length) return this.fail("E_NO_ALTERNATIVES", "alternatives required");
    if (params.reversibility === "IRREVERSIBLE" && !params.rollbackPlan?.trim()) return this.fail("E_IRREV_NO_ROLLBACK", "rollbackPlan required for irreversible decisions");

    const key = hash({ subroutine: "record_decision_strict", params });
    const replay = this.maybeReplay<{ decisionId: string; riskLevel: RiskLevel; validated: boolean }>(key);
    if (replay) return replay;

    const riskLevel: RiskLevel = params.reversibility === "IRREVERSIBLE" ? "high" : "medium";
    const decisionId = `D-${hash(params).slice(0, 8)}`;
    const bucket = this.decisions.get(params.taskId) ?? [];
    bucket.push({ ...params, decisionId, riskLevel });
    this.decisions.set(params.taskId, bucket);

    const result: SubroutineResult<{ decisionId: string; riskLevel: RiskLevel; validated: boolean }> = {
      ok: true,
      subroutine: "record_decision_strict",
      tier: "S1",
      taskId: params.taskId,
      details: { decisionId, riskLevel, validated: params.reversibility === "REVERSIBLE" },
      guardrail: { phase: "Decision", riskLevel, requiresOversight: riskLevel === "high", evidenceRefs: params.evidenceRefs ?? [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  recordUncertainty(params: { taskId: string; question: string; owner: string; resolutionTrigger: string; dueHint?: string }): SubroutineResult<{ uncertaintyId: string; status: "OPEN" }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    if (!params.owner?.trim()) return this.fail("E_OWNER_MISSING", "owner required");
    if (!params.resolutionTrigger?.trim()) return this.fail("E_BAD_TRIGGER", "resolutionTrigger required");

    const key = hash({ subroutine: "record_uncertainty", params });
    const replay = this.maybeReplay<{ uncertaintyId: string; status: "OPEN" }>(key);
    if (replay) return replay;

    const uncertaintyId = `U-${hash(params).slice(0, 8)}`;
    const bucket = this.uncertainties.get(params.taskId) ?? [];
    bucket.push({ ...params, uncertaintyId, status: "OPEN" });
    this.uncertainties.set(params.taskId, bucket);

    const result: SubroutineResult<{ uncertaintyId: string; status: "OPEN" }> = {
      ok: true,
      subroutine: "record_uncertainty",
      tier: "S1",
      taskId: params.taskId,
      details: { uncertaintyId, status: "OPEN" },
      guardrail: { phase: "Do", riskLevel: "medium", requiresOversight: false, evidenceRefs: [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  buildTaskGraph(params: { taskId: string; tasks: string[]; dependencies: Array<{ from: string; to: string }>; constraints?: string[] }): SubroutineResult<{ dag: Array<{ from: string; to: string }>; criticalPath: string[]; blockedNodes: string[]; graphVersion: string }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    const tasks = [...new Set(params.tasks)];
    if (!tasks.length) return this.fail("E_ORPHAN_NODE", "tasks empty");

    const unknownDep = params.dependencies.find((d) => !tasks.includes(d.from) || !tasks.includes(d.to));
    if (unknownDep) return this.fail("E_ORPHAN_NODE", "dependency references unknown node", { dependency: unknownDep });

    const edgesFrom = new Map<string, string[]>();
    for (const t of tasks) edgesFrom.set(t, []);
    for (const d of params.dependencies) edgesFrom.get(d.from)!.push(d.to);

    // cycle detect DFS
    const seen = new Set<string>();
    const stack = new Set<string>();
    const dfs = (n: string): boolean => {
      if (stack.has(n)) return true;
      if (seen.has(n)) return false;
      seen.add(n);
      stack.add(n);
      for (const m of edgesFrom.get(n) ?? []) if (dfs(m)) return true;
      stack.delete(n);
      return false;
    };
    for (const t of tasks) if (dfs(t)) return this.fail("E_CYCLE_DETECTED", "cycle detected", { at: t });

    const blockedNodes = tasks.filter((t) => (edgesFrom.get(t) ?? []).length === 0 && t !== tasks[tasks.length - 1]);
    const criticalPath = tasks;

    const key = hash({ subroutine: "build_task_graph", params: { ...params, tasks } });
    const replay = this.maybeReplay<{ dag: Array<{ from: string; to: string }>; criticalPath: string[]; blockedNodes: string[]; graphVersion: string }>(key);
    if (replay) return replay;

    const graphVersion = `G-${hash({ taskId: params.taskId, tasks, deps: params.dependencies }).slice(0, 8)}`;
    this.taskGraphs.set(params.taskId, { graphVersion, tasks, dependencies: params.dependencies, blockedNodes, criticalPath });

    const result: SubroutineResult<{ dag: Array<{ from: string; to: string }>; criticalPath: string[]; blockedNodes: string[]; graphVersion: string }> = {
      ok: true,
      subroutine: "build_task_graph",
      tier: "S2",
      taskId: params.taskId,
      details: { dag: params.dependencies, criticalPath, blockedNodes, graphVersion },
      guardrail: { phase: "Map", riskLevel: "medium", requiresOversight: false, evidenceRefs: [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  nextBestAction(params: { taskId: string; taskGraphId: string; completed: string[]; blocked: string[] }): SubroutineResult<{ nextTask: string; why: string; requiresBlockerLog: boolean }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    const graph = this.taskGraphs.get(params.taskId);
    if (!graph || graph.graphVersion !== params.taskGraphId) return this.fail("E_STALE_GRAPH", "task graph missing/stale");

    const runnable = graph.tasks.find((t) => !params.completed.includes(t) && !params.blocked.includes(t));
    if (!runnable) return this.fail("E_NO_RUNNABLE_NODE", "no runnable node", { completed: params.completed, blocked: params.blocked });

    const key = hash({ subroutine: "next_best_action", params });
    const replay = this.maybeReplay<{ nextTask: string; why: string; requiresBlockerLog: boolean }>(key);
    if (replay) return replay;

    const requiresBlockerLog = graph.blockedNodes.length > 0;
    const result: SubroutineResult<{ nextTask: string; why: string; requiresBlockerLog: boolean }> = {
      ok: true,
      subroutine: "next_best_action",
      tier: "S2",
      taskId: params.taskId,
      details: { nextTask: runnable, why: "first unblocked task in critical path", requiresBlockerLog },
      guardrail: { phase: "Do", riskLevel: "low", requiresOversight: false, evidenceRefs: [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  runCheckpoint(params: { taskId: string; checkpointId: string; phase: string; validatorRef: string; passed: boolean; evidenceRefs?: string[]; delta?: string }): SubroutineResult<{ passed: boolean; evidenceRefs: string[]; delta: string; validationId: string }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    if (!params.validatorRef?.trim()) return this.fail("E_VALIDATOR_MISSING", "validatorRef required");
    if (!params.passed) return this.fail("E_VALIDATION_FAIL", `checkpoint ${params.checkpointId} failed`, { checkpointId: params.checkpointId });

    const key = hash({ subroutine: "run_checkpoint", params });
    const replay = this.maybeReplay<{ passed: boolean; evidenceRefs: string[]; delta: string; validationId: string }>(key);
    if (replay) return replay;

    const validationId = `V-${hash(params).slice(0, 8)}`;
    const bucket = this.checkpoints.get(params.taskId) ?? [];
    bucket.push({ ...params, validationId });
    this.checkpoints.set(params.taskId, bucket);

    const result: SubroutineResult<{ passed: boolean; evidenceRefs: string[]; delta: string; validationId: string }> = {
      ok: true,
      subroutine: "run_checkpoint",
      tier: "S1",
      taskId: params.taskId,
      details: { passed: true, evidenceRefs: params.evidenceRefs ?? [], delta: params.delta ?? "none", validationId },
      guardrail: { phase: params.phase, riskLevel: "medium", checkpointId: params.checkpointId, requiresOversight: false, evidenceRefs: params.evidenceRefs ?? [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  verifyAc(params: { taskId: string; acceptanceCriteria: string[]; evidenceMap?: Record<string, string[]> }): SubroutineResult<{ acResults: Array<{ criterion: string; passed: boolean }>; gaps: string[]; overallPass: boolean }> {
    const packet = this.packets.get(params.taskId);
    if (!packet) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");

    const criteria = params.acceptanceCriteria?.length ? params.acceptanceCriteria : packet.acceptanceCriteria;
    if (!criteria.length) return this.fail("E_AC_UNTESTABLE", "no acceptance criteria");

    const key = hash({ subroutine: "verify_ac", taskId: params.taskId, criteria, evidenceMap: params.evidenceMap ?? {} });
    const replay = this.maybeReplay<{ acResults: Array<{ criterion: string; passed: boolean }>; gaps: string[]; overallPass: boolean }>(key);
    if (replay) return replay;

    const acResults = criteria.map((criterion) => ({ criterion, passed: (params.evidenceMap?.[criterion] ?? []).length > 0 }));
    const gaps = acResults.filter((r) => !r.passed).map((r) => r.criterion);
    const overallPass = gaps.length === 0;
    if (!overallPass) return this.fail("E_GAPS_PRESENT", "acceptance criteria gaps remain", { gaps });

    const result: SubroutineResult<{ acResults: Array<{ criterion: string; passed: boolean }>; gaps: string[]; overallPass: boolean }> = {
      ok: true,
      subroutine: "verify_ac",
      tier: "S2",
      taskId: params.taskId,
      details: { acResults, gaps, overallPass },
      guardrail: { phase: "Verify", riskLevel: "medium", checkpointId: "CP-VERIFY", requiresOversight: false, evidenceRefs: Object.values(params.evidenceMap ?? {}).flat() },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  falseWinScan(params: { taskId: string; falseWinRisks: string[]; executedMitigations: string[] }): SubroutineResult<{ unmitigated: string[]; severityMap: Record<string, RiskLevel> }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    const key = hash({ subroutine: "false_win_scan", params });
    const replay = this.maybeReplay<{ unmitigated: string[]; severityMap: Record<string, RiskLevel> }>(key);
    if (replay) return replay;

    const unmitigated = params.falseWinRisks.filter((r) => !params.executedMitigations.some((m) => m.toLowerCase().includes(r.toLowerCase())));
    const severityMap = Object.fromEntries(params.falseWinRisks.map((r) => [r, unmitigated.includes(r) ? "high" : "low"])) as Record<string, RiskLevel>;
    if (Object.values(severityMap).includes("high")) return this.fail("E_UNMITIGATED_HIGH", "high severity false-win risk remains", { unmitigated });

    const result: SubroutineResult<{ unmitigated: string[]; severityMap: Record<string, RiskLevel> }> = {
      ok: true,
      subroutine: "false_win_scan",
      tier: "S2",
      taskId: params.taskId,
      details: { unmitigated, severityMap },
      guardrail: { phase: "Verify", riskLevel: "medium", requiresOversight: false, evidenceRefs: [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  pressureCheck(params: { taskId: string; iteration: number; openUnknowns: number; openContradictions: number }): SubroutineResult<{ convergenceScore: number; unknownsDrift: number; trimNeeded: boolean }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    if (params.openContradictions > 0) return this.fail("E_CONTRADICTION_OPEN", "contradictions unresolved", { openContradictions: params.openContradictions });

    const key = hash({ subroutine: "pressure_check", params });
    const replay = this.maybeReplay<{ convergenceScore: number; unknownsDrift: number; trimNeeded: boolean }>(key);
    if (replay) return replay;

    const convergenceScore = Math.max(0, 100 - params.openUnknowns * 8 - params.iteration);
    const unknownsDrift = params.openUnknowns - Math.max(0, params.iteration - 1);
    const trimNeeded = params.openUnknowns > 7 || params.iteration > 10;
    if (unknownsDrift > 5) return this.fail("E_DRIFT_RISING", "unknowns drift rising", { unknownsDrift, convergenceScore });

    const result: SubroutineResult<{ convergenceScore: number; unknownsDrift: number; trimNeeded: boolean }> = {
      ok: true,
      subroutine: "pressure_check",
      tier: "S2",
      taskId: params.taskId,
      details: { convergenceScore, unknownsDrift, trimNeeded },
      guardrail: { phase: "Do", riskLevel: trimNeeded ? "medium" : "low", requiresOversight: false, evidenceRefs: [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  openBlockerIssue(params: { taskId: string; title: string; impact: string; blockedBy: string; neededFromHuman: string }): SubroutineResult<{ issuePath: string; issueId: string; linkedTaskId: string }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    if (!params.title.trim()) return this.fail("E_PATH_WRITE_FAIL", "title required for issue path generation");

    const key = hash({ subroutine: "open_blocker_issue", params });
    const replay = this.maybeReplay<{ issuePath: string; issueId: string; linkedTaskId: string }>(key);
    if (replay) return replay;

    const issueId = `BLOCK-${hash(params).slice(0, 6).toUpperCase()}`;
    const issuePath = `issues/active/${issueId}-${params.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    const bucket = this.blockerIssues.get(params.taskId) ?? [];
    bucket.push({ ...params, issueId, issuePath });
    this.blockerIssues.set(params.taskId, bucket);

    const result: SubroutineResult<{ issuePath: string; issueId: string; linkedTaskId: string }> = {
      ok: true,
      subroutine: "open_blocker_issue",
      tier: "S1",
      taskId: params.taskId,
      details: { issuePath, issueId, linkedTaskId: params.taskId },
      guardrail: { phase: "Do", riskLevel: "high", requiresOversight: true, evidenceRefs: [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  proposeFollowupIssue(params: { taskId: string; gap: string; impact: string; owner?: string; references: string[] }): SubroutineResult<{ backlogIssuePath: string; status: "PROPOSED" }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    if (params.references.some((r) => !r.includes(":"))) return this.fail("E_BAD_REFERENCE", "references must include source coordinate", { references: params.references });

    const key = hash({ subroutine: "propose_followup_issue", params });
    const replay = this.maybeReplay<{ backlogIssuePath: string; status: "PROPOSED" }>(key);
    if (replay) return replay;

    const issueId = `FU-${hash(params).slice(0, 6).toUpperCase()}`;
    const backlogIssuePath = `issues/backlog/${issueId}-${params.gap.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    const bucket = this.followups.get(params.taskId) ?? [];
    bucket.push({ ...params, issueId, backlogIssuePath, status: "PROPOSED" });
    this.followups.set(params.taskId, bucket);

    const result: SubroutineResult<{ backlogIssuePath: string; status: "PROPOSED" }> = {
      ok: true,
      subroutine: "propose_followup_issue",
      tier: "S1",
      taskId: params.taskId,
      details: { backlogIssuePath, status: "PROPOSED" },
      guardrail: { phase: "Record", riskLevel: "low", requiresOversight: false, evidenceRefs: params.references },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  contextTrimPlan(params: { taskId: string; activeFiles: string[]; staleCandidates: string[] }): SubroutineResult<{ evict: string[]; retain: string[]; rationale: string }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    const retain = [...new Set(params.activeFiles.filter(Boolean))];
    if (!retain.length) return this.fail("E_EMPTY_RETAIN_SET", "retain set empty");

    const key = hash({ subroutine: "context_trim_plan", params });
    const replay = this.maybeReplay<{ evict: string[]; retain: string[]; rationale: string }>(key);
    if (replay) return replay;

    const evict = params.staleCandidates.filter((f) => !retain.includes(f));
    const rationale = `evict ${evict.length} stale entries; retain ${retain.length} active files`;
    const result: SubroutineResult<{ evict: string[]; retain: string[]; rationale: string }> = {
      ok: true,
      subroutine: "context_trim_plan",
      tier: "S2",
      taskId: params.taskId,
      details: { evict, retain, rationale },
      guardrail: { phase: "Do", riskLevel: "low", requiresOversight: false, evidenceRefs: [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  closeTaskWithTax(params: { taskId: string; acProof: { overallPass: boolean; gaps?: string[] }; findings: string[]; decisions: string[]; openUncertainties: string[] }): SubroutineResult<{ closureReport: string; followups: string[]; memoryPromotionCandidates: string[]; workflowState: { phase: string; done: boolean } }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    if (!params.acProof?.overallPass) return this.fail("E_CLOSE_WITH_OPEN_BLOCKER", "cannot close with failed AC", { gaps: params.acProof?.gaps ?? [] });

    const blockers = this.blockerIssues.get(params.taskId) ?? [];
    if (blockers.length) return this.fail("E_CLOSE_WITH_OPEN_BLOCKER", "cannot close with active blockers", { blockers: blockers.map((b) => b.issueId) });

    const knowledgeTax = [...params.findings, ...params.decisions];
    if (!knowledgeTax.length) return this.fail("E_NO_TAX", "no findings/decisions provided for closure");

    const key = hash({ subroutine: "close_task_with_tax", params });
    const replay = this.maybeReplay<{ closureReport: string; followups: string[]; memoryPromotionCandidates: string[]; workflowState: { phase: string; done: boolean } }>(key);
    if (replay) return replay;

    const followups = params.openUncertainties.map((u) => `FOLLOWUP: ${u}`);
    const result: SubroutineResult<{ closureReport: string; followups: string[]; memoryPromotionCandidates: string[]; workflowState: { phase: string; done: boolean } }> = {
      ok: true,
      subroutine: "close_task_with_tax",
      tier: "S3",
      taskId: params.taskId,
      details: { closureReport: `Task ${params.taskId} closed with ${knowledgeTax.length} tax entries`, followups, memoryPromotionCandidates: knowledgeTax, workflowState: { phase: "DONE", done: true } },
      guardrail: { phase: "Close", riskLevel: followups.length ? "medium" : "low", checkpointId: "CP-CLOSE", requiresOversight: false, evidenceRefs: [] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  promoteL2ToL3(params: { taskId: string; entries: string[]; targetMemoryPath: string; lineage: { why?: string; when?: string; assumptions?: string[] } }): SubroutineResult<{ promoted: string[]; rejected: string[]; reasons: string[] }> {
    if (this.taskMissing(params.taskId)) return this.fail("E_TASK_NOT_FOUND", "taskId unknown");
    if (!params.lineage?.why || !params.lineage?.when) return this.fail("E_LINEAGE_INCOMPLETE", "lineage requires why + when");

    const conflicting = (this.findings.get(params.taskId) ?? []).some((f) => (f.conflicts ?? []).length > 0);
    if (conflicting) return this.fail("E_CONTRADICTION_UNRESOLVED", "conflicts unresolved");

    const key = hash({ subroutine: "promote_l2_to_l3", params });
    const replay = this.maybeReplay<{ promoted: string[]; rejected: string[]; reasons: string[] }>(key);
    if (replay) return replay;

    const promoted = [...new Set(params.entries.filter(Boolean))];
    const rejected = params.entries.filter((e) => !e.trim());
    const reasons = rejected.length ? ["empty entries removed"] : [];

    const result: SubroutineResult<{ promoted: string[]; rejected: string[]; reasons: string[] }> = {
      ok: true,
      subroutine: "promote_l2_to_l3",
      tier: "S2",
      taskId: params.taskId,
      details: { promoted, rejected, reasons },
      guardrail: { phase: "Record", riskLevel: "low", requiresOversight: false, evidenceRefs: [params.targetMemoryPath] },
      trace: { callId: mkCallId(), timestamp: now(), idempotencyKey: key },
    };
    this.idempotent.set(key, result);
    return result;
  }

  resolveContractPaths(itemId: string): {
    root: string;
    plan: string;
    spec: string;
    logs: string;
    verify: string;
    challenge: string;
    toolCalls: string;
  } {
    const safeItem = (itemId || "").trim();
    if (!safeItem) throw new Error("item_id required");
    const root = path.join(this.workspaceRoot, "docs", "pending", safeItem);
    return {
      root,
      plan: path.join(root, "plan.md"),
      spec: path.join(root, "spec.json"),
      logs: path.join(root, "logs.json"),
      verify: path.join(root, "verify.json"),
      challenge: path.join(root, "challenge.json"),
      toolCalls: path.join(root, "tool_calls.json"),
    };
  }

  private async appendToolCall(itemId: string, entry: Omit<ToolCallEntry, "timestamp" | "params_hash"> & { params: unknown }): Promise<void> {
    const paths = this.resolveContractPaths(itemId);
    const current = await fs.readFile(paths.toolCalls, "utf8").then((s) => JSON.parse(s) as ToolCallsFile).catch(() => ({ entries: [] }));
    const entries = Array.isArray(current.entries) ? current.entries : [];
    entries.push({
      ...entry,
      timestamp: now(),
      params_hash: hash(entry.params),
    });
    await fs.writeFile(paths.toolCalls, JSON.stringify({ entries }, null, 2) + "\n", "utf8");
  }

  private async readJson<T>(filePath: string): Promise<T> {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  }

  private gateResult(gate_id: "A" | "B" | "C", item_id: string, status: GateStatus, reasons: string[], evidence: string[]): GateResult {
    return { gate_id, item_id, status, exit_code: status === "pass" ? 0 : 1, reasons, evidence, timestamp: now() };
  }

  private invariantStatementRejected(statement: string): string | undefined {
    const s = (statement || "").toLowerCase();
    if (s.length < 24) return "statement_too_short";
    const antiGenericPatterns = ["no base64", "regex only", "ban function", "block api", "specific library", "single bypass"];
    const hit = antiGenericPatterns.find((p) => s.includes(p));
    if (hit) return `narrow_loophole:${hit}`;
    if (!/(must|shall|never|always|require)/.test(s)) return "missing_normative_verb";
    return undefined;
  }

  private hasLargeWriteInvariant(spec: SpecFile): boolean {
    return (spec.invariants || []).some((inv) => inv.id === "INV-DATA-LARGEWRITE-001");
  }

  async spec(params: {
    action: "init" | "ready" | "append_invariant" | "append_scenario" | "link_issue";
    itemId: string;
    objective?: string;
    issueId?: string;
    invariant?: SpecInvariant;
    scenario?: string;
  }): Promise<unknown> {
    const paths = this.resolveContractPaths(params.itemId);
    if (params.action === "ready") {
      const result = await this.gateSpecReady({ itemId: params.itemId });
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "spec", action: "ready", result_status: result.status, item_id: params.itemId, params, phase: "Map" });
      return result;
    }

    await fs.mkdir(paths.root, { recursive: true });

    if (params.action === "init") {
      const spec: SpecFile = {
        item_id: params.itemId,
        issue_id: params.issueId || "",
        objective: params.objective || "",
        invariants: [],
        scenarios: [],
        policy: { safe_write_threshold_bytes: SAFE_WRITE_DECISIONREF_BYTES },
        updated_at: now(),
      };
      const logs: LogsFile = { item_id: params.itemId, entries: [] };
      const verify: VerifyFile = { item_id: params.itemId, mappings: [] };
      const toolCalls: ToolCallsFile = { entries: [] };
      await Promise.all([
        fs.writeFile(paths.plan, `# ${params.itemId}\n\nObjective: ${params.objective || ""}\n`, "utf8"),
        fs.writeFile(paths.spec, JSON.stringify(spec, null, 2) + "\n", "utf8"),
        fs.writeFile(paths.logs, JSON.stringify(logs, null, 2) + "\n", "utf8"),
        fs.writeFile(paths.verify, JSON.stringify(verify, null, 2) + "\n", "utf8"),
        fs.writeFile(paths.toolCalls, JSON.stringify(toolCalls, null, 2) + "\n", "utf8"),
      ]);
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "spec", action: "init", result_status: "ok", item_id: params.itemId, params, phase: "Map" });
      return { item_id: params.itemId, action: "init", status: "ok", root: path.relative(this.workspaceRoot, paths.root) };
    }

    const spec = await this.readJson<SpecFile>(paths.spec);

    if (params.action === "append_invariant") {
      if (!params.invariant) throw new Error("invariant required");
      spec.invariants.push(params.invariant);
      spec.updated_at = now();
      await fs.writeFile(paths.spec, JSON.stringify(spec, null, 2) + "\n", "utf8");
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "spec", action: "append_invariant", result_status: "ok", item_id: params.itemId, params, phase: "Map" });
      return { item_id: params.itemId, action: "append_invariant", invariant_id: params.invariant.id, status: "ok" };
    }

    if (params.action === "append_scenario") {
      if (!params.scenario?.trim()) throw new Error("scenario required");
      spec.scenarios.push(params.scenario.trim());
      spec.updated_at = now();
      await fs.writeFile(paths.spec, JSON.stringify(spec, null, 2) + "\n", "utf8");
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "spec", action: "append_scenario", result_status: "ok", item_id: params.itemId, params, phase: "Map" });
      return { item_id: params.itemId, action: "append_scenario", status: "ok" };
    }

    if (params.action === "link_issue") {
      if (!params.issueId?.trim()) throw new Error("issueId required");
      spec.issue_id = params.issueId.trim();
      spec.updated_at = now();
      await fs.writeFile(paths.spec, JSON.stringify(spec, null, 2) + "\n", "utf8");
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "spec", action: "link_issue", result_status: "ok", item_id: params.itemId, issue_id: spec.issue_id, params, phase: "Map" });
      return { item_id: params.itemId, action: "link_issue", issue_id: spec.issue_id, status: "ok" };
    }

    throw new Error(`unsupported spec action: ${params.action}`);
  }

  async gateSpecReady(params: { itemId: string }): Promise<GateResult> {
    const paths = this.resolveContractPaths(params.itemId);
    const reasons: string[] = [];
    const evidence: string[] = [];

    for (const required of [paths.plan, paths.spec, paths.logs, paths.verify]) {
      try {
        await fs.access(required);
        evidence.push(`exists:${path.relative(this.workspaceRoot, required)}`);
      } catch {
        reasons.push(`missing_required_file:${path.relative(this.workspaceRoot, required)}`);
      }
    }
    if (reasons.length) return this.gateResult("A", params.itemId, "fail", reasons, evidence);

    const spec = await this.readJson<SpecFile>(paths.spec);
    const logs = await this.readJson<LogsFile>(paths.logs);
    const verify = await this.readJson<VerifyFile>(paths.verify);

    if (!spec.objective?.trim()) reasons.push("spec_objective_empty");
    if (!spec.invariants?.length) reasons.push("spec_invariants_empty");
    if (!spec.scenarios?.length) reasons.push("spec_scenarios_empty");
    if (spec.item_id !== params.itemId) reasons.push("spec_item_mismatch");
    if (logs.item_id !== params.itemId) reasons.push("logs_item_mismatch");
    if (verify.item_id !== params.itemId) reasons.push("verify_item_mismatch");

    for (const inv of spec.invariants ?? []) {
      const reject = this.invariantStatementRejected(inv.statement);
      if (reject) reasons.push(`invariant_rejected:${inv.id}:${reject}`);
      if (HIGH_RISK_CLASSES.has(inv.class) && !inv.authority?.trim()) reasons.push(`authority_required:${inv.id}`);
      if (HIGH_RISK_CLASSES.has(inv.class) && (!inv.anti_patterns || inv.anti_patterns.length === 0)) reasons.push(`anti_patterns_required:${inv.id}`);
    }

    const mapped = new Set((verify.mappings ?? []).map((m) => m.invariant_id));
    for (const inv of spec.invariants ?? []) if (!mapped.has(inv.id)) reasons.push(`verify_mapping_missing:${inv.id}`);

    return this.gateResult("A", params.itemId, reasons.length ? "fail" : "pass", reasons, evidence);
  }

  private async readReviewState(itemDir: string, logs: LogsFile): Promise<{ open_review: boolean; remaining: number; decided: number }> {
    const reviewPath = path.join(itemDir, "review.json");
    const existing = await fs.readFile(reviewPath, "utf8").then((s) => JSON.parse(s)).catch(() => ({ decisions: [] }));
    const decisions = Array.isArray(existing.decisions) ? existing.decisions : [];
    const decidedSet = new Set(decisions.map((d: any) => d.log_id));
    const verifiedCount = logs.entries.filter((e) => e.status === "verified").length;
    const remaining = Math.max(0, verifiedCount - decidedSet.size);
    const open_review = decisions.length > 0 && remaining > 0;
    return { open_review, remaining, decided: decidedSet.size };
  }

  async recordedEdit(params: {
    itemId: string;
    actorType: "buddy";
    files: Array<{ path: string; oldText: string; newText: string }>;
    reason: string;
    verification: string;
    decisionRef?: string;
  }): Promise<GateResult & { log_id: string; transaction_status: "verified" | "failed" }> {
    const paths = this.resolveContractPaths(params.itemId);
    const logs = await this.readJson<LogsFile>(paths.logs);
    const timestamp = now();
    const log_id = `LOG-${hash({ item: params.itemId, timestamp, files: params.files.map((f) => f.path) }).slice(0, 10).toUpperCase()}`;

    const reviewState = await this.readReviewState(paths.root, logs);
    if (reviewState.open_review) {
      const blocked = {
        ...this.gateResult("B", params.itemId, "fail", [`open_review_block:${reviewState.remaining}`], ["mutation_blocked_during_review"]),
        log_id,
        transaction_status: "failed" as const,
      };
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "safe_edit", result_status: "fail", item_id: params.itemId, log_id, params, phase: "Do" });
      return blocked;
    }

    const targetFiles = new Set(params.files.map((f) => f.path));
    const blocking = logs.entries.filter((e) => (e.status === "failed" || e.status === "pending") && e.files.some((f) => targetFiles.has(f)));
    if (blocking.length) {
      const blocked = {
        ...this.gateResult("B", params.itemId, "fail", [
          ...blocking.map((e) => `unresolved_transaction:${e.log_id}`),
        ], ["safe_edit_blocked"]),
        log_id,
        transaction_status: "failed" as const,
      };
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "safe_edit", result_status: "fail", item_id: params.itemId, log_id, params, phase: "Do" });
      return blocked;
    }

    const beforeHashes: string[] = [];
    const changedFiles: string[] = [];
    const reasons: string[] = [];

    for (const f of params.files) {
      const absolute = path.isAbsolute(f.path) ? f.path : path.join(this.workspaceRoot, f.path);
      const current = await fs.readFile(absolute, "utf8");
      beforeHashes.push(hash(current));
      const idx = current.indexOf(f.oldText);
      if (idx < 0) {
        reasons.push(`old_text_not_found:${f.path}`);
        continue;
      }
      const updated = current.replace(f.oldText, f.newText);
      await fs.writeFile(absolute, updated, "utf8");
      changedFiles.push(f.path);
    }

    const beforeJoined = hash(beforeHashes);
    const afterHashes = await Promise.all(
      changedFiles.map(async (file) => {
        const absolute = path.isAbsolute(file) ? file : path.join(this.workspaceRoot, file);
        const content = await fs.readFile(absolute, "utf8");
        return hash(content);
      }),
    );

    const entry: LogEntry = {
      log_id,
      timestamp,
      actor_type: params.actorType,
      files: changedFiles,
      reason: params.reason,
      decision_ref: params.decisionRef,
      hash_before: beforeJoined,
      hash_after: hash(afterHashes),
      verification: params.verification,
      status: reasons.length ? "failed" : "verified",
    };

    logs.entries.push(entry);
    await fs.writeFile(paths.logs, JSON.stringify(logs, null, 2) + "\n", "utf8");

    const gate = this.gateResult("B", params.itemId, reasons.length ? "fail" : "pass", reasons.length ? reasons : ["recorded_edit_ok"], [`log_id:${log_id}`]);
    await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "safe_edit", result_status: gate.status, item_id: params.itemId, log_id, params, phase: "Do" });
    return { ...gate, log_id, transaction_status: entry.status === "verified" ? "verified" : "failed" };
  }

  async recordedWrite(params: {
    itemId: string;
    actorType: "buddy";
    path: string;
    content: string;
    reason: string;
    verification: string;
    decisionRef?: string;
  }): Promise<GateResult & { log_id: string; transaction_status: "verified" | "failed" }> {
    const paths = this.resolveContractPaths(params.itemId);
    const logs = await this.readJson<LogsFile>(paths.logs);
    const timestamp = now();
    const log_id = `LOG-${hash({ item: params.itemId, timestamp, file: params.path }).slice(0, 10).toUpperCase()}`;

    const reviewState = await this.readReviewState(paths.root, logs);
    if (reviewState.open_review) {
      const blocked = {
        ...this.gateResult("B", params.itemId, "fail", [`open_review_block:${reviewState.remaining}`], ["mutation_blocked_during_review"]),
        log_id,
        transaction_status: "failed" as const,
      };
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "safe_write", result_status: "fail", item_id: params.itemId, log_id, params, phase: "Do" });
      return blocked;
    }

    const blocking = logs.entries.filter((e) => (e.status === "failed" || e.status === "pending") && e.files.includes(params.path));
    if (blocking.length) {
      const blocked = {
        ...this.gateResult("B", params.itemId, "fail", blocking.map((e) => `unresolved_transaction:${e.log_id}`), ["safe_write_blocked"]),
        log_id,
        transaction_status: "failed" as const,
      };
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "safe_write", result_status: "fail", item_id: params.itemId, log_id, params, phase: "Do" });
      return blocked;
    }

    const absolute = path.isAbsolute(params.path) ? params.path : path.join(this.workspaceRoot, params.path);
    const before = await fs.readFile(absolute, "utf8").catch(() => "");
    const spec = await this.readJson<SpecFile>(paths.spec);
    const threshold = Math.max(10 * 1024, Math.min(500 * 1024, spec.policy?.safe_write_threshold_bytes ?? SAFE_WRITE_DECISIONREF_BYTES));
    const projectedBytes = Buffer.byteLength(params.content || "", "utf8");
    if (!this.hasLargeWriteInvariant(spec)) {
      const blocked = {
        ...this.gateResult("B", params.itemId, "fail", ["safe_write_requires_size_invariant"], ["safe_write_policy_guard"]),
        log_id,
        transaction_status: "failed" as const,
      };
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "safe_write", result_status: "fail", item_id: params.itemId, log_id, params, phase: "Do" });
      return blocked;
    }
    if (projectedBytes > threshold) {
      const blocked = {
        ...this.gateResult("B", params.itemId, "fail", [`safe_write_exceeds_agreed_size:${projectedBytes}>${threshold}`], ["safe_write_size_guard"]),
        log_id,
        transaction_status: "failed" as const,
      };
      await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "safe_write", result_status: "fail", item_id: params.itemId, log_id, params, phase: "Do" });
      return blocked;
    }
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, params.content, "utf8");
    const after = await fs.readFile(absolute, "utf8");

    const entry: LogEntry = {
      log_id,
      timestamp,
      actor_type: params.actorType,
      files: [params.path],
      reason: params.reason,
      decision_ref: params.decisionRef,
      hash_before: hash(before),
      hash_after: hash(after),
      verification: params.verification,
      status: "verified",
    };

    logs.entries.push(entry);
    await fs.writeFile(paths.logs, JSON.stringify(logs, null, 2) + "\n", "utf8");

    const gate = this.gateResult("B", params.itemId, "pass", ["recorded_write_ok"], [`log_id:${log_id}`]);
    await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "safe_write", result_status: "pass", item_id: params.itemId, log_id, params, phase: "Do" });
    return { ...gate, log_id, transaction_status: "verified" };
  }

  async gateSyncAudit(params: { itemId: string; actualModifiedFiles: string[] }): Promise<GateResult> {
    const paths = this.resolveContractPaths(params.itemId);
    const reasons: string[] = [];
    const evidence: string[] = [];

    const logs = await this.readJson<LogsFile>(paths.logs);
    const verify = await this.readJson<VerifyFile>(paths.verify);
    const toolCalls = await this.readJson<ToolCallsFile>(paths.toolCalls).catch(() => ({ entries: [] }));

    const verifiedEntries = logs.entries.filter((e) => e.status === "verified");
    const loggedFiles = new Set(verifiedEntries.flatMap((e) => e.files));

    for (const file of params.actualModifiedFiles) if (!loggedFiles.has(file)) reasons.push(`unlogged_modification:${file}`);

    for (const entry of verifiedEntries) {
      const recomputed = await Promise.all(
        entry.files.map(async (file) => {
          const absolute = path.isAbsolute(file) ? file : path.join(this.workspaceRoot, file);
          const content = await fs.readFile(absolute, "utf8");
          return hash(content);
        }),
      );
      const currentHash = hash(recomputed);
      if (currentHash !== entry.hash_after) reasons.push(`hash_mismatch:${entry.log_id}`);
      evidence.push(`checked:${entry.log_id}`);
    }

    for (const m of verify.mappings ?? []) {
      if (!m.last_result || m.last_result.status !== "pass") reasons.push(`verify_not_current:${m.invariant_id}`);
      if (!m.last_result?.checked_at) reasons.push(`verify_missing_timestamp:${m.invariant_id}`);
    }

    const critical = (toolCalls.entries || []).filter((t) => ["spec", "safe_edit", "safe_write", "audit_change_ledger", "graduate"].includes(t.tool));
    if (!critical.length) reasons.push("tool_call_ledger_empty");
    if (!critical.some((t) => t.tool === "spec" && t.action === "ready" && t.result_status === "pass")) reasons.push("missing_spec_ready_call");
    const safeMutationCalls = critical.filter((t) => (t.tool === "safe_edit" || t.tool === "safe_write") && t.result_status === "pass");
    if (safeMutationCalls.length < verifiedEntries.length) reasons.push("safe_mutation_call_count_lt_verified_entries");
    for (const entry of verifiedEntries) {
      if (!safeMutationCalls.some((t) => t.log_id === entry.log_id)) reasons.push(`missing_safe_mutation_call_for_log:${entry.log_id}`);
    }

    const result = this.gateResult("C", params.itemId, reasons.length ? "fail" : "pass", reasons, evidence);
    await this.appendToolCall(params.itemId, { call_id: mkCallId(), actor_type: "buddy", tool: "audit_change_ledger", result_status: result.status, item_id: params.itemId, params, phase: "Verify" });
    return result;
  }

  private async resolveTicket(issue: string): Promise<{ ticketId: string; ticketDir: string }> {
    const ticketDir = path.join(this.workspaceRoot, "wip", issue);
    const stat = await fs.stat(ticketDir).catch(() => null);
    if (!stat?.isDirectory()) throw new Error(`GRAD_E_TICKET_NOT_FOUND: wip/${issue}`);
    return { ticketId: issue, ticketDir };
  }

  private async listActiveRepos(ticketDir: string): Promise<string[]> {
    const names = await fs.readdir(ticketDir).catch(() => []);
    const repos: string[] = [];
    for (const n of names) {
      if (n.startsWith(".")) continue;
      if (n === "workspace") continue;
      const p = path.join(ticketDir, n);
      const st = await fs.stat(p).catch(() => null);
      if (st?.isDirectory()) repos.push(n);
    }
    return repos.sort((a, b) => a.localeCompare(b));
  }

  private async resolveRepoForIssue(issue: string, repo?: string): Promise<{ ticketId: string; repo: string; repoDir: string; ticketDir: string; traversal: boolean }> {
    const { ticketId, ticketDir } = await this.resolveTicket(issue);
    if (repo) {
      const repoDir = path.join(ticketDir, repo);
      const st = await fs.stat(repoDir).catch(() => null);
      if (!st?.isDirectory()) throw new Error(`GRAD_E_WIP_REPO_MISSING: wip/${ticketId}/${repo}`);
      return { ticketId, repo, repoDir, ticketDir, traversal: false };
    }
    const repos = await this.listActiveRepos(ticketDir);
    if (repos.length === 0) throw new Error(`GRAD_E_NO_PENDING_REPOS: wip/${ticketId}`);
    const picked = repos[0];
    return { ticketId, repo: picked, repoDir: path.join(ticketDir, picked), ticketDir, traversal: true };
  }

  private async appendGraduateLedger(repoDir: string, payload: Record<string, unknown>) {
    const ledger = path.join(repoDir, "tool_call.json");
    const existing = await fs.readFile(ledger, "utf8").then((s) => JSON.parse(s)).catch(() => []);
    const rows = Array.isArray(existing) ? existing : [];
    rows.push({ ts: now(), tool: "graduate", ...payload });
    await fs.writeFile(ledger, JSON.stringify(rows, null, 2) + "\n", "utf8");
  }

  private async appendGraduationEvent(ticketDir: string, event: Record<string, unknown>, repo?: string, repoDir?: string) {
    const ticketEventsPath = path.join(ticketDir, "graduation.events.json");
    const ticketEvents = await fs.readFile(ticketEventsPath, "utf8").then((s) => JSON.parse(s)).catch(() => []);
    const nextTicketEvents = Array.isArray(ticketEvents) ? ticketEvents : [];
    nextTicketEvents.push({ ts: now(), ...event });
    await fs.writeFile(ticketEventsPath, JSON.stringify(nextTicketEvents, null, 2) + "\n", "utf8");

    if (repo && repoDir) {
      const repoEventsPath = path.join(repoDir, "graduation.events.json");
      const repoEvents = await fs.readFile(repoEventsPath, "utf8").then((s) => JSON.parse(s)).catch(() => []);
      const nextRepoEvents = Array.isArray(repoEvents) ? repoEvents : [];
      nextRepoEvents.push({ ts: now(), ...event });
      await fs.writeFile(repoEventsPath, JSON.stringify(nextRepoEvents, null, 2) + "\n", "utf8");
    }
  }

  private async upsertGraduationSection(mdPath: string, line: string) {
    const content = await fs.readFile(mdPath, "utf8").catch(() => "");
    const sectionHeader = "# GRADUATION";
    const block = `${sectionHeader}\n- ${line}\n`;
    if (!content.trim()) {
      await fs.writeFile(mdPath, `${block}`, "utf8");
      return;
    }
    if (!content.includes(sectionHeader)) {
      await fs.writeFile(mdPath, `${content.trimEnd()}\n\n${block}`, "utf8");
      return;
    }
    const updated = content.replace(sectionHeader, `${sectionHeader}\n- ${line}`);
    await fs.writeFile(mdPath, updated, "utf8");
  }

  private structuredCommitMessage(repo: string, bucketIndex: number, shas: string[]): string {
    return [`graduate(${repo}): curated bucket ${bucketIndex + 1}`, "", `Source-SHAs: ${shas.join(",")}`, "Flow: cherry-pick -n curated bucket"].join("\n");
  }

  private async collectCandidateShas(sourceRepo: string, remoteAlias: string, preHead: string): Promise<{ remoteHead: string; sourceShas: string[] }> {
    const remoteHead = (await this.git(sourceRepo, ["rev-parse", `${remoteAlias}/HEAD`])).stdout.trim();
    const revs = await this.git(sourceRepo, ["rev-list", "--reverse", `${preHead}..${remoteHead}`]);
    if (revs.code !== 0) throw new Error(`GRAD_E_DELTA_RESOLVE_FAILED: ${revs.stderr || revs.stdout}`);
    const sourceShas = revs.stdout.split("\n").map((s) => s.trim()).filter(Boolean);
    return { remoteHead, sourceShas };
  }

  // ── private graduation helpers (unchanged above) ──────────────────

  private async _resolveAndFetch(params: GraduateActionParams): Promise<{
    resolved:    any;
    sourceRepo:  string;
    remoteAlias: string;
    preHead:     string;
    remoteHead:  string;
    sourceShas:  string[];
  }> {
    const resolved   = await this.resolveRepoForIssue(params.issue, params.repo);
    const sourceRepo = path.join(this.sourceCacheRoot, resolved.repo);

    const srcExists = await fs.stat(sourceRepo).catch(() => null);
    if (!srcExists?.isDirectory()) throw new Error(`GRAD_E_SRC_CACHE_MISSING: ${sourceRepo}`);

    const srcInside = await this.git(sourceRepo, ["rev-parse", "--is-inside-work-tree"]);
    if (srcInside.code !== 0 || srcInside.stdout.trim() !== "true")
      throw new Error(`GRAD_E_SRC_NOT_GIT: ${sourceRepo}`);

    const wipInside = await this.git(resolved.repoDir, ["rev-parse", "--is-inside-work-tree"]);
    if (wipInside.code !== 0 || wipInside.stdout.trim() !== "true")
      throw new Error(`GRAD_E_WIP_NOT_GIT: ${resolved.repoDir}`);

    const branch = await this.git(sourceRepo, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (branch.code !== 0 || !branch.stdout.trim() || branch.stdout.trim() === "HEAD")
      throw new Error("GRAD_E_BRANCH_UNDETERMINED: checkout target branch before graduate");

    const preHead     = (await this.git(sourceRepo, ["rev-parse", "HEAD"])).stdout.trim();
    const remoteAlias = `wip-${resolved.ticketId}-${resolved.repo}`.replace(/[^a-zA-Z0-9_-]/g, "-");

    await this.git(sourceRepo, ["remote", "remove", remoteAlias]);
    const addRemote = await this.git(sourceRepo, ["remote", "add", remoteAlias, resolved.repoDir]);
    if (addRemote.code !== 0) throw new Error(`GRAD_E_REMOTE_ADD_FAILED: ${addRemote.stderr || addRemote.stdout}`);

    const fetch = await this.git(sourceRepo, ["fetch", remoteAlias]);
    if (fetch.code !== 0) throw new Error(`GRAD_E_FETCH_FAILED: ${fetch.stderr || fetch.stdout}`);

    const { remoteHead, sourceShas } = await this.collectCandidateShas(sourceRepo, remoteAlias, preHead);

    return { resolved, sourceRepo, remoteAlias, preHead, remoteHead, sourceShas };
  }

  // ── public graduation ─────────────────────────────────────────────

  async graduateDiff(params: GraduateActionParams): Promise<{
    resolved:    any;
    sourceRepo:  string;
    remoteAlias: string;
    preHead:     string;
    remoteHead:  string;
    sourceShas:  string[];
    fileDiffs:   Array<{ path: string; oldContent: string; newContent: string }>;
  }> {
    const base = await this._resolveAndFetch(params);
    const { sourceRepo, preHead, remoteHead } = base;

    const changedResult = await this.git(sourceRepo, ["diff", "--name-only", preHead, remoteHead]);
    const changedFiles  = changedResult.stdout.split("\n").map(s => s.trim()).filter(Boolean);

    const fileDiffs = await Promise.all(changedFiles.map(async filePath => {
      const [oldR, newR] = await Promise.all([
        this.git(sourceRepo, ["show", `${preHead}:${filePath}`]),
        this.git(sourceRepo, ["show", `${remoteHead}:${filePath}`]),
      ]);
      return {
        path:       filePath,
        oldContent: oldR.code === 0 ? oldR.stdout : "",
        newContent: newR.code === 0 ? newR.stdout : "",
      };
    }));

    return { ...base, fileDiffs };
  }

  async applyAndCommit(
    sourceRepo:  string,
    resolved:    any,
    remoteAlias: string,
    preHead:     string,
    sourceShas:  string[],
  ): Promise<any> {
    const dirty = await this.git(sourceRepo, ["status", "--porcelain"]);
    if (dirty.code !== 0) throw new Error(`GRAD_E_STATUS_FAILED: ${dirty.stderr || dirty.stdout}`);
    if (this.parsePorcelainStatus(dirty.stdout)) throw new Error("GRAD_E_DIRTY_WORKTREE: local source cache has uncommitted changes");

    const buckets = sourceShas.map(sha => ({ sourceShas: [sha] }));
    const mapping: Array<{ sourceShas: string[]; destinationSha: string }> = [];

    try {
      for (let i = 0; i < buckets.length; i++) {
        const b  = buckets[i];
        const cp = await this.git(sourceRepo, ["cherry-pick", "-n", ...b.sourceShas]);
        if (cp.code !== 0) {
          const conflicts = (await this.git(sourceRepo, ["diff", "--name-only", "--diff-filter=U"]))
            .stdout.split("\n").map(s => s.trim()).filter(Boolean);
          return {
            status: "conflict_paused",
            issue: resolved.ticketId, repo: resolved.repo,
            bucketIndex: i, sourceShas: b.sourceShas, conflicts,
            instructions: [
              `cd ${sourceRepo}`,
              "git status",
              "resolve conflicts && git add <files>",
              "git cherry-pick --continue  (or --abort)",
            ],
          };
        }

        const staged      = await this.git(sourceRepo, ["diff", "--cached", "--name-only"]);
        const stagedFiles = staged.stdout.split("\n").map(s => s.trim()).filter(Boolean);
        if (stagedFiles.length === 0) throw new Error(`GRAD_E_EMPTY_BUCKET_STAGE: ${i}`);

        const commit = await this.git(sourceRepo, ["commit", "-m", this.structuredCommitMessage(resolved.repo, i, b.sourceShas)]);
        if (commit.code !== 0) throw new Error(`GRAD_E_COMMIT_FAILED: ${commit.stderr || commit.stdout}`);

        const destinationSha = (await this.git(sourceRepo, ["rev-parse", "HEAD"])).stdout.trim();
        mapping.push({ sourceShas: b.sourceShas, destinationSha });
      }
    } catch (e: any) {
      await this.git(sourceRepo, ["cherry-pick", "--abort"]);
      await this.git(sourceRepo, ["reset", "--hard", preHead]);
      throw e;
    } finally {
      await this.git(sourceRepo, ["remote", "remove", remoteAlias]);
    }

    const archiveDir = path.join(this.workspaceRoot, "wip", resolved.ticketId, ".archives", resolved.repo);
    await fs.mkdir(archiveDir, { recursive: true });
    for (const name of ["BUDDY.md", "tool_call.json", "graduation.events.json"]) {
      const src = path.join(resolved.repoDir, name);
      const has = await fs.stat(src).catch(() => null);
      if (has) await fs.copyFile(src, path.join(archiveDir, name));
    }
    await fs.rm(resolved.repoDir, { recursive: true, force: true });

    return {
      status: "success",
      issue: resolved.ticketId, repo: resolved.repo,
      sourceToDestination: mapping, archivedTo: archiveDir,
    };
  }

  async recordGraduationDenials(params: {
    issue:   string;
    repo?:   string;
    denials: Array<{ path: string; reason?: string }>;
  }): Promise<void> {
    const resolved = await this.resolveRepoForIssue(params.issue, params.repo);
    await this.appendGraduationEvent(
      resolved.ticketDir,
      { event: "review_denials_recorded", issue: resolved.ticketId, repo: resolved.repo, denials: params.denials },
      resolved.repo, resolved.repoDir,
    );
    await this.upsertGraduationSection(
      path.join(resolved.ticketDir, "BUDDY.md"),
      `${now()} checkpoint: repo ${resolved.repo} — ${params.denials.length} file(s) denied, fixes needed`,
    );
  }

  async recordReviewOutcome(params: {
    issue:    string;
    repo?:    string;
    status:   "started" | "finalized" | "rolled_back" | "conflict_paused";
    preHead:  string;
    mapping?: Array<{ sourceShas: string[]; destinationSha: string }>;
    error?:   string;
  }): Promise<void> {
    const resolved  = await this.resolveRepoForIssue(params.issue, params.repo);
    const eventName = `review_confirmed_${params.status}`;

    const eventPayload: Record<string, unknown> = {
      event: eventName,
      issue: resolved.ticketId,
      repo:  resolved.repo,
      preHead: params.preHead,
      ...(params.mapping && { mapping: params.mapping }),
      ...(params.error   && { error:   params.error   }),
    };

    if (params.status !== "started") {
      await this.appendGraduateLedger(resolved.repoDir, {
        status: eventName,
        preHead: params.preHead,
        ...(params.mapping && { mapping: params.mapping }),
        ...(params.error   && { error: params.error, restored: true }),
      });
    }

    await this.appendGraduationEvent(resolved.ticketDir, eventPayload, resolved.repo, resolved.repoDir);

    if (params.status === "finalized") {
      await this.upsertGraduationSection(
        path.join(resolved.ticketDir, "BUDDY.md"),
        `${now()} milestone: repo ${resolved.repo} done (review)`,
      );
    }
  }

  async graduateForce(params: GraduateActionParams): Promise<any> {
    const resolved = await this.resolveRepoForIssue(params.issue, params.repo);
    const sourceRepo = path.join(this.sourceCacheRoot, resolved.repo);
    const srcExists = await fs.stat(sourceRepo).catch(() => null);
    if (!srcExists?.isDirectory()) throw new Error(`GRAD_E_SRC_CACHE_MISSING: ${sourceRepo}`);

    const branch = await this.git(sourceRepo, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (branch.code !== 0 || !branch.stdout.trim() || branch.stdout.trim() === "HEAD") throw new Error("GRAD_E_BRANCH_UNDETERMINED: checkout target branch before graduate");
    const preHead = (await this.git(sourceRepo, ["rev-parse", "HEAD"])).stdout.trim();

    const remoteAlias = `wip-${resolved.ticketId}-${resolved.repo}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    await this.git(sourceRepo, ["remote", "remove", remoteAlias]);
    const addRemote = await this.git(sourceRepo, ["remote", "add", remoteAlias, resolved.repoDir]);
    if (addRemote.code !== 0) throw new Error(`GRAD_E_REMOTE_ADD_FAILED: ${addRemote.stderr || addRemote.stdout}`);
    const fetch = await this.git(sourceRepo, ["fetch", remoteAlias]);
    if (fetch.code !== 0) throw new Error(`GRAD_E_FETCH_FAILED: ${fetch.stderr || fetch.stdout}`);

    const { remoteHead, sourceShas } = await this.collectCandidateShas(sourceRepo, remoteAlias, preHead);
    await this.git(sourceRepo, ["remote", "remove", remoteAlias]);

    await this.appendGraduationEvent(resolved.ticketDir, { event: "review_created", issue: resolved.ticketId, repo: resolved.repo, sourceShas, preHead, remoteHead }, resolved.repo, resolved.repoDir);
    await this.upsertGraduationSection(path.join(resolved.ticketDir, "BUDDY.md"), `${now()} checkpoint: repo ${resolved.repo} reviewed`);

    return { status: "review_ready", issue: resolved.ticketId, repo: resolved.repo, traversal: resolved.traversal, preHead, remoteHead, sourceShas, buckets: sourceShas.map((sha) => ({ sourceShas: [sha] })) };
  }

  async graduateStatus(params: GraduateActionParams): Promise<any> {
    const { ticketId, ticketDir } = await this.resolveTicket(params.issue);
    const eventsPath = path.join(ticketDir, "graduation.events.json");
    const events = await fs.readFile(eventsPath, "utf8").then((s) => JSON.parse(s)).catch(() => []);
    const rows = Array.isArray(events) ? events : [];
    const active = await this.listActiveRepos(ticketDir);
    const done = rows.filter((e) => e.event === "force_succeeded_finalized" && e.outcome !== "noop").map((e) => String(e.repo));
    const uniqueDone = Array.from(new Set(done)).sort((a, b) => a.localeCompare(b));
    const pending = active.filter((r) => !uniqueDone.includes(r));

    if (params.repo) {
      const byRepo = rows.filter((e) => String(e.repo) === params.repo);
      const last = byRepo[byRepo.length - 1] || null;
      const reviewed = byRepo.filter((e) => e.event === "review_created");
      const forced = byRepo.filter((e) => String(e.event).startsWith("force_"));
      return { issue: ticketId, repo: params.repo, status: byRepo.length ? "known" : "unknown", lastReviewedAt: reviewed.length ? reviewed[reviewed.length - 1].ts : null, lastForcedAt: forced.length ? forced[forced.length - 1].ts : null, latestOutcome: last?.event || "none", pending, done: uniqueDone };
    }

    const reviewed = rows.filter((e) => e.event === "review_created");
    const forced = rows.filter((e) => String(e.event).startsWith("force_"));
    const last = rows.length ? rows[rows.length - 1] : null;
    return { issue: ticketId, selfStatus: "active", childrenStatus: { pending, done: uniqueDone }, lastReviewedAt: reviewed.length ? reviewed[reviewed.length - 1].ts : null, lastForcedAt: forced.length ? forced[forced.length - 1].ts : null, latestOutcome: last?.event || "none", pendingTraversal: pending, doneTraversal: uniqueDone };
  }

}
