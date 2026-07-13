"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstrainedExecutor = void 0;
class ConstrainedExecutor {
    static async execute(command) {
        console.log(`[EXECUTOR-MOCK] Executing: ${command}`);
        return { stdout: "Mock output", stderr: "", exitCode: 0 };
    }
}
exports.ConstrainedExecutor = ConstrainedExecutor;
