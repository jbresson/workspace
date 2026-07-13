"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NegotiationManager = void 0;
const llm_service_1 = require("../services/llm_service");
class NegotiationManager {
    constructor(registry, auditor, validator) {
        this.registry = registry;
        this.auditor = auditor;
        this.validator = validator;
        this.MAX_ITERATIONS = 10;
    }
    async initiateHandshake(expectation) {
        const initialValidator = await this.auditor.proposeValidator(expectation);
        await this.updateNegotiationState(expectation.id, 1, initialValidator);
        return {
            status: 'NEGOTIATING',
            proposedValidator: initialValidator
        };
    }
    async handleAgentResponse(expectationId, res) {
        const expectation = await this.registry.getExpectation(expectationId);
        const state = await this.getNegotiationState(expectationId);
        if (res.agree) {
            await this.updateNegotiationState(expectationId, state.iterations, state.proposedValidator, 'AGREED');
            return { status: 'RESOLVED_NEGOTIATION', nextStep: 'EXECUTE_VALIDATOR' };
        }
        if (state.iterations >= this.MAX_ITERATIONS) {
            await this.updateNegotiationState(expectationId, state.iterations, state.proposedValidator, 'STALLED');
            return { status: 'HALT', nextStep: 'TERMINATE_INFERENCE' };
        }
        if (!res.tweak) {
            return { status: 'REJECTED_RESPONSE', nextStep: 'REASON: No tweak provided' };
        }
        // Use the Negotiator to refine the tweak before it hits the Auditor
        const negotiationPrompt = `The Agent wants to tweak the validator.
Current Validator: ${state.proposedValidator}
Agent Tweak: ${res.tweak}
Expectation: ${expectation.description}

Refine this tweak into a technically sound proposal that satisfies the safety requirements while remaining practical.`;
        const negResult = await llm_service_1.LLMService.call("NEGOTIATOR", negotiationPrompt);
        if (negResult.isError) {
            return { status: 'ERROR', nextStep: `REASON: ${negResult.text}` };
        }
        // Now evaluate the refined proposal through the Auditor
        const auditResult = await this.auditor.evaluateTweak(state.proposedValidator, negResult.text);
        if (auditResult.approved) {
            const updatedValidator = auditResult.updatedValidator;
            await this.updateNegotiationState(expectationId, state.iterations + 1, updatedValidator);
            return { status: 'NEGOTIATING', nextStep: `UPDATED_VALIDATOR: ${updatedValidator}` };
        }
        else {
            return { status: 'REJECTED_TWEAK', nextStep: `REASON: ${auditResult.reason}` };
        }
    }
    async updateNegotiationState(id, iterations, validator, status = 'NEGOTIATING') {
        await this.registry.updateMetadata(id, { negotiation: { iterations, proposedValidator: validator, status } });
    }
    async getNegotiationState(id) {
        const exp = await this.registry.getExpectation(id);
        return exp.metadata?.negotiation || { iterations: 0, proposedValidator: null, status: 'NEGOTIATING' };
    }
}
exports.NegotiationManager = NegotiationManager;
