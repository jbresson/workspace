export interface RuleDefinition {
  id: string;
  trigger: string;
  condition: string;
  validationType: 'MANUAL' | 'CONSTRAINED_CMD' | 'SANDBOXED_TS';
  scope: 'GLOBAL' | 'SESSION';
  description: string;
  risk: string;
}

export const GUARDRAIL_RULES: Record<string, RuleDefinition> = {
  'RULE-1': {
    id: 'RULE-1',
    trigger: '/memory',
    condition: 'Changes to memory files must include SESSION_ID, Rationale, and Shelf-life.',
    validationType: 'MANUAL',
    scope: 'GLOBAL',
    description: 'Memory Integrity Lock',
    risk: 'Silent corruption of architectural decisions.'
  },
  'RULE-2': {
    id: 'RULE-2',
    trigger: '.pi/extensions/guardrails/expectations.jsonl',
    condition: 'Registry mutations must include original SESSION_ID, prior state hash, and reason.',
    validationType: 'CONSTRAINED_CMD',
    scope: 'GLOBAL',
    description: '.pi Registry Protection',
    risk: 'Rogue agent weaponizes Registry to unblock itself.'
  },
  'RULE-3': {
    id: 'RULE-3',
    trigger: '.pi/',
    condition: 'Destructive ops (delete/move/chmod) on .pi/ are forbidden.',
    validationType: 'CONSTRAINED_CMD',
    scope: 'GLOBAL',
    description: '.pi Directory Lockdown',
    risk: 'Vaporization of audit trail.'
  },
  'RULE-4': {
    id: 'RULE-4',
    trigger: 'todo.md',
    condition: 'Append-only mutation. No deletions or rewrites.',
    validationType: 'CONSTRAINED_CMD',
    scope: 'GLOBAL',
    description: 'todo.md Append-Only',
    risk: 'Erasure of assigned tasks.'
  },
  'RULE-5': {
    id: 'RULE-5',
    trigger: 'ctx_session',
    condition: 'Forbidden action="reset". cleanup requires 72h idle + snapshot.',
    validationType: 'MANUAL',
    scope: 'GLOBAL',
    description: 'Session State Immutability',
    risk: 'Wiping of decision trail.'
  },
  'RULE-6': {
    id: 'RULE-6',
    trigger: 'shell',
    condition: 'Blocked: sudo, su, chmod, rm -rf /, eval, exec.',
    validationType: 'CONSTRAINED_CMD',
    scope: 'GLOBAL',
    description: 'Shell Escapes & Privilege Escalation',
    risk: 'Root access or system corruption.'
  },
  'RULE-7': {
    id: 'RULE-7',
    trigger: 'forbidden_paths',
    condition: 'Blocked: ~/.ssh, ~/.aws, /etc/passwd, .git/hooks.',
    validationType: 'CONSTRAINED_CMD',
    scope: 'GLOBAL',
    description: 'Forbidden File Paths',
    risk: 'Credential theft or backdoor injection.'
  },
  'RULE-8': {
    id: 'RULE-8',
    trigger: 'meta_expectation',
    condition: 'Blocked actions must result in a formal issue in .pi/issues/active/.',
    validationType: 'MANUAL',
    scope: 'GLOBAL',
    description: 'Meta-Expectation (Issue Filing)',
    risk: 'Silent escalation without audit trail.'
  },
  'RULE-9': {
    id: 'RULE-9',
    trigger: 'tool_abuse',
    condition: 'Shell I/O on .pi/ or memory/ must use edit()/write(). No exfiltration.',
    validationType: 'CONSTRAINED_CMD',
    scope: 'SESSION',
    description: 'Tool Abuse Detection',
    risk: 'Automated memory corruption via shell.'
  },
  'RULE-10': {
    id: 'RULE-10',
    trigger: 'audit_logs',
    condition: 'Logs in .pi/ are append-only with SHA256 chain.',
    validationType: 'CONSTRAINED_CMD',
    scope: 'GLOBAL',
    description: 'Audit Trail Immutability',
    risk: 'Rewriting evidence of prior violations.'
  }
};

export interface GuardrailProfile {
  name: string;
  activeRules: string[];
  description: string;
}

export const GUARDRAIL_PROFILES: Record<string, GuardrailProfile> = {
  'strict': {
    name: 'Strict',
    activeRules: Object.keys(GUARDRAIL_RULES),
    description: 'Full protection. All 10 rules active.'
  },
  'developer': {
    name: 'Developer',
    activeRules: ['RULE-1', 'RULE-2', 'RULE-3', 'RULE-4', 'RULE-6', 'RULE-7', 'RULE-10'],
    description: 'Protection for core assets, allows more flexible session/tooling use.'
  },
  'minimal': {
    name: 'Minimal',
    activeRules: ['RULE-1', 'RULE-2', 'RULE-10'],
    description: 'Only protects the absolute source of truth (Memory and Registry).'
  }
};
