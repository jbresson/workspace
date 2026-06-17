import { ExpectationService } from './expectation_service';
import { GLOBAL_RULES, GatekeeperRule } from './gatekeeper-rules';
import GuardrailConfig, { GuardrailMode } from './config';

export interface GatekeeperResult {
  allowed: boolean;
  reason?: string;
  alternative?: string;
  ruleId?: string;
  requiresOversight?: boolean;
}

export class Gatekeeper {
  constructor(private expectationService: ExpectationService) {}

  async intercept(sessionId: string, toolName: string, toolParams: any): Promise<GatekeeperResult> {
    const globalConfig = GuardrailConfig.getInstance();
    const currentMode = globalConfig.getMode();

    if (currentMode === GuardrailMode.OFF) {
      return { allowed: true };
    }

    // Debugging log for parameter inspection
    console.log(`[GATEKEEPER-DEBUG] toolName: ${toolName}, params: ${JSON.stringify(toolParams)}`);

    // Step 1: Global Rules Filter
    const matchingRules = GLOBAL_RULES.filter(r => r.toolGuard(toolName));
    ctx.ui.notify(`matchingRules: ${matchingRules.toString()}`)
    for (const rule of matchingRules) {
      if (rule.paramInspector) {
        const result = rule.paramInspector(toolName, toolParams);
        if (!result.allowed) {
          // Handle Oversight & AFK Mode
          if (rule.requiresOversight) {
            if (currentMode === GuardrailMode.AFK) {
              await this.handleAfkBlock(sessionId, rule);
              return { 
                allowed: false, 
                reason: `🛡️ [AFK BLOCK] ${rule.description}: ${result.reason}`, 
                alternative: rule.resolutionGuidance,
                ruleId: rule.id
              };
            }
            // In non-AFK mode, we allow it to proceed but flag for oversight (handled by orchestrator)
            // For this implementation, we'll treat a "requiresOversight" block as a hard block in ENFORCE mode
          }

          if (currentMode === GuardrailMode.ENFORCE) {
            return { 
              allowed: false, 
              reason: result.reason, 
              alternative: result.alternative || rule.resolutionGuidance,
              ruleId: rule.id 
            };
          }

          if (currentMode === GuardrailMode.DEBUG) {
            console.warn(`[GUARDRAIL-DEBUG] ${rule.id} would block ${toolName}: ${result.reason}`);
          }
        }
      }
    }

    // Step 2: Session Expectations Filter
    const activeExpectations = await this.expectationService.findActive(sessionId, toolName, toolParams);
    if (activeExpectations.length > 0 && currentMode !== GuardrailMode.DEBUG) {
      return { 
        allowed: false, 
        reason: `Blocked by active expectation: ${activeExpectations[0].condition}`, 
        alternative: 'Resolve pending expectations before proceeding.' 
      };
    }

    return { allowed: true };
  }

  private async handleAfkBlock(sessionId: string, rule: GatekeeperRule) {
    await this.expectationService.issueExpectation(sessionId, {
      id: `EXP-AFK-${rule.id}-${Date.now()}`,
      trigger: rule.id,
      condition: `Resolve oversight requirement for ${rule.description}`,
      validationType: 'MANUAL',
      proof: null,
      scope: 'SESSION',
      metadata: { originalRule: rule.id, behavior: rule.afkBehavior }
    });
  }
}