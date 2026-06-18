"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gatekeeper = exports.SafetyMode = void 0;
var SafetyMode;
(function (SafetyMode) {
    SafetyMode["PRESENT"] = "PRESENT";
    SafetyMode["AFK"] = "AFK";
})(SafetyMode || (exports.SafetyMode = SafetyMode = {}));
class Gatekeeper {
    constructor(registry, config) {
        this.registry = registry;
        this.config = config;
    }
    async intercept(actionTarget) {
        const active = await this.registry.findActive(actionTarget, this.config.sessionId);
        if (active.length === 0) {
            return { allowed: true, expectations: [] };
        }
        // If any pending expectations exist for this target, it is blocked
        return { allowed: false, expectations: active };
    }
    /**
     * Handles the logic of issuing a meta-expectation for documentation when blocked in AFK mode.
     */
    async handleBlock(originalExp) {
        return await this.registry.issueExpectation({
            id: `EXP-TODO-${originalExp.id}`,
            trigger: 'todo.md',
            condition: `Document block and dependency analysis for ${originalExp.id}`,
            validationType: 'SANDBOXED_TS', // We'll use the Skeptic Auditor to verify the todo entry
            proof: null,
            sessionId: this.config.sessionId,
            scope: 'SESSION',
            metadata: { linkedTo: originalExp.id }
        });
    }
}
exports.Gatekeeper = Gatekeeper;
