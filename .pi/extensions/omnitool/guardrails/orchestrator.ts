import { ExpectationService } from './expectation_service';
import { Gatekeeper } from './gatekeeper';
import { NegotiationManager } from './negotiation_manager';
import { FinalizeChecker } from './finalize_checker';
import { ValidationManager } from './validation_manager';

export class GuardrailOrchestrator {
  constructor(
    public registry: ExpectationService,
    public gatekeeper: Gatekeeper,
    public negotiator: NegotiationManager,
    public finalizer: FinalizeChecker,
    public validationManager: ValidationManager
  ) {}

  /**
   * The primary entry point for tool execution.
   */
  async handleAction(sessionId: string, toolName: string, toolParams: any): Promise<{ allowed: boolean, exp?: any }> {
    try {
      const result = await this.gatekeeper.intercept(sessionId, toolName, toolParams);
      if (result.allowed) return { allowed: true };

      return { 
        allowed: false, 
        exp: { 
          description: result.ruleId || 'Global Rule', 
          condition: result.reason 
        } 
      };
    } catch (error) {
      console.error(`[GUARDRAIL-ERROR] Orchestrator failed: ${error}`);
      return { allowed: true }; // Fail-open for availability
    }
  }

  /**
   * Handles the "Handshake" process.
   */
  async negotiate(expId: string, response: { agree: boolean, tweak?: string }) {
    const exp = await this.registry.getExpectation(expId);
    if (!exp) throw new Error(`Expectation ${expId} not found`);
    return await this.negotiator.handleAgentResponse(expId, response);
  }

  /**
   * Final attempt to resolve a block via the agreed validator.
   */
  async resolve(expId: string, proof: string) {
    const exp = await this.registry.getExpectation(expId);
    if (!exp) throw new Error(`Expectation ${expId} not found`);
    
    const result = await this.finalizer.finalizeResolution(exp, proof);
    
    if (result.resolved) {
      await this.registry.updateState(expId, 'RESOLVED', proof);
      return { success: true, reason: 'Expectation resolved successfully.' };
    }
    
    return { success: false, reason: result.reason };
  }
}
