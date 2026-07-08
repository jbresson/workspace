/**
 * Gatekeeper: Intercepts tool calls based on OmnitoolMode
 * 
 * Behavior per mode:
 * - OFF: Not applicable (registration disabled)
 * - DEBUG: No guardrails, all calls allowed, verbose logging of registration
 * - ON: No guardrails, all calls allowed, error-only logging
 * - GUARDED_DEBUG: Guardrails active, no blocking, verbose logging
 * - GUARDED: Guardrails active, blocking enabled (default)
 * - AFK: Guardrails active, blocking enabled, escalation mode (create issue + require resolution)
 */

import { ExpectationService } from './expectation_service';
import { GLOBAL_RULES, GatekeeperRule } from './gatekeeper-rules';
import OmnitoolConfig, { OmnitoolMode } from './config';

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
    const globalConfig = OmnitoolConfig.getInstance();
    const currentMode = globalConfig.getMode();

    // OFF mode: Not applicable (registration disabled)
    if (currentMode === OmnitoolMode.OFF) {
      return { allowed: true };
    }

    // DEBUG mode: No guardrails, all calls allowed
    if (currentMode === OmnitoolMode.DEBUG) {
      if (globalConfig.isVerboseLogging()) {
        console.log(`[GATEKEEPER-DEBUG] DEBUG mode: bypassing guardrails for ${toolName}`);
      }
      return { allowed: true };
    }

    // ON mode: No guardrails, all calls allowed
    if (currentMode === OmnitoolMode.ON) {
      return { allowed: true };
    }

    // GUARDED_DEBUG and GUARDED modes: Apply guardrails
    if (globalConfig.isGuardrailsActive()) {
      if (globalConfig.isVerboseLogging()) {
        console.log(`[GATEKEEPER] Intercepting ${toolName} in mode: ${currentMode}`);
      }

      // Debugging log for parameter inspection (GUARDED_DEBUG only)
      if (currentMode === OmnitoolMode.GUARDED_DEBUG) {
        console.log(`[GATEKEEPER-GUARDRAILS] toolName: ${toolName}, params: ${JSON.stringify(toolParams)}`);
      }

      // Step 1: Global Rules Filter
      const matchingRules = GLOBAL_RULES.filter(r => r.toolGuard(toolName));
      for (const rule of matchingRules) {
        if (rule.paramInspector) {
          const result = rule.paramInspector(toolName, toolParams);
          if (!result.allowed) {
            // Handle Oversight & AFK Mode
            if (rule.requiresOversight && currentMode === OmnitoolMode.AFK) {
              await this.handleAfkBlock(sessionId, rule);
              if (globalConfig.isVerboseLogging()) {
                console.log(`[GATEKEEPER-AFK] AFK block triggered for rule ${rule.id}: ${rule.description}`);
              }
              return {
                allowed: false,
                reason: `🛡️ [AFK BLOCK] ${rule.description}: ${result.reason}`,
                alternative: rule.resolutionGuidance,
                ruleId: rule.id
              };
            }

            // GUARDED_DEBUG: Log warning but allow (no blocking)
            if (currentMode === OmnitoolMode.GUARDED_DEBUG) {
              console.warn(`[GUARDRAIL-DEBUG] ${rule.id} would block ${toolName}: ${result.reason || 'Rule violation'}`);
              return { allowed: true };
            }

            // GUARDED: Block
            if (currentMode === OmnitoolMode.GUARDED) {
              return {
                allowed: false,
                reason: result.reason || 'Rule violation',
                alternative: result.alternative || rule.resolutionGuidance,
                ruleId: rule.id
              };
            }
          }
        }
      }

      // Step 2: Session Expectations Filter (only block in GUARDED/AFK modes)
      const activeExpectations = await this.expectationService.findActive(sessionId, toolName, toolParams);
      if (activeExpectations.length > 0 && globalConfig.isBlockingEnabled()) {
        if (globalConfig.isVerboseLogging()) {
          console.log(`[GATEKEEPER-EXPECT] Active expectation blocks ${toolName}`);
        }
        return {
          allowed: false,
          reason: `Blocked by active expectation: ${activeExpectations[0].condition}`,
          alternative: 'Resolve pending expectations before proceeding.'
        };
      }
    }

    return { allowed: true };
  }

  private async handleAfkBlock(sessionId: string, rule: GatekeeperRule) {
    const config = OmnitoolConfig.getInstance();
    if (config.isVerboseLogging()) {
      console.log(`[GATEKEEPER-AFK-ESCALATE] Creating expectation for rule ${rule.id}`);
    }
    
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