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

const normalizePath = (params: any) => {
  const p = params?.path || params?.filePath;
  if (!p) return '';
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
};

const isSecretPath = (p: string) => {
  if (!p) return false;
  const absolute = normalizePath({ path: p });
  const home = process.env.HOME || '';
  
  const secretPatterns = [
    path.join(home, '.ssh'),
    path.join(home, '.aws'),
    path.join(home, '.kube'),
    path.join(home, '.gnupg'),
    '/etc/passwd',
    '/etc/shadow',
    '/etc/sudoers',
  ];

  return secretPatterns.some(pattern => absolute.startsWith(pattern));
};

const isSelfIntegrityZone = (p: string) => {
  if (!p) return false;
  const absolute = normalizePath({ path: p });
  const workspace = process.cwd();

  // Protect Core Project Integrity Zones
  const integrityZones = [
    path.join(workspace, 'memory'),
    path.join(workspace, '.pi'),
    path.join(workspace, 'issues'),
  ];

  return integrityZones.some(zone => absolute.startsWith(zone));
};

export const GLOBAL_RULES: GatekeeperRule[] = [
  {
    id: 'RULE-READ-PERIMETER',
    description: 'Read Perimeter Guard',
    toolGuard: (name) => ['ctx_read', 'ctx_grep', 'ctx_ls', 'read'].includes(name),
    paramInspector: (_name, params) => {
      const p = normalizePath(params);
      if (isSecretPath(p)) {
        return {
          allowed: false,
          reason: 'Reading from secret-containing paths is strictly prohibited.',
          alternative: 'Request access through a human administrator.'
        };
      }
      return { allowed: true };
    },
    requiresOversight: false,
    resolutionGuidance: 'Request specific file access via an issue if a legitimate need exists.',
    afkBehavior: 'BLOCK'
  },
  {
    id: 'RULE-1',
    description: 'Self Integrity Lock',
    toolGuard: (name) => ['write', 'edit'].includes(name),
    paramInspector: (_name, params) => {
      const absolute = normalizePath(params);
      const baseDir = process.cwd();

      if (!absolute) {
        return { allowed: false, reason: 'Missing path for write/edit operation.' };
      }

      if (!absolute.startsWith(baseDir + path.sep) && absolute !== baseDir) {
        return {
          allowed: false,
          reason: 'Writes are only permitted within the current working directory.',
          alternative: 'Start the agent in the intended base directory.'
        };
      }

      if (isSecretPath(absolute)) {
        return {
          allowed: false,
          reason: 'Direct mutation of secret-containing paths is forbidden.',
          alternative: 'Contact human administrator.'
        };
      }

      if (isSelfIntegrityZone(absolute)) {
        return {
          allowed: false,
          reason: 'Direct mutation of self-integrity zones is forbidden.',
          alternative: 'Use the corresponding Process Tool (e.g., save_decision, log_todo).'
        };
      }

      return { allowed: true };
    },
    requiresOversight: true,
    resolutionGuidance: 'Use process tools to request changes via issue filing.',
    afkBehavior: 'ISSUE_TODO'
  },
  {
    id: 'RULE-SHELL-BLOCK',
    description: 'Zero-Trust Shell Policy',
    toolGuard: (name) => ['bash', 'ctx_shell', 'shell'].includes(name),
    paramInspector: () => ({
      allowed: false,
      reason: 'Raw shell access is forbidden for safety.',
      alternative: 'Use specialized process tools for file and system operations.'
    }),
    requiresOversight: false,
    resolutionGuidance: 'Identify the required operation and use the appropriate Pi tool.',
    afkBehavior: 'BLOCK'
  },
  {
    id: 'RULE-5',
    description: 'Session State Immutability',
    toolGuard: (name) => name === 'ctx_session',
    paramInspector: (_name, params) => {
      if (params?.action === 'reset' || params?.action === 'cleanup') {
        return {
          allowed: false,
          reason: 'Forbidden ctx_session action for integrity (reset/cleanup).',
          alternative: 'Use snapshot/status/task/finding/decision actions only.'
        };
      }
      return { allowed: true };
    },
    requiresOversight: true,
    resolutionGuidance: 'Use non-destructive session actions only.',
    afkBehavior: 'BLOCK'
  }
];
