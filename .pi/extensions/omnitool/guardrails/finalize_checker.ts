import { Expectation } from './expectation_service';
import { ValidationManager } from './validation_manager';
import { LLMService } from '../services/llm_service';

/**
 * FinalizeChecker is strictly separated from the NegotiationManager.
 * Its only job is to execute the agreed-upon validator and verify the outcome
 * without any bias from the negotiation history.
 */
export class FinalizeChecker {
  constructor(private validationManager: ValidationManager) {}

  async finalizeResolution(expectation: Expectation, proof: string): Promise<{ resolved: boolean, reason: string }> {
    // 1. Retrieve the agreed validator from metadata
    const agreedValidator = expectation.metadata?.negotiation?.proposedValidator;
    
    if (!agreedValidator) {
      return { resolved: false, reason: 'No agreed validator found in negotiation state.' };
    }

    // 2. Cross-verify that the provided proof matches the agreed validator
    if (proof !== agreedValidator) {
      return { resolved: false, reason: 'Provided proof does not match the negotiated validator.' };
    }

    // 3. Execute via ValidationManager (Hard Truth)
    const validationResult = await this.validationManager.validate(expectation, proof);
    
    if (!validationResult.success) {
      return { resolved: false, reason: `Execution failed: ${validationResult.reason}` };
    }

    // 4. DEEP AUDIT (Adversarial LLM Verification)
    // Even if the script returned 0, was it a "fake success"?
    // We check the output against the intention.
    const auditPrompt = `SKEPTIC AUDIT:
Expectation: ${expectation.description}
Condition: ${expectation.condition}
Agreed Validator Script: ${agreedValidator}
Actual Execution Output: ${validationResult.reason} // In a real impl, this would be the full stdout

Does this output legitimately prove the condition was met, or is it a 'fake success' (e.g., the script returned 0 but didn't actually verify the state)?
Answer with [APPROVED] if valid, or [CRITIQUE] with reasons why it fails.`;

    const auditResult = await LLMService.call("SKEPTIC", auditPrompt);

    if (auditResult.isError) {
      return { resolved: false, reason: `Audit system error: ${auditResult.text}` };
    }

    if (auditResult.text.includes("[CRITIQUE]") || !auditResult.text.includes("[APPROVED]")) {
      return { 
        resolved: false, 
        reason: `Adversarial audit failed: ${auditResult.text}` 
      };
    }

    return { 
      resolved: true, 
      reason: 'Hard validation passed and adversarial audit approved.' 
    };
  }
}
