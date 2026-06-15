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
import { RegistryService } from "./registry_service";
import { Gatekeeper } from "./gatekeeper";
import { NegotiationManager } from "./negotiation_manager";
import { FinalizeChecker } from "./finalize_checker";
import { ValidationManager } from "./validation_manager";
import { SkepticAuditor } from "./skeptic_auditor";
import GuardrailConfig, { GuardrailMode } from "./config";

export default function (pi: ExtensionAPI) {
  // Initialize CGS Components
  const registry = new RegistryService();
  const auditor = new SkepticAuditor();
  const validationManager = new ValidationManager();
  const gatekeeper = new Gatekeeper(registry);
  const negotiator = new NegotiationManager(registry, auditor, validationManager);
  const finalizer = new FinalizeChecker(registry);

  const orchestrator = new GuardrailOrchestrator(
    registry,
    gatekeeper,
    negotiator,
    finalizer,
    validationManager
  );

  // Sensitive tools that require guardrails
  const SENSITIVE_TOOLS = ["edit", "write", "bash", "ctx_shell"];

  /**
   * Global Tool Interceptor
   * Uses the Pi Harness Hook system to prevent tool bypasses.
   */
  pi.on("tool_call", async (event, ctx) => {
    const { toolName, input } = event;
    const globalConfig = GuardrailConfig.getInstance();
    const currentMode = globalConfig.getMode();

    // 1. AFK Mode: Block human confirmation prompts
    if (currentMode === GuardrailMode.AFK) {
      // Identify tools that trigger a "Confirm with User" prompt
      // This is typically handled by the harness, but if the tool name 
      // or metadata indicates a user-confirmation request, block it.
      if (toolName === 'confirm_with_user' || toolName === 'prompt_user') {
        return {
          block: true,
          reason: `🛡️ [AFK MODE BLOCK] Real-time human confirmation is unavailable.\n\nPlease log this as a TODO/Ticket and justify your continuation path.`
        };
      }
    }

    if (!SENSITIVE_TOOLS.includes(toolName)) {
      return undefined; // Pass through for non-sensitive tools
    }


    // 1. Extract specific target from tool input for precise matching
    let target = toolName;
    if (toolName === 'write' || toolName === 'edit') {
      const rawPath = input.path || "";
      target = path.resolve(process.cwd(), rawPath);
    } else if (toolName === 'bash' || toolName === 'ctx_shell' || toolName === 'shell') {
      // For shell, we use the tool name as the trigger, 
      // and the interceptor handles internal command analysis via RULE-6/9
      target = toolName;
    } else {
      target = `${toolName}(${JSON.stringify(input)})`;
    }

    const sessionId = "default-session"; // In production, derived from ctx

    const check = await orchestrator.handleAction(target, sessionId);

    if (!check.allowed) {
      return {
        block: true,
        reason: `🛡️ [GUARDRAIL BLOCK] Action intercepted by CGS.\n\nExpectation: ${check.exp?.description}\nCondition: ${check.exp?.condition}\n\nPlease negotiate a validator script via /negotiate or provide proof.`
      };
    }

    return undefined; // Allow execution
  });

  pi.registerTool({
    name: "guardrail_status",
    label: "Check Guardrail Status",
    description: "Returns the current state of pending expectations.",
    parameters: Type.Object({}),
    async execute() {
      const pending = await registry.getPendingExpectations();
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
      expectationId: Type.String(),
      agree: Type.Boolean(),
      tweak: Type.Optional(Type.String()),
    }),
    async execute(_id, params) {
      const result = await orchestrator.negotiate(params.expectationId, { 
        agree: params.agree, 
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
      expectationId: Type.String(),
      proof: Type.String(),
    }),
    async execute(_id, params) {
      const result = await orchestrator.resolve(params.expectationId, params.proof);
      return {
        content: [{ type: "text", text: `Resolution Result: ${JSON.stringify(result)}` }],
      };
    }
  });

  pi.registerCommand({
    name: "guardrail",
    description: "Manage CGS operational mode (OFF, DEBUG, ENFORCE, AFK)",
    async execute(args) {
      const [action, mode] = args;
      if (action === "set" && mode) {
        if (!Object.values(GuardrailMode).includes(mode as GuardrailMode)) {
          return { content: [{ type: "text", text: `Invalid mode. Use: ${Object.values(GuardrailMode).join(', ')}` }] };
        }
        
        GuardrailConfig.getInstance().setMode(mode as GuardrailMode);
        return { content: [{ type: "text", text: `🛡️ Guardrail mode set to ${mode}. (Session only)` }] };
      }
      return { content: [{ type: "text", text: "Usage: /guardrail set <OFF|DEBUG|ENFORCE|AFK>" }] };
    }
  });
}
