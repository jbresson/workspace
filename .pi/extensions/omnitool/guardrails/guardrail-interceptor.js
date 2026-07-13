"use strict";
/**
 * Guardrail Interceptor Extension
 *
 * This extension acts as the "Hand" of the CGS. It intercepts calls to
 * sensitive tools and routes them through the GuardrailOrchestrator.
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
exports.default = default_1;
const typebox_1 = require("typebox");
const orchestrator_1 = require("./orchestrator");
const expectation_service_1 = require("./expectation_service");
const gatekeeper_1 = require("./gatekeeper");
const negotiation_manager_1 = require("./negotiation_manager");
const finalize_checker_1 = require("./finalize_checker");
const validation_manager_1 = require("./validation_manager");
const skeptic_auditor_1 = require("./skeptic_auditor");
const config_1 = __importStar(require("./config"));
function default_1(pi) {
    // Initialize CGS Components
    const expectation = new expectation_service_1.ExpectationService();
    const auditor = new skeptic_auditor_1.SkepticAuditor();
    const validationManager = new validation_manager_1.ValidationManager();
    const gatekeeper = new gatekeeper_1.Gatekeeper(expectation);
    const negotiator = new negotiation_manager_1.NegotiationManager(expectation, auditor, validationManager);
    const finalizer = new finalize_checker_1.FinalizeChecker(expectation);
    const orchestrator = new orchestrator_1.GuardrailOrchestrator(expectation, gatekeeper, negotiator, finalizer, validationManager);
    /**
     * Global Tool Interceptor
     * Uses the Pi Harness Hook system to prevent tool bypasses.
     */
    pi.on("tool_call", async (event, ctx) => {
        try {
            const { toolName, input } = event;
            const toolParams = input;
            const globalConfig = config_1.default.getInstance();
            const currentMode = globalConfig.getMode();
            ctx.ui.notify(`[CGS-1] Intercepted ${toolName} | Mode: ${currentMode}`);
            if (currentMode == config_1.GuardrailMode.OFF) {
                ctx.ui.notify("guardrails are currently off, allowing tool");
                return undefined; // pass through if we're off
            }
            const sessionId = event.sessionId() || "default-session";
            ctx.ui.notify(`[CGS-2] Checking action for session: ${sessionId}`);
            const check = await orchestrator.handleAction(sessionId, toolName, toolParams);
            ctx.ui.notify(`[CGS-3] Result: allowed=${check.allowed} | exp=${check.exp ? 'YES' : 'NO'}`);
            if (!check.allowed) {
                ctx.ui.notify(`[CGS-4] Blocking action: ${toolName}`);
                return {
                    block: true,
                    reason: `🛡️ [GUARDRAIL BLOCK] Action intercepted by CGS.\n\nExpectation: ${check.exp?.description}\nCondition: ${check.exp?.condition}\n\nPlease negotiate a validator script via /negotiate or provide proof.`
                };
            }
            return undefined; // Allow execution
        }
        catch (error) {
            ctx.ui.notify(`[CGS-ERROR] ${error.message || error}`);
            return { block: true, reason: `Guardrail internal error: ${error}` };
        }
        return undefined; //fallback
    });
    pi.registerTool({
        name: "guardrail_status",
        label: "Check Guardrail Status",
        description: "Returns the current state of pending expectations.",
        async execute() {
            const pending = await expectation.getPendingExpectations();
            return {
                content: [{ type: "text", text: JSON.stringify(pending, null, 2) }],
            };
        }
    });
    pi.registerTool({
        name: "negotiate_guardrail",
        label: "Negotiate Guardrail",
        description: "Tweak a proposed validator script.",
        parameters: typebox_1.Type.Object({
            expectationId: typebox_1.Type.String({ description: "The unique ID of the expectation to negotiate" }),
            agree: typebox_1.Type.String({ description: "Whether you agree with the proposed validator ('true' or 'false')" }),
            tweak: typebox_1.Type.Optional(typebox_1.Type.String({ description: "Suggested changes to the validator script" })),
        }),
        async execute(_id, params) {
            const result = await orchestrator.negotiate(params.expectationId, {
                agree: params.agree === 'true',
                tweak: params.tweak
            });
            return {
                content: [{ type: "text", text: `Negotiation Result: ${JSON.stringify(result)}` }],
            };
        }
    });
    pi.registerTool({
        name: "resolve_guardrail",
        label: "Resolve Guardrail",
        description: "Submit proof to resolve a block.",
        parameters: typebox_1.Type.Object({
            expectationId: typebox_1.Type.String({ description: "The unique ID of the expectation to resolve" }),
            proof: typebox_1.Type.String({ description: "Evidence or result of the validator script execution" }),
        }),
        async execute(_id, params) {
            const result = await orchestrator.resolve(params.expectationId, params.proof);
            return {
                content: [{ type: "text", text: `Resolution Result: ${JSON.stringify(result)}` }],
            };
        }
    });
    pi.registerCommand("guardrail", {
        description: "Manage CGS operational mode (OFF, DEBUG, ENFORCE, AFK)",
        handler: async (args, ctx) => {
            let mode = args;
            const globalConfig = config_1.default.getInstance();
            if (mode) {
                mode = mode.toUpperCase();
                if (!Object.values(config_1.GuardrailMode).includes(mode)) {
                    ctx.ui.notify(`Invalid mode: ${mode}. Use: ${Object.values(config_1.GuardrailMode).join(', ')}`);
                    return;
                }
                config_1.default.getInstance().setMode(mode);
                ctx.ui.notify(`🛡️ Guardrail mode set to ${mode}. (Session only)`);
                return;
            }
            const currentMode = globalConfig.getMode();
            ctx.ui.notify(`Usage: /guardrail set <OFF|DEBUG|ENFORCE|AFK>\nCurrent mode: ${currentMode}`);
        },
    });
}
