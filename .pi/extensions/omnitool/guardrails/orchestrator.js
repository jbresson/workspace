"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardrailOrchestrator = void 0;
class GuardrailOrchestrator {
    constructor(registry, gatekeeper, negotiator, finalizer, validationManager) {
        this.registry = registry;
        this.gatekeeper = gatekeeper;
        this.negotiator = negotiator;
        this.finalizer = finalizer;
        this.validationManager = validationManager;
    }
    /**
     * The primary entry point for tool execution.
     */
    async handleAction(sessionId, toolName, toolParams) {
        try {
            const result = await this.gatekeeper.intercept(sessionId, toolName, toolParams);
            if (result.allowed)
                return { allowed: true };
            return {
                allowed: false,
                exp: {
                    description: result.ruleId || 'Global Rule',
                    condition: result.reason
                }
            };
        }
        catch (error) {
            console.error(`[GUARDRAIL-ERROR] Orchestrator failed: ${error}`);
            return { allowed: true }; // Fail-open for availability
        }
    }
    /**
     * Handles the "Handshake" process.
     */
    async negotiate(expId, response) {
        const exp = await this.registry.getExpectation(expId);
        if (!exp)
            throw new Error(`Expectation ${expId} not found`);
        return await this.negotiator.handleAgentResponse(expId, response);
    }
    /**
     * Final attempt to resolve a block via the agreed validator.
     */
    async resolve(expId, proof) {
        const exp = await this.registry.getExpectation(expId);
        if (!exp)
            throw new Error(`Expectation ${expId} not found`);
        const result = await this.finalizer.finalizeResolution(exp, proof);
        if (result.resolved) {
            await this.registry.updateState(expId, 'RESOLVED', proof);
            return { success: true, reason: 'Expectation resolved successfully.' };
        }
        return { success: false, reason: result.reason };
    }
}
exports.GuardrailOrchestrator = GuardrailOrchestrator;
