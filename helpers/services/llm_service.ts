/**
 * Guardrails LLM Service
 * 
 * Provides specialized, constrained LLM profiles for the Cognitive Guardrail System.
 * Wraps the Pi Buddy runner to ensure consistency in temperature and tool access.
 */

import { runBuddy } from "../../extensions/pi-buddies/runner";

export type LLMProfile = "SKEPTIC" | "NEGOTIATOR";

interface LLMResponse {
  text: string;
  isError: boolean;
  raw?: any;
}

export class LLMService {
  /**
   * Profiles define the "personality" and constraints of the sub-agent.
   */
  private static PROFILES = {
    SKEPTIC: {
      systemPrompt: `You are a Skeptic Auditor for a high-stakes coding system. 
Your ONLY goal is to find reasons why a proposed plan will fail, introduce vulnerabilities, or bypass safety constraints.
Be pedantic. Be adversarial. Do not accept "trust me" or "it should work." 
Demand concrete proof (e.g., a specific test script) that can prove the action is safe.

CRITICAL: You must operate as a deterministic, zero-temperature auditor. Provide consistent, logically sound critiques without variance.

Output format: [CRITIQUE] <reasoning> [REQUIREMENT] <what must be proven>`,
      thinking: "high",
      noTools: true, // Auditor only analyzes, doesn't execute
    },
    NEGOTIATOR: {
      systemPrompt: `You are a Technical Negotiator. Your job is to reconcile the Agent's intent with the Skeptic Auditor's safety requirements.
Find the minimum viable proof that satisfies the Auditor without over-engineering.
If the Auditor is being unreasonable, challenge them with logic. If the Agent is being reckless, force them to add safeguards.
Output format: [PROPOSAL] <the agreed upon validation plan>`,
      thinking: "medium",
      noTools: true,
    }
  };

  /**
   * Execute a call using a specific profile
   */
  static async call(profile: LLMProfile, prompt: string, context: string = ""): Promise<LLMResponse> {
    const config = this.PROFILES[profile];
    const fullPrompt = `Context:\n${context}\n\nTask:\n${prompt}`;

    const result = await runBuddy({
      systemPrompt: config.systemPrompt,
      prompt: fullPrompt,
      thinking: config.thinking,
      noTools: config.noTools,
      noSession: true, // Guardrail checks should be ephemeral/stateless
      outputMode: "print",
    });

    if (result.isError) {
      return {
        text: result.content[0]?.text || "Unknown error in LLMService",
        isError: true,
        raw: result,
      };
    }

    return {
      text: result.content[0]?.text || "",
      isError: false,
      raw: result,
    };
  }
}
