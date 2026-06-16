import * as path from 'path';

export type InspectionResult = { allowed: true } | { 
  allowed: false; 
  reason: string; 
  alternative?: string; 
};

export interface GatekeeperRule {
  id: string;
  description: string;
  // Tier 1: Fast tool-level guard
  toolGuard: (toolName: string) => boolean;
  // Tier 2: Deep parameter inspection
  paramInspector?: (toolName: string, params: any) => InspectionResult;
  // Tier 3: Oversight & AFK logic
  requiresOversight: boolean;
  resolutionGuidance: string;
  afkBehavior: 'BLOCK' | 'ISSUE_TODO' | 'PROMPT';
}

const isSystemPath = (p: string) => {
  if (!p) return false;
  const absolute = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  const forbidden = [
    path.join(process.env.HOME || '', '.ssh'), 
    path.join(process.env.HOME || '', '.aws'), 
    '/etc/passwd', 
    path.join(process.cwd(), '.git/hooks')
  ];
  return forbidden.some(f => absolute.includes(f));
};

const normalizePath = (params: any) => {
  const p = params?.path || params?.filePath;
  if (!p) return '';
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
};

export const GLOBAL_RULES: GatekeeperRule[] = [
  {
    id: 'RULE-1',
    description: 'Memory Integrity Lock',
    toolGuard: (name) => ['write', 'edit'].includes(name),
    paramInspector: (name, params) => {
      const p = normalizePath(params);
      if (p && p.includes('/memory')) {
        return { allowed: false, reason: 'Changes to memory files must include SESSION_ID and Rationale.', alternative: 'Use a structured edit with justification.' };
      }
      return { allowed: true };
    },
    requiresOversight: true,
    resolutionGuidance: 'Include SESSION_ID, Rationale, and Shelf-life in the change.',
    afkBehavior: 'ISSUE_TODO'
  },
  {
    id: 'RULE-2',
    description: '.pi Registry Protection',
    toolGuard: (name) => ['write', 'edit'].includes(name),
    paramInspector: (name, params) => {
      const p = normalizePath(params);
      if (p && p.includes('expectations.jsonl')) {
        return { allowed: false, reason: 'Registry mutations require strict state hashing.', alternative: 'Use the resolve_guardrail tool.' };
      }
      return { allowed: true };
    },
    requiresOversight: true,
    resolutionGuidance: 'Submit proof of prior state hash and justification.',
    afkBehavior: 'BLOCK'
  },
  {
    id: 'RULE-3',
    description: '.pi Directory Lockdown',
    toolGuard: (name) => ['write', 'edit', 'bash', 'ctx_shell'].includes(name),
    paramInspector: (name, params) => {
      const p = normalizePath(params);
      if (p && p.includes('.pi/')) {
        return { allowed: false, reason: 'Destructive ops on .pi/ are forbidden.', alternative: 'Use the provided CGS tools for registry management.' };
      }
      return { allowed: true };
    },
    requiresOversight: false,
    resolutionGuidance: 'Do not attempt to modify .pi/ directly.',
    afkBehavior: 'BLOCK'
  },
  {
    id: 'RULE-4',
    description: 'todo.md Append-Only',
    toolGuard: (name) => ['write', 'edit'].includes(name),
    paramInspector: (name, params) => {
      const p = normalizePath(params);
      if (p && p.endsWith('todo.md')) {
        return { allowed: true }; 
      }
      return { allowed: true };
    },
    requiresOversight: false,
    resolutionGuidance: 'Append only to todo.md.',
    afkBehavior: 'BLOCK'
  },
  {
    id: 'RULE-5',
    description: 'Session State Immutability',
    toolGuard: (name) => name === 'ctx_session',
    paramInspector: (name, params) => {
      if (params.action === 'reset') {
        return { allowed: false, reason: 'Forbidden action="reset".', alternative: 'Use snapshot and cleanup if 72h idle.' };
      }
      return { allowed: true };
    },
    requiresOversight: true,
    resolutionGuidance: 'Provide a snapshot reference before cleanup.',
    afkBehavior: 'BLOCK'
  },
  {
    id: 'RULE-6',
    description: 'Shell Escapes & Privilege Escalation',
    toolGuard: (name) => ['bash', 'ctx_shell'].includes(name),
    paramInspector: (name, params) => {
      const cmd = params.command || '';
      const forbidden = [/sudo\s/i, /su\s/i, /chmod\s/i, /rm\s+-rf\s+\//i, /eval\s/i, /exec\s/i];
      if (forbidden.some(regex => regex.test(cmd))) {
        return { allowed: false, reason: 'Shell escape detected.', alternative: 'Use the provided specialized tools for file system ops.' };
      }
      return { allowed: true };
    },
    requiresOversight: false,
    resolutionGuidance: 'Avoid privilege escalation commands.',
    afkBehavior: 'BLOCK'
  },
  {
    id: 'RULE-7',
    description: 'Forbidden File Paths',
    toolGuard: (name) => ['write', 'edit', 'bash', 'ctx_shell'].includes(name),
    paramInspector: (name, params) => {
      const p = normalizePath(params);
      if (isSystemPath(p)) {
        return { allowed: false, reason: 'Access to system paths is prohibited.', alternative: 'Use ctx_read for inspection.' };
      }
      return { allowed: true };
    },
    requiresOversight: false,
    resolutionGuidance: 'Do not access credentials or system config files.',
    afkBehavior: 'BLOCK'
  },
  {
    id: 'RULE-8',
    description: 'Meta-Expectation (Issue Filing)',
    toolGuard: (name) => ['write', 'edit'].includes(name),
    paramInspector: (name, params) => {
      const p = params.path || params.filePath;
      if (p && p.includes('.pi/issues/active/')) {
        return { allowed: true }; // Logic for "formal issue" handled by auditor
      }
      return { allowed: true };
    },
    requiresOversight: false,
    resolutionGuidance: 'All blocks must result in a formal issue.',
    afkBehavior: 'ISSUE_TODO'
  },
  {
    id: 'RULE-9',
    description: 'Tool Abuse Detection',
    toolGuard: (name) => ['bash', 'ctx_shell'].includes(name),
    paramInspector: (name, params) => {
      const cmd = params.command || '';
      if ((cmd.includes('.pi/') || cmd.includes('/memory')) && !cmd.includes('cat ')) {
        return { allowed: false, reason: 'Shell I/O on system dirs must use edit()/write().', alternative: 'Use the provided Pi tools.' };
      }
      return { allowed: true };
    },
    requiresOversight: false,
    resolutionGuidance: 'Use specialized tools for .pi and memory directories.',
    afkBehavior: 'BLOCK'
  },
  {
    id: 'RULE-10',
    description: 'Audit Trail Immutability',
    toolGuard: (name) => ['write', 'edit'].includes(name),
    paramInspector: (name, params) => {
      const p = params.path || params.filePath;
      if (p && p.includes('.pi/extensions/guardrails/')) {
        return { allowed: false, reason: 'Audit logs are append-only.', alternative: 'Log updates via the Orchestrator.' };
      }
      return { allowed: true };
    },
    requiresOversight: false,
    resolutionGuidance: 'Do not modify audit trails manually.',
    afkBehavior: 'BLOCK'
  }
];
