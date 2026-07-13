"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gatekeeper = void 0;
const gatekeeper_rules_1 = require("./gatekeeper-rules");
const config_1 = __importStar(require("./config"));
class Gatekeeper {
    constructor(expectationService) {
        this.expectationService = expectationService;
    }
    async intercept(sessionId, toolName, toolParams) {
        const globalConfig = config_1.default.getInstance();
        const currentMode = globalConfig.getMode();
        // OFF mode: Not applicable (registration disabled)
        if (currentMode === config_1.OmnitoolMode.OFF) {
            return { allowed: true };
        }
        // DEBUG mode: No guardrails, all calls allowed
        if (currentMode === config_1.OmnitoolMode.DEBUG) {
            if (globalConfig.isVerboseLogging()) {
                console.log(`[GATEKEEPER-DEBUG] DEBUG mode: bypassing guardrails for ${toolName}`);
            }
            return { allowed: true };
        }
        // ON mode: No guardrails, all calls allowed
        if (currentMode === config_1.OmnitoolMode.ON) {
            return { allowed: true };
        }
        // GUARDED_DEBUG and GUARDED modes: Apply guardrails
        if (globalConfig.isGuardrailsActive()) {
            if (globalConfig.isVerboseLogging()) {
                console.log(`[GATEKEEPER] Intercepting ${toolName} in mode: ${currentMode}`);
            }
            // Debugging log for parameter inspection (GUARDED_DEBUG only)
            if (currentMode === config_1.OmnitoolMode.GUARDED_DEBUG) {
                console.log(`[GATEKEEPER-GUARDRAILS] toolName: ${toolName}, params: ${JSON.stringify(toolParams)}`);
            }
            // Step 1: Global Rules Filter
            const matchingRules = gatekeeper_rules_1.GLOBAL_RULES.filter(r => r.toolGuard(toolName));
            for (const rule of matchingRules) {
                if (rule.paramInspector) {
                    const result = rule.paramInspector(toolName, toolParams);
                    if (!result.allowed) {
                        // Handle Oversight & AFK Mode
                        if (rule.requiresOversight && currentMode === config_1.OmnitoolMode.AFK) {
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
                        if (currentMode === config_1.OmnitoolMode.GUARDED_DEBUG) {
                            console.warn(`[GUARDRAIL-DEBUG] ${rule.id} would block ${toolName}: ${result.reason || 'Rule violation'}`);
                            return { allowed: true };
                        }
                        // GUARDED: Block
                        if (currentMode === config_1.OmnitoolMode.GUARDED) {
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
    async handleAfkBlock(sessionId, rule) {
        const config = config_1.default.getInstance();
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
exports.Gatekeeper = Gatekeeper;
