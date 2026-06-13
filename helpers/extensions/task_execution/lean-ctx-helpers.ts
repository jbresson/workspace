import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from '@sinclair/typebox';

/**
 * Task Execution Helpers (Phase 0-5 Tools)
 * 
 * Supports:
 * - Full load: load_helper_extension { module: "task_execution" }
 * - Single tool: load_helper_extension { module: "task_execution", tool: "task_ignition" }
 */

async function resolveLeanCtxBinary(pi: ExtensionAPI): Promise<string> {
  const result = await pi.exec('which', ['lean-ctx']);
  if (result.code !== 0) throw new Error('lean-ctx binary not found in PATH');
  return result.stdout.trim();
}

async function execLeanCtx(pi: ExtensionAPI, args: string[]): Promise<string> {
  const bin = await resolveLeanCtxBinary(pi);
  const result = await pi.exec(bin, args);
  if (result.code !== 0) {
    const msg = (result.stderr || result.stdout || `lean-ctx failed: ${args.join(' ')}`).trim();
    throw new Error(msg);
  }
  return result.stdout.trim();
}

// Tool Definitions Registry
export const tools = {
  task_ignition: {
    name: 'task_ignition',
    description: 'Phase 0 & 1: Decomposes goal, maps project, warms up cache, retrieves relevant history.',
    parameters: Type.Object({
      goal: Type.String({ description: 'Task goal or objective' }),
    }),
    execute: async (toolCallId: string, params: any, pi: ExtensionAPI) => {
      const results: Record<string, string> = {};
      try { results.intent = await execLeanCtx(pi, ['intent', params.goal]); } catch (e) { results.intent = `[Error] ${e}`; }
      try { results.overview = await execLeanCtx(pi, ['overview', params.goal]); } catch (e) { results.overview = `[Error] ${e}`; }
      try { results.preload = await execLeanCtx(pi, ['preload', params.goal]); } catch (e) { results.preload = `[Error] ${e}`; }
      try { results.recall = await execLeanCtx(pi, ['knowledge', 'recall', params.goal]); } catch (e) { results.recall = `[Error] ${e}`; }
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    },
  },

  task_log_uncertainty: {
    name: 'task_log_uncertainty',
    description: 'Record an open question or unknown to the current task session.',
    parameters: Type.Object({
      question: Type.String({ description: 'The uncertain question or hypothesis' }),
    }),
    execute: async (toolCallId: string, params: any, pi: ExtensionAPI) => {
      const output = await execLeanCtx(pi, ['session', 'finding', `[UNCERTAIN] ${params.question}`]);
      return { content: [{ type: 'text', text: output }] };
    },
  },

  task_log_risk: {
    name: 'task_log_risk',
    description: 'Record a high-level risk and its mitigation to the current task session.',
    parameters: Type.Object({
      risk: Type.String({ description: 'Risk description' }),
      mitigation: Type.String({ description: 'Mitigation strategy' }),
    }),
    execute: async (toolCallId: string, params: any, pi: ExtensionAPI) => {
      const output = await execLeanCtx(pi, ['session', 'finding', `[RISK] ${params.risk} | Mitigation: ${params.mitigation}`]);
      return { content: [{ type: 'text', text: output }] };
    },
  },

  task_log_blocker: {
    name: 'task_log_blocker',
    description: 'Record a blocker or escalation item to the current task session.',
    parameters: Type.Object({
      issue: Type.String({ description: 'Blocker description' }),
    }),
    execute: async (toolCallId: string, params: any, pi: ExtensionAPI) => {
      const output = await execLeanCtx(pi, ['session', 'finding', `[BLOCKER] ${params.issue}`]);
      return { content: [{ type: 'text', text: output }] };
    },
  },

  task_offload_finding: {
    name: 'task_offload_finding',
    description: 'Record a temporary discovery to the current task session.',
    parameters: Type.Object({
      value: Type.String({ description: 'Finding to record' }),
    }),
    execute: async (toolCallId: string, params: any, pi: ExtensionAPI) => {
      const output = await execLeanCtx(pi, ['session', 'finding', params.value]);
      return { content: [{ type: 'text', text: output }] };
    },
  },

  task_offload_decision: {
    name: 'task_offload_decision',
    description: 'Record a tactic or architectural decision to the current task session.',
    parameters: Type.Object({
      value: Type.String({ description: 'Decision description' }),
      reversible: Type.Optional(Type.Boolean({ description: 'Is this decision reversible? (default: true)' })),
    }),
    execute: async (toolCallId: string, params: any, pi: ExtensionAPI) => {
      const prefix = (params.reversible ?? true) ? '[REVERSIBLE]' : '[IRREVERSIBLE]';
      const output = await execLeanCtx(pi, ['session', 'decision', `${prefix} ${params.value}`]);
      return { content: [{ type: 'text', text: output }] };
    },
  },

  task_remember_fact: {
    name: 'task_remember_fact',
    description: 'Promote a finding to permanent project knowledge (L3 Archive).',
    parameters: Type.Object({
      fact: Type.String({ description: 'Fact to remember' }),
      category: Type.Optional(Type.String({ description: 'Category for organization' })),
      key: Type.Optional(Type.String({ description: 'Key for lookup' })),
      confidence: Type.Optional(Type.Number({ description: 'Confidence level (0-1, default: 0.9)' })),
    }),
    execute: async (toolCallId: string, params: any, pi: ExtensionAPI) => {
      const args = ['knowledge', 'remember', params.fact];
      if (params.category) args.push('--category', params.category);
      if (params.key) args.push('--key', params.key);
      if (params.confidence !== undefined) args.push('--confidence', String(params.confidence));
      const output = await execLeanCtx(pi, args);
      return { content: [{ type: 'text', text: output }] };
    },
  },

  task_context_pressure_audit: {
    name: 'task_context_pressure_audit',
    description: 'Audit current context window occupancy and pressure.',
    parameters: Type.Object({}),
    execute: async (toolCallId: string, params: any, pi: ExtensionAPI) => {
      const output = await execLeanCtx(pi, ['ledger', 'status']);
      return { content: [{ type: 'text', text: output }] };
    },
  },

  task_evict_context: {
    name: 'task_evict_context',
    description: 'Evict specific stale entries from the cache to reclaim token space.',
    parameters: Type.Object({
      targets: Type.Array(Type.String()),
    }),
    execute: async (toolCallId: string, params: any, pi: ExtensionAPI) => {
      const args = ['ledger', 'evict', ...params.targets];
      const output = await execLeanCtx(pi, args);
      return { content: [{ type: 'text', text: output }] };
    },
  },

  task_cooldown: {
    name: 'task_cooldown',
    description: 'Phase 5: Consolidates session memory to knowledge, generates artifacts, and purges environment.',
    parameters: Type.Object({}),
    execute: async (toolCallId: string, params: any, pi: ExtensionAPI) => {
      const results: Record<string, string> = {};
      try { results.consolidate = await execLeanCtx(pi, ['knowledge', 'consolidate']); } catch (e) { results.consolidate = `[Error] ${e}`; }
      try { results.pack = await execLeanCtx(pi, ['pack', 'pr']); } catch (e) { results.pack = `[Error] ${e}`; }
      try { results.save = await execLeanCtx(pi, ['session', 'save']); } catch (e) { results.save = `[Error] ${e}`; }
      try { results.reset = await execLeanCtx(pi, ['ledger', 'reset']); } catch (e) { results.reset = `[Error] ${e}`; }
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    },
  },
};

// Manifest Export (new pattern)
export const manifest = {
  id: 'task_execution',
  description: 'Task execution lifecycle tools (phases 0-5)',
  tools: tools,
};

// Legacy: Default export for backward compatibility
export default async function (pi: ExtensionAPI) {
  // Register all tools
  for (const toolDef of Object.values(tools)) {
    pi.registerTool({
      name: toolDef.name,
      description: toolDef.description,
      parameters: toolDef.parameters,
      async execute(toolCallId, params, signal, onUpdate, ctx) {
        return toolDef.execute(toolCallId, params, pi);
      },
    });
  }

  // Register phase commands
  const phaseCommands = [
    {
      phase: 0,
      name: 'pi-task-ignition',
      tools: ['task_ignition'],
      description: 'Phase 0-1: Decompose goal, map project, warm cache, retrieve history',
    },
    {
      phase: 1,
      name: 'pi-task-plan',
      tools: ['task_offload_finding', 'task_offload_decision'],
      description: 'Phase 1-2: Planning and decision logging',
    },
    {
      phase: 2,
      name: 'pi-task-execute',
      tools: ['task_offload_finding', 'task_log_risk'],
      description: 'Phase 2-3: Execution with risk tracking',
    },
    {
      phase: 3,
      name: 'pi-task-validate',
      tools: ['task_offload_finding', 'task_log_blocker'],
      description: 'Phase 3-4: Validation and blocker resolution',
    },
    {
      phase: 4,
      name: 'pi-task-refine',
      tools: ['task_offload_finding', 'task_remember_fact'],
      description: 'Phase 4-5: Refinement and knowledge archival',
    },
    {
      phase: 5,
      name: 'pi-task-cooldown',
      tools: ['task_cooldown'],
      description: 'Phase 5-6: Consolidation and session closure',
    },
  ];

  for (const phase of phaseCommands) {
    pi.registerCommand(phase.name, {
      description: phase.description,
      handler: async (args) => {
        return {
          content: [
            {
              type: 'text',
              text: `✓ ${phase.name} activated (Phase ${phase.phase})\nAvailable tools: ${phase.tools.join(', ')}`,
            },
          ],
          details: { phase: phase.phase, tools: phase.tools },
        };
      },
    });
  }
}
