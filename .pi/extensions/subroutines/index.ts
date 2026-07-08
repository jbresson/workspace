import { SubroutineEngine } from "./engine";
import { GraduationReviewPanel } from "./graduation-tui";
import type { ReviewResult }     from "./graduation-tui";

type ExtensionAPI = any;

const Type = {
  String: (options: Record<string, unknown> = {}) => ({ type: "string", ...options }),
  Number: (options: Record<string, unknown> = {}) => ({ type: "number", ...options }),
  Boolean: (options: Record<string, unknown> = {}) => ({ type: "boolean", ...options }),
  Literal: (value: string) => ({ const: value, type: typeof value }),
  Array: (items: unknown) => ({ type: "array", items }),
  Object: (properties: Record<string, unknown>) => ({ type: "object", properties }),
  Union: (anyOf: unknown[]) => ({ anyOf }),
  Optional: (schema: Record<string, unknown>) => ({ ...schema, optional: true }),
  Record: (_key: unknown, value: unknown) => ({ type: "object", additionalProperties: value }),
};

const engine = new SubroutineEngine();
const wrap = (result: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }], details: result });

export const tools = {
  start_task_packet: {
    name: "start_task_packet",
    description: "S2: Create task packet with AC/risks/path/checkpoints.",
    parameters: Type.Object({ objective: Type.String(), constraints: Type.Optional(Type.Array(Type.String())), owner: Type.String(), targetPhase: Type.String(), acceptanceCriteria: Type.Optional(Type.Array(Type.String())), falseWinRisks: Type.Optional(Type.Array(Type.String())), criticalPath: Type.Optional(Type.Array(Type.String())), checkpoints: Type.Optional(Type.Array(Type.String())) }),
    execute: async (_id: string, params: any) => wrap(engine.startTaskPacket(params)),
  },
  init_registries: {
    name: "init_registries",
    description: "S1: Initialize risk/uncertainty/blocker registries.",
    parameters: Type.Object({ taskId: Type.String(), riskSeed: Type.Optional(Type.Array(Type.String())), uncertaintySeed: Type.Optional(Type.Array(Type.String())) }),
    execute: async (_id: string, params: any) => wrap(engine.initRegistries(params)),
  },
  record_finding_strict: {
    name: "record_finding_strict",
    description: "S1: Evidence-backed finding capture.",
    parameters: Type.Object({ taskId: Type.String(), finding: Type.String(), evidenceRefs: Type.Array(Type.String()), confidence: Type.Number(), category: Type.String() }),
    execute: async (_id: string, params: any) => wrap(engine.recordFindingStrict(params)),
  },
  record_decision_strict: {
    name: "record_decision_strict",
    description: "S1: Decision capture with irreversible safeguards.",
    parameters: Type.Object({ taskId: Type.String(), decision: Type.String(), reasoning: Type.String(), reversibility: Type.Union([Type.Literal("REVERSIBLE"), Type.Literal("IRREVERSIBLE")]), alternatives: Type.Array(Type.String()), rollbackPlan: Type.Optional(Type.String()), evidenceRefs: Type.Optional(Type.Array(Type.String())) }),
    execute: async (_id: string, params: any) => wrap(engine.recordDecisionStrict(params)),
  },
  record_uncertainty: {
    name: "record_uncertainty",
    description: "S1: Log unresolved question and owner.",
    parameters: Type.Object({ taskId: Type.String(), question: Type.String(), owner: Type.String(), resolutionTrigger: Type.String(), dueHint: Type.Optional(Type.String()) }),
    execute: async (_id: string, params: any) => wrap(engine.recordUncertainty(params)),
  },
  build_task_graph: {
    name: "build_task_graph",
    description: "S2: Build DAG + critical path from tasks/dependencies.",
    parameters: Type.Object({ taskId: Type.String(), tasks: Type.Array(Type.String()), dependencies: Type.Array(Type.Object({ from: Type.String(), to: Type.String() })), constraints: Type.Optional(Type.Array(Type.String())) }),
    execute: async (_id: string, params: any) => wrap(engine.buildTaskGraph(params)),
  },
  next_best_action: {
    name: "next_best_action",
    description: "S2: Select next runnable node.",
    parameters: Type.Object({ taskId: Type.String(), taskGraphId: Type.String(), completed: Type.Array(Type.String()), blocked: Type.Array(Type.String()) }),
    execute: async (_id: string, params: any) => wrap(engine.nextBestAction(params)),
  },
  run_checkpoint: {
    name: "run_checkpoint",
    description: "S1: Execute forcing checkpoint gate.",
    parameters: Type.Object({ taskId: Type.String(), checkpointId: Type.String(), phase: Type.String(), validatorRef: Type.String(), passed: Type.Boolean(), evidenceRefs: Type.Optional(Type.Array(Type.String())), delta: Type.Optional(Type.String()) }),
    execute: async (_id: string, params: any) => wrap(engine.runCheckpoint(params)),
  },
  verify_ac: {
    name: "verify_ac",
    description: "S2: Verify acceptance criteria convergence.",
    parameters: Type.Object({ taskId: Type.String(), acceptanceCriteria: Type.Array(Type.String()), evidenceMap: Type.Optional(Type.Record(Type.String(), Type.Array(Type.String()))) }),
    execute: async (_id: string, params: any) => wrap(engine.verifyAc(params)),
  },
  false_win_scan: {
    name: "false_win_scan",
    description: "S2: Check false-win risks mitigated.",
    parameters: Type.Object({ taskId: Type.String(), falseWinRisks: Type.Array(Type.String()), executedMitigations: Type.Array(Type.String()) }),
    execute: async (_id: string, params: any) => wrap(engine.falseWinScan(params)),
  },
  pressure_check: {
    name: "pressure_check",
    description: "S2: Periodic convergence/unknowns drift check.",
    parameters: Type.Object({ taskId: Type.String(), iteration: Type.Number(), openUnknowns: Type.Number(), openContradictions: Type.Number() }),
    execute: async (_id: string, params: any) => wrap(engine.pressureCheck(params)),
  },
  open_blocker_issue: {
    name: "open_blocker_issue",
    description: "S1: Externalize hard blocker to issues/active path.",
    parameters: Type.Object({ taskId: Type.String(), title: Type.String(), impact: Type.String(), blockedBy: Type.String(), neededFromHuman: Type.String() }),
    execute: async (_id: string, params: any) => wrap(engine.openBlockerIssue(params)),
  },
  propose_followup_issue: {
    name: "propose_followup_issue",
    description: "S1: Propose non-blocking followup issue.",
    parameters: Type.Object({ taskId: Type.String(), gap: Type.String(), impact: Type.String(), owner: Type.Optional(Type.String()), references: Type.Array(Type.String()) }),
    execute: async (_id: string, params: any) => wrap(engine.proposeFollowupIssue(params)),
  },
  context_trim_plan: {
    name: "context_trim_plan",
    description: "S2: Compute evict/retain set for context pressure.",
    parameters: Type.Object({ taskId: Type.String(), activeFiles: Type.Array(Type.String()), staleCandidates: Type.Array(Type.String()) }),
    execute: async (_id: string, params: any) => wrap(engine.contextTrimPlan(params)),
  },
  close_task_with_tax: {
    name: "close_task_with_tax",
    description: "S3: Final close gate requiring AC proof + knowledge tax.",
    parameters: Type.Object({ taskId: Type.String(), acProof: Type.Object({ overallPass: Type.Boolean(), gaps: Type.Optional(Type.Array(Type.String())) }), findings: Type.Array(Type.String()), decisions: Type.Array(Type.String()), openUncertainties: Type.Array(Type.String()) }),
    execute: async (_id: string, params: any) => wrap(engine.closeTaskWithTax(params)),
  },
  promote_l2_to_l3: {
    name: "promote_l2_to_l3",
    description: "S2: Promote validated L2 entries to L3 memory.",
    parameters: Type.Object({ taskId: Type.String(), entries: Type.Array(Type.String()), targetMemoryPath: Type.String(), lineage: Type.Object({ why: Type.Optional(Type.String()), when: Type.Optional(Type.String()), assumptions: Type.Optional(Type.Array(Type.String())) }) }),
    execute: async (_id: string, params: any) => wrap(engine.promoteL2ToL3(params)),
  },
  spec: {
    name: "spec",
    description: "Work-item spec operations: init, ready, append_invariant, append_scenario, link_issue.",
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("init"),
        Type.Literal("ready"),
        Type.Literal("append_invariant"),
        Type.Literal("append_scenario"),
        Type.Literal("link_issue"),
      ]),
      itemId: Type.String(),
      objective: Type.Optional(Type.String()),
      issueId: Type.Optional(Type.String()),
      invariant: Type.Optional(
        Type.Object({
          id: Type.String(),
          class: Type.Union([
            Type.Literal("security"),
            Type.Literal("data"),
            Type.Literal("behavior"),
            Type.Literal("performance"),
            Type.Literal("compliance"),
          ]),
          statement: Type.String(),
          authority: Type.Optional(Type.String()),
          anti_patterns: Type.Array(Type.String()),
          verification_mode: Type.Union([
            Type.Literal("unit"),
            Type.Literal("integration"),
            Type.Literal("property"),
            Type.Literal("static"),
            Type.Literal("manual"),
          ]),
        }),
      ),
      scenario: Type.Optional(Type.String()),
    }),
    execute: async (_id: string, params: any) => wrap(await engine.spec(params)),
  },
  safe_edit: {
    name: "safe_edit",
    description: "Only allowed source edit path; recorded transaction with logs.json lock semantics.",
    parameters: Type.Object({
      itemId: Type.String(),
      actorType: Type.Literal("buddy"),
      files: Type.Array(Type.Object({ path: Type.String(), oldText: Type.String(), newText: Type.String() })),
      reason: Type.String(),
      verification: Type.String(),
      decisionRef: Type.Optional(Type.String()),
    }),
    execute: async (_id: string, params: any) => wrap(await engine.recordedEdit(params)),
  },
  safe_write: {
    name: "safe_write",
    description: "Only allowed full-file write path; records finalized write transaction with logs.json lock semantics.",
    parameters: Type.Object({
      itemId: Type.String(),
      actorType: Type.Literal("buddy"),
      path: Type.String(),
      content: Type.String(),
      reason: Type.String(),
      verification: Type.String(),
      decisionRef: Type.Optional(Type.String()),
    }),
    execute: async (_id: string, params: any) => wrap(await engine.recordedWrite(params)),
  },
  audit_change_ledger: {
    name: "audit_change_ledger",
    description: "Synchronous Verify/Audit check for unlogged edits + stale verification mappings.",
    parameters: Type.Object({ itemId: Type.String(), actualModifiedFiles: Type.Array(Type.String()) }),
    execute: async (_id: string, params: any) => wrap(await engine.gateSyncAudit(params)),
  },
};

export const manifest = { id: "subroutines", description: "Runtime-enforced process subroutines (full ISSUE-001 set)", tools };

function parseArgs(raw: any): Record<string, any> {
  if (typeof raw === "object" && raw) return raw;
  const s = String(raw || "").trim();
  if (!s) return {};
  try {
    if (s.startsWith("{")) return JSON.parse(s);
  } catch {
    // fallthrough to key=value parser
  }
  const out: Record<string, any> = {};
  for (const part of s.split(/\s+/)) {
    const [k, v] = part.split("=");
    if (!k || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

export default async function (pi: ExtensionAPI) {
  for (const def of Object.values(tools)) {
    pi.registerTool({
      name: def.name,
      label: def.name,
      description: def.description,
      parameters: def.parameters,
      async execute(toolCallId, params) {
        return def.execute(toolCallId, params);
      },
    });
  }

  pi.registerCommand("phase", {
    description: "/phase action=<spec_ready|audit_change_ledger> itemId=<id> [actualModifiedFiles=a.ts,b.ts]",
    handler: async (args, ctx) => {
      const a = parseArgs(args);
      const action = a.action;
      const result = action === "spec_ready"
        ? await engine.spec({ action: "ready", itemId: a.itemId })
        : action === "audit_change_ledger"
          ? await engine.gateSyncAudit({ itemId: a.itemId, actualModifiedFiles: String(a.actualModifiedFiles || "").split(",").map((s) => s.trim()).filter(Boolean) })
          : { ok: false, error: "unknown_action", supported: ["spec_ready", "audit_change_ledger"] };
      ctx.ui.setEditorText(JSON.stringify(result, null, 2));
    },
  });

  pi.registerCommand("graduate", {
    description: "/graduate <issue> [<repo>]  — review changes file-by-file, commit if all confirmed",
    handler: async (args, ctx) => {
      const raw   = String(args || "").trim();
      const parts = raw.split(/\s+/).filter(Boolean);
      if (!parts[0]) {
        ctx.ui.setEditorText("usage: /graduate <issue> [<repo>]");
        return;
      }
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/graduate requires TUI mode", "error");
        return;
      }

      let diffResult: Awaited<ReturnType<typeof engine.graduateDiff>>;
      try {
        diffResult = await engine.graduateDiff({ issue: parts[0], repo: parts[1] });
      } catch (e: any) {
        ctx.ui.setEditorText(`Graduation error: ${e.message}`);
        return;
      }

      const { resolved, sourceRepo, remoteAlias, preHead, sourceShas, fileDiffs } = diffResult;

      if (sourceShas.length === 0) {
        ctx.ui.setEditorText("Nothing to graduate — no commits ahead of source.");
        return;
      }

      const reviewResult = await ctx.ui.custom<ReviewResult>((tui, theme, _kb, done) => {
        const panel = new GraduationReviewPanel(
          fileDiffs, tui, theme,
          () => tui.requestRender(),
          done,
        );
        return {
          render:      (w: number) => panel.render(w),
          handleInput: (d: string) => { panel.handleInput(d); tui.requestRender(); },
          invalidate:  ()          => panel.invalidate(),
        };
      });

      if (reviewResult.cancelled) {
        ctx.ui.setEditorText("Graduation review cancelled — no changes applied.");
        return;
      }

      const denied    = reviewResult.reviews.filter(r => !r.confirmed);
      const confirmed = reviewResult.reviews.filter(r =>  r.confirmed);

      if (denied.length > 0) {
        try {
          await engine.recordGraduationDenials({
            issue:   parts[0],
            repo:    parts[1],
            denials: denied.map(d => ({ path: d.path, reason: d.reason })),
          });
        } catch { /* non-fatal */ }

        const lines = [
          "## Graduation Review — Changes Need Fixes",
          "",
          ...denied.map(d => `\`${d.path}\`: ${d.reason ?? "(no reason given)"}`),
          "",
          confirmed.length > 0
            ? `${confirmed.length} file(s) confirmed, ${denied.length} denied. Resolve denials before re-attempting.`
            : `All ${denied.length} file(s) denied.`,
        ];
        ctx.ui.setEditorText(lines.join("\n"));
        return;
      }

      await engine.recordReviewOutcome({ issue: parts[0], repo: parts[1], status: "started", preHead });

      let result: any;
      try {
        result = await engine.applyAndCommit(sourceRepo, resolved, remoteAlias, preHead, sourceShas);
      } catch (e: any) {
        await engine.recordReviewOutcome({ issue: parts[0], repo: parts[1], status: "rolled_back", preHead, error: e.message });
        ctx.ui.setEditorText(`Graduation failed during commit: ${e.message}`);
        return;
      }

      if (result.status === "conflict_paused") {
        await engine.recordReviewOutcome({ issue: parts[0], repo: parts[1], status: "conflict_paused", preHead });
        ctx.ui.setEditorText(JSON.stringify(result, null, 2));
        return;
      }

      await engine.recordReviewOutcome({ issue: parts[0], repo: parts[1], status: "finalized", preHead, mapping: result.sourceToDestination });
      ctx.ui.setEditorText(JSON.stringify(result, null, 2));
    },
  });

  pi.registerCommand("graduate-force", {
    description: "/graduate-force <issue> [<repo>]",
    handler: async (args, ctx) => {
      const raw = String(args || "").trim();
      const parts = raw.split(/\s+/).filter(Boolean);
      const result = !parts[0]
        ? { ok: false, error: "missing_issue", message: "usage: /graduate-force <issue> [<repo>]" }
        : await engine.graduateForce({ issue: parts[0], repo: parts[1] });
      ctx.ui.setEditorText(JSON.stringify(result, null, 2));
    },
  });

  pi.registerCommand("graduate-status", {
    description: "/graduate-status <issue> [<repo>]",
    handler: async (args, ctx) => {
      const raw = String(args || "").trim();
      const parts = raw.split(/\s+/).filter(Boolean);
      const result = !parts[0]
        ? { ok: false, error: "missing_issue", message: "usage: /graduate-status <issue> [<repo>]" }
        : await engine.graduateStatus({ issue: parts[0], repo: parts[1] });
      ctx.ui.setEditorText(JSON.stringify(result, null, 2));
    },
  });
}
