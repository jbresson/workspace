/**
 * Guardrail Interceptor Extension
 * 
 * This extension acts as the "Hand" of the CGS. It intercepts calls to 
 * sensitive tools and routes them through the GuardrailOrchestrator.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import * as path from "path";
import { GuardrailOrchestrator } from "./orchestrator";
import { ExpectationService } from "./expectation_service";
import { Gatekeeper } from "./gatekeeper";
import { NegotiationManager } from "./negotiation_manager";
import { FinalizeChecker } from "./finalize_checker";
import { ValidationManager } from "./validation_manager";
import { SkepticAuditor } from "./skeptic_auditor";
import GuardrailConfig, { GuardrailMode } from "./config";

export default function (pi: ExtensionAPI) {
  // Initialize CGS Components
  const expectation = new ExpectationService();
  const auditor = new SkepticAuditor();
  const validationManager = new ValidationManager();
  const gatekeeper = new Gatekeeper(expectation);
  const negotiator = new NegotiationManager(expectation, auditor, validationManager);
  const finalizer = new FinalizeChecker(expectation);

  const orchestrator = new GuardrailOrchestrator(
    expectation,
    gatekeeper,
    negotiator,
    finalizer,
    validationManager
  );

  /**
   * Global Tool Interceptor
   * Uses the Pi Harness Hook system to prevent tool bypasses.
   */
  pi.on("tool_call", async (event, ctx) => {

    try {
    const { toolName, input } = event;
    const toolParams = input;

    const globalConfig = GuardrailConfig.getInstance();
    const currentMode = globalConfig.getMode();
    
    ctx.ui.notify(`[CGS-1] Intercepted ${toolName} | Mode: ${currentMode}`);

    if (currentMode == GuardrailMode.OFF) {
        ctx.ui.notify("guardrails are currently off, allowing tool")
        return undefined; // pass through if we're off
    }

    const sessionId = ctx.sessionId || "default-session";

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

    } catch (error: any) {
        ctx.ui.notify(`[CGS-ERROR] ${error.message || error}`)
        return { block: true, reason: `Guardrail internal error: ${error}` };
        }
    return undefined //fallback
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
    parameters: Type.Object({
      expectationId: Type.String({ description: "The unique ID of the expectation to negotiate" }),
      agree: Type.String({ description: "Whether you agree with the proposed validator ('true' or 'false')" }),
      tweak: Type.Optional(Type.String({ description: "Suggested changes to the validator script" })),
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
    parameters: Type.Object({
      expectationId: Type.String({ description: "The unique ID of the expectation to resolve" }),
      proof: Type.String({ description: "Evidence or result of the validator script execution" }),
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
      const globalConfig = GuardrailConfig.getInstance();
      if (mode) {
        mode = mode.toUpperCase()
        if (!Object.values(GuardrailMode).includes(mode as GuardrailMode)) {
          ctx.ui.notify(`Invalid mode: ${mode}. Use: ${Object.values(GuardrailMode).join(', ')}`);
          return
        }

        GuardrailConfig.getInstance().setMode(mode as GuardrailMode);
        ctx.ui.notify(`🛡️ Guardrail mode set to ${mode}. (Session only)`);
        return
      }
      const currentMode = globalConfig.getMode();
      ctx.ui.notify(`Usage: /guardrail set <OFF|DEBUG|ENFORCE|AFK>\nCurrent mode: ${currentMode}`);
    },
  });

}
