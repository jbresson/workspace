import { Expectation, RegistryService } from './registry_service';
import { SkepticAuditor } from './skeptic_auditor';
import { ValidationManager } from './validation_manager';
import { LLMService } from '../../helpers/services/llm_service';

export interface NegotiationState {
  iterations: number;
  proposedValidator: string | null;
  status: 'NEGOTIATING' | 'AGREED' | 'STALLED';
}

export class NegotiationManager {
  private MAX_ITERATIONS = 10;

  constructor(
    private registry: RegistryService,
    private auditor: SkepticAuditor,
    private validator: ValidationManager
  ) {}

  async initiateHandshake(expectation: Expectation): Promise<{ status: string, proposedValidator: string }> {
    const initialValidator = await this.auditor.proposeValidator(expectation);
    await this.updateNegotiationState(expectation.id, 1, initialValidator);
    return {
      status: 'NEGOTIATING',
      proposedValidator: initialValidator
    };
  }

  async handleAgentResponse(expectationId: string, res: { agree: boolean, tweak?: string }): Promise<{ status: string, nextStep: string }> {
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

    const negResult = await LLMService.call("NEGOTIATOR", negotiationPrompt);
    
    if (negResult.isError) {
      return { status: 'ERROR', nextStep: `REASON: ${negResult.text}` };
    }

    // Now evaluate the refined proposal through the Auditor
    const auditResult = await this.auditor.evaluateTweak(state.proposedValidator!, negResult.text);
    if (auditResult.approved) {
      const updatedValidator = auditResult.updatedValidator!;
      await this.updateNegotiationState(expectationId, state.iterations + 1, updatedValidator);
      return { status: 'NEGOTIATING', nextStep: `UPDATED_VALIDATOR: ${updatedValidator}` };
    } else {
      return { status: 'REJECTED_TWEAK', nextStep: `REASON: ${auditResult.reason}` };
    }
  }

  private async updateNegotiationState(id: string, iterations: number, validator: string | null, status: NegotiationState['status'] = 'NEGOTIATING') {
    await this.registry.updateMetadata(id, { negotiation: { iterations, proposedValidator: validator, status } });
  }

  private async getNegotiationState(id: string): Promise<NegotiationState> {
    const exp = await this.registry.getExpectation(id);
    return exp.metadata?.negotiation || { iterations: 0, proposedValidator: null, status: 'NEGOTIATING' };
  }
}
