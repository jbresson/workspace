"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_RULES = void 0;
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const isSystemPath = (p) => {
    if (!p)
        return false;
    const absolute = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    const forbidden = [
        path.join(process.env.HOME || '', '.ssh'),
        path.join(process.env.HOME || '', '.aws'),
        '/etc/passwd',
        path.join(process.cwd(), '.git/hooks')
    ];
    return forbidden.some(f => absolute.includes(f));
};
const normalizePath = (params) => {
    const p = params?.path || params?.filePath;
    if (!p)
        return '';
    return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
};
const hasGraduateIntent = (toolName, params) => {
    if ((toolName || '').toLowerCase().includes('graduate'))
        return true;
    const direct = [
        params?.action,
        params?.subAction,
        params?.tool,
        params?.command,
        params?.name,
    ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
    if (direct.some((v) => v.includes('graduate')))
        return true;
    const nestedArgs = params?.arguments;
    if (nestedArgs && typeof nestedArgs === 'object') {
        const nested = [nestedArgs.action, nestedArgs.subAction, nestedArgs.tool, nestedArgs.command]
            .filter(Boolean)
            .map((v) => String(v).toLowerCase());
        if (nested.some((v) => v.includes('graduate')))
            return true;
    }
    return false;
};
exports.GLOBAL_RULES = [
    {
        id: 'RULE-4',
        description: 'Issue Quality Gate',
        toolGuard: (name) => name === 'wip' && (name.includes('issues.init') || name.includes('issues.transition')), // Simplified, refined in paramInspector
        paramInspector: (name, params) => {
            // We check subAction within the 'wip' tool context
            const subAction = params?.subAction;
            if (subAction !== 'issues.init' && subAction !== 'issues.transition')
                return { allowed: true };
            // Hard deterministic checks for issues.init
            if (subAction === 'issues.init') {
                if (!params.dedupCheck)
                    return { allowed: false, reason: 'Missing dedupCheck payload.' };
                if (params.currentState === params.targetState)
                    return { allowed: false, reason: 'currentState and targetState are equivalent.' };
                if (!params.evidence || params.evidence.length === 0)
                    return { allowed: false, reason: 'Evidence array cannot be empty.' };
                if (!params.owner && !params.ownerNeeded)
                    return { allowed: false, reason: 'Must provide owner or set ownerNeeded=true.' };
                if (!params.acceptanceCriteria || params.acceptanceCriteria.length === 0)
                    return { allowed: false, reason: 'Acceptance criteria required.' };
            }
            return { allowed: true }; // Auditor check would happen next in a real deep-check
        },
        requiresOversight: true,
        resolutionGuidance: 'Ensure all quality gate requirements (dedup, delta, evidence, ownership, AC) are met.',
        afkBehavior: 'BLOCK',
    },
    {
        id: 'RULE-11',
        description: 'Global Create-Only Full Writes',
        toolGuard: (name) => ['write', 'draft', 'safe_write'].includes(name),
        paramInspector: (name, params) => {
            const p = params.path || params.filePath;
            if (!p)
                return { allowed: true };
            // Deterministic check: If file exists, block full write
            if (fs.existsSync(p)) {
                return {
                    allowed: false,
                    reason: `File ${p} already exists. Full-writes are create-only. Use edit() or amend() to modify existing files.`,
                    alternative: 'Use surgical patching tools.'
                };
            }
            return { allowed: true };
        },
        requiresOversight: false,
        resolutionGuidance: 'Do not overwrite existing files using full-write tools.',
        afkBehavior: 'BLOCK',
    },
    {
        id: 'RULE-12',
        description: 'Tool Surface Lockdown',
        toolGuard: (name) => true,
        paramInspector: (name, params) => {
            // This rule is enforced by the dispatch boundary in index.ts, 
            // but we define it here for consistency.
            return { allowed: true };
        },
        requiresOversight: false,
        resolutionGuidance: 'Use omnitool as the sole interface.',
        afkBehavior: 'BLOCK',
    },
    {
        id: 'RULE-1',
        description: 'Memory Integrity Lock',
        toolGuard: (name) => ['write', 'edit'].includes(name),
        paramInspector: (name, params) => {
            const p = params.path || params.filePath;
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
            const p = params.path || params.filePath;
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
            const p = params.path || params.filePath;
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
            const p = params.path || params.filePath || (params.command ? params.command : '');
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
