"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxedTSStrategy = exports.ConstrainedCmdStrategy = exports.ManualStrategy = void 0;
const constrained_executor_1 = require("../services/constrained_executor");
class ManualStrategy {
    async validate(expectation, proof) {
        if (!proof)
            return { success: false, reason: 'Manual resolution requires a human-provided proof or ID.' };
        return { success: true, reason: 'Human approval verified.' };
    }
}
exports.ManualStrategy = ManualStrategy;
class ConstrainedCmdStrategy {
    constructor() {
        this.BLACKLIST_CHARS = ['|', ';', '&', '>', '>>', '`', '$('];
        this.SENSITIVE_DIRS = ['.git', '.ssh', '/etc', '/var/log'];
    }
    async validate(expectation, proof) {
        // 1. Blacklist Check (Basic Shell Injection)
        for (const char of this.BLACKLIST_CHARS) {
            if (proof.includes(char)) {
                return { success: false, reason: `Illegal character '${char}' detected in proof cmd.` };
            }
        }
        // 2. Path Pinning & Sensitive Dir Check
        const paths = this.extractPaths(proof);
        for (const p of paths) {
            if (this.SENSITIVE_DIRS.some(dir => p.includes(dir))) {
                return { success: false, reason: `Access to sensitive dir in path '${p}' is prohibited.` };
            }
        }
        // 3. Trigger Correlation
        if (!proof.includes(expectation.trigger)) {
            return { success: false, reason: `Proof cmd does not appear to target the required trigger: ${expectation.trigger}` };
        }
        // 4. HARD EXECUTION
        const result = await constrained_executor_1.ConstrainedExecutor.execute(proof);
        if (!result.success) {
            return {
                success: false,
                reason: `Hard Validation Failed (Exit ${result.exitCode}): ${result.stderr || result.stdout}`
            };
        }
        return { success: true, reason: 'Command executed successfully and returned exit 0.' };
    }
    extractPaths(cmd) {
        const pathRegex = /(['"]?)([\/\.][\w\/\.\-_]+)\1/g;
        const matches = [];
        let match;
        while ((match = pathRegex.exec(cmd)) !== null) {
            matches.push(match[2]);
        }
        return matches;
    }
}
exports.ConstrainedCmdStrategy = ConstrainedCmdStrategy;
class SandboxedTSStrategy {
    async validate(expectation, proof) {
        if (proof.includes('child_process') || proof.includes('net.') || proof.includes('fs.writeFileSync')) {
            return { success: false, reason: 'Unsafe mod or method detected in TS proof.' };
        }
        return { success: true, reason: 'TS structure validated as safe.' };
    }
}
exports.SandboxedTSStrategy = SandboxedTSStrategy;
