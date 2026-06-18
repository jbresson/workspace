import * as fs from "node:fs";
import * as path from "node:path";
import { Type } from "@sinclair/typebox";
import { 
  appendAudit, 
  buildRegistryFromExtensions, 
  executeWipSubAction, 
  type RegistryEntry 
} from "./subroutines/omnitool";
import { Gatekeeper } from "./guardrails/gatekeeper";
import { ExpectationService } from "./guardrails/expectation_service";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const EXTENSIONS_DIR = path.resolve(__dirname, "./"); 
const WIP_ROOT = path.resolve(__dirname, "../../wip");
const AUDIT_LOG_PATH = path.resolve(__dirname, "../logs/tool_call.json");

const FACILITATION_ACTIONS = new Set(["call", "list", "search", "wip", "guardrail"]);
let registry = new Map<string, RegistryEntry>();
let registryLocked = false;

// Guardrail Services
const expectationService = new ExpectationService();
const gatekeeper = new Gatekeeper(expectationService);

async function bootRegistry() {
  if (registryLocked) return;
  const { entries } = await buildRegistryFromExtensions(EXTENSIONS_DIR);

  // Built-in core.wip pseudo-tool for workspace orchestration
  entries.set("core.wip", {
    key: "core.wip",
    moduleId: "core",
    toolName: "wip",
    description: "Workspace orchestration tool (init/clone/status/abort)",
    parameters: Type.Object({
      subAction: Type.String(),
      ticketId: Type.Optional(Type.String()),
      goals: Type.Optional(Type.String()),
      repos: Type.Optional(Type.Array(Type.String())),
      repoName: Type.Optional(Type.String()),
      justification: Type.Optional(Type.String()),
    }),
    execute: async (_toolCallId, params) => executeWipSubAction(WIP_ROOT, params),
  });

  registry = entries;
  registryLocked = true;
}

function listTools() {
  const tools = Array.from(registry.values()).map((t) => ({
    key: t.key,
    description: t.description || "",
    module: t.moduleId,
  }));
  return {
    content: [{ type: "text", text: tools.map((t) => `- ${t.key}: ${t.description}`).join("\n") || "(none)" }],
    details: { count: tools.length, tools },
  };
}

function searchTools(query: string) {
  const q = (query || "").toLowerCase();
  const hits = Array.from(registry.values()).filter((t) =>
    t.key.toLowerCase().includes(q) ||
    (t.description || "").toLowerCase().includes(q)
  );
  return {
    content: [{ type: "text", text: hits.map((h) => `- ${h.key}`).join("\n") || "(none)" }],
    details: { count: hits.length, tools: hits.map((h) => h.key) },
  };
}

async function dispatch(action: string, params: any, pi: any, toolCallId: string) {
  if (!FACILITATION_ACTIONS.has(action)) {
    throw new Error(`Unsupported omnitool action '${action}'. Use one of: ${Array.from(FACILITATION_ACTIONS).join(", ")}`);
  }

  if (action === "list") return listTools();
  if (action === "search") return searchTools(params?.query || "");

  if (action === "wip") {
    const wipTool = registry.get("core.wip");
    if (!wipTool) throw new Error("core.wip unavailable");
    return wipTool.execute(toolCallId, params || {}, pi);
  }

  if (action === "guardrail") {
    // Proxy guardrail tools (negotiate, resolve, status)
    const subAction = params?.subAction;
    const guardrailToolKey = `guardrails.${subAction}`;
    const target = registry.get(guardrailToolKey);
    if (!target) throw new Error(`Unknown guardrail subAction '${subAction}'.`);
    return target.execute(toolCallId, params?.params || {}, pi);
  }

  const toolKey = params?.tool;
  const args = params?.args || {};

  if (!toolKey || typeof toolKey !== "string") {
    throw new Error("omnitool call requires params.tool as 'module.tool'");
  }

  const target = registry.get(toolKey);
  if (!target) {
    throw new Error(`Unknown tool '${toolKey}'. Use omnitool list/search.`);
  }

  return target.execute(toolCallId, args, pi);
}

export default async function (pi: any) {
  await bootRegistry();

  // RULE-12: Global Tool Surface Lockdown (Additive vs Replace mode logic)
  // We use a strict "replace" approach here to ensure ONLY omnitool is exposed.
  pi.on("session_start", async () => {
    // Force tool surface to be exactly ["omnitool"]
    // This removes all built-ins and other extension tools from the LLM's available list.
    pi.setActiveTools(["omnitool"]);
    pi.ui.notify("🛡️ Tool Surface Lockdown Active: Only 'omnitool' is exposed.", "info");
  });

  // Safety Interceptor: Block any tool call that bypasses the active list 
  // (defense-in-depth in case pi.setActiveTools is overridden or bypassed)
  pi.on("tool_call", async (event: any, ctx: any) => {
    if (event.toolName !== "omnitool") {
      return { 
        block: true, 
        reason: `🛡️ Tool Surface Lockdown: Direct call to '${event.toolName}' is forbidden. Use omnitool({ action: "call", params: { tool: "${event.toolName}", args: ... } })` 
      };
    }
  });

  pi.registerTool({
    name: "omnitool",
    description: "Single proxy for all tool calls. Use actions: call/list/search/wip/guardrail.",
    parameters: Type.Object({
      action: Type.String({ description: "call | list | search | wip | guardrail" }),
      params: Type.Optional(Type.Any()),
    }),
    async execute(toolCallId, input) {
      const action = input?.action;
      const params = input?.params ?? {};
      
      try {
        // RULE-12: Tool Surface Lockdown check
        // Since this is the only registered tool in pi.registerTool, we are mostly safe, 
        // but we intercept calls here to ensure they follow the proxy pattern.

        // GUARDRAIL INTERCEPTION
        const guardResult = await gatekeeper.intercept("SESSION_UNKNOWN", action === "call" ? params.tool : action, params);
        
        if (!guardResult.allowed) {
          const blockInfo = { 
            action, 
            params, 
            status: "blocked", 
            guardrail: { checked: true, allowed: false, ruleId: guardResult.ruleId, reason: guardResult.reason } 
          };
          appendAudit(AUDIT_LOG_PATH, blockInfo);
          return { 
            content: [{ type: "text", text: `🛡️ Blocked by Guardrail ${guardResult.ruleId || 'Unknown'}: ${guardResult.reason}` }], 
            isError: true,
            alternative: guardResult.alternative 
          };
        }

        const result = await dispatch(action, params, pi, toolCallId);
        appendAudit(AUDIT_LOG_PATH, { action, params, status: "success", result });
        return result;
      } catch (error: any) {
        const message = error?.message || String(error);
        appendAudit(AUDIT_LOG_PATH, { action, params, status: "error", error: message });
        return { content: [{ type: "text", text: `❌ Omnitool Error: ${message}` }], isError: true };
      }
    },
  });
}
