import { Expectation } from './expectation_service';
import { LLMService } from '../../../helpers/services/llm_service';

export interface AuditResult {
  approved: boolean;
  reason: string;
  safetyRating: 'SAFE' | 'RISKY' | 'UNSAFE';
  updatedValidator?: string;
}

export class SkepticAuditor {
  /**
   * Performs adversarial review of a proposed proof.
   * Now powered by the LLMService SKEPTIC profile.
   */
  async audit(expectation: Expectation, proof: string, projectContext: string): Promise<AuditResult> {
    const prompt = `Analyze this proof for the following expectation:
Expectation: ${expectation.description}
Condition: ${expectation.condition}
Proposed Proof: ${proof}

Does this proof actually verify the condition, or is it a 'fake success' (e.g. hardcoded exit 0)? 
If you find any flaw, reject it and specify what is missing.`;

    const context = `Project Context:\n${projectContext}`;
    
    const result = await LLMService.call("SKEPTIC", prompt, context);

    if (result.isError) {
      return { 
        approved: false, 
        reason: `Auditor system error: ${result.text}`, 
        safetyRating: 'RISKY' 
      };
    }

    const text = result.text;

    // SKEPTIC profile uses [CRITIQUE] and [REQUIREMENT]
    if (text.includes("[CRITIQUE]") || !text.includes("APPROVED")) {
       return {
         approved: false,
         reason: text,
         safetyRating: text.includes("UNSAFE") ? 'UNSAFE' : 'RISKY'
       };
    }

    return { 
      approved: true, 
      reason: 'Adversarial audit passed.', 
      safetyRating: 'SAFE' 
    };
  }

  /**
   * Proposes an initial validation script based on the expectation.
   */
  async proposeValidator(expectation: Expectation): Promise<string> {
    const prompt = `Propose a concrete, executable shell command or script that would prove the following condition is met:
Expectation: ${expectation.description}
Condition: ${expectation.condition}

The validator must be objective and not rely on hardcoded success signals.`;
    
    const result = await LLMService.call("SKEPTIC", prompt);
    return result.isError ? 'echo "error proposing validator"' : result.text;
  }

  /**
   * Evaluates a tweak to a proposed validator.
   */
  async evaluateTweak(currentValidator: string, tweak: string): Promise<AuditResult> {
    const prompt = `Current Validator: ${currentValidator}
Proposed Tweak: ${tweak}

Evaluate if this tweak improves the validator or introduces flaws. 
If approved, provide the final combined validator script.
Format: [APPROVED] <reason> [VALIDATOR] <script> or [CRITIQUE] <reason>`;

    const result = await LLMService.call("SKEPTIC", prompt);
    const text = result.text;

    if (text.includes("[APPROVED]") && text.includes("[VALIDATOR]")) {
      const validator = text.split("[VALIDATOR]")[1].trim();
      return {
        approved: true,
        reason: "Tweak approved by Auditor.",
        safetyRating: "SAFE",
        updatedValidator: validator
      };
    }

    return {
      approved: false,
      reason: text,
      safetyRating: "RISKY"
    };
  }
}
