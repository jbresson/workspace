/**
 * Lean-Ctx Task Execution Helpers
 * 
 * Codifies the Memory Lifecycle (L1: Window, L2: Session, L3: Knowledge)
 * and the TASK_EXECUTION process flow into reusable tool wrappers.
 */

type ToolCall = {
  name: string;
  arguments: Record<string, any>;
};

/**
 * Phase 0 & 1: Ignition Sequence
 * Decomposes goal, maps project, warms up cache, and retrieves relevant history.
 */
export const ignitionSequence = (goal: string): ToolCall[] => [
  {
    name: 'ctx_intent',
    arguments: { query: goal },
  },
  {
    name: 'ctx_overview',
    arguments: { task: goal },
  },
  {
    name: 'ctx_preload',
    arguments: { task: goal },
  },
  {
    name: 'ctx_knowledge',
    arguments: { action: 'recall', query: goal },
  },
];

/**
 * Phase 2: Cycling - Information Offloading (L1 -> L2/L3)
 */

/**
 * Record a temporary discovery to the current task session.
 * Use for hypotheses, specific line findings, or intermediate results.
 */
export const offloadFinding = (value: string): ToolCall => ({
  name: 'ctx_session',
  arguments: { action: 'finding', value },
});

/**
 * Record a tactic or architectural decision to the current task session.
 * Prefixes with [REVERSIBLE] or [IRREVERSIBLE] as per TASK_EXECUTION.md.
 */
export const offloadDecision = (value: string, reversible: boolean = true): ToolCall => ({
  name: 'ctx_session',
  arguments: { 
    action: 'decision', 
    value: `${reversible ? '[REVERSIBLE]' : '[IRREVERSIBLE]'} ${value}` 
  },
});

/**
 * Promote a finding to permanent project knowledge (L3 Archive).
 * Use for constants, architectural facts, and project-wide constraints.
 */
export const rememberFact = (fact: string, category?: string, key?: string, confidence: number = 0.9): ToolCall => ({
  name: 'ctx_knowledge',
  arguments: {
    action: 'remember',
    value: fact,
    category,
    key,
    confidence,
  },
});

/**
 * Phase 2e: Pressure Management
 */

/**
 * Audit current context window occupancy and pressure.
 */
export const contextPressureAudit = (): ToolCall => ({
  name: 'ctx_ledger',
  arguments: { action: 'status' },
});

/**
 * Evict specific stale entries from the cache to reclaim token space.
 */
export const evictContext = (targets: string[]): ToolCall => ({
  name: 'ctx_ledger',
  arguments: { action: 'evict', targets },
});

/**
 * Phase 5: Cool-Down Sequence
 * Consolidates session memory to knowledge, generates artifacts, and purges environment.
 */
export const coolDownSequence = (): ToolCall[] => [
  {
    name: 'ctx_knowledge',
    arguments: { action: 'consolidate' },
  },
  {
    name: 'ctx_pack',
    arguments: { action: 'pr' },
  },
  {
    name: 'ctx_session',
    arguments: { action: 'save' },
  },
  {
    name: 'ctx_ledger',
    arguments: { action: 'reset' },
  },
];

/**
 * Utilities for Hierarchical Reading (L1 Cache management)
 */
export const hierarchicalRead = (path: string) => ({
  symbol: (name: string): ToolCall => ({
    name: 'ctx_symbol',
    arguments: { name, file: path },
  }),
  outline: (): ToolCall => ({
    name: 'ctx_outline',
    arguments: { path },
  }),
  map: (): ToolCall => ({
    name: 'ctx_read', // Assuming standard ctx_read usage for map mode
    arguments: { path, mode: 'map' },
  }),
});
