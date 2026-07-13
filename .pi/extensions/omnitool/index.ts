import * as fs from "node:fs";
import * as path from "node:path";
import { Type } from "typebox";
import { 
  appendAudit, 
  buildRegistryFromExtensions, 
  type RegistryEntry 
} from "./omnitool";
import { executeWipSubAction } from "./wip-manager/manager";
import { Gatekeeper } from "./guardrails/gatekeeper";
import { ExpectationService } from "./guardrails/expectation_service";
import OmnitoolConfig, { OmnitoolMode } from "./guardrails/config";
import { ExtensionAPI } from "@earendil-works/pi-coding-agent"

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const EXTENSIONS_DIR = path.resolve(__dirname, "../"); 
const WIP_ROOT = path.resolve(__dirname, "../../wip");
const AUDIT_LOG_PATH = path.resolve(__dirname, "../logs/tool_call.json");

const FACILITATION_ACTIONS = new Set(["call", "list", "search", "wip", "guardrail", "librarian"]);
let registry = new Map<string, RegistryEntry>();
let registryLocked = false;

// Guardrail Services
const expectationService = new ExpectationService();
const gatekeeper = new Gatekeeper(expectationService);

async function bootRegistry() {
  if (registryLocked) return;
  const config = OmnitoolConfig.getInstance();
  
  if (config.isVerboseLogging()) {
    console.log(`[OMNITOOL-BOOT] Starting registry build in mode: ${config.getMode()}`);
  }

  const { entries } = await buildRegistryFromExtensions(EXTENSIONS_DIR);

  // Built-in core.wip pseudo-tool for workspace orchestration
  entries.set("core.wip", {
    key: "core.wip",
    tool: {
      name: "core.wip",
      description: "Workspace orchestration tool (prepare/list/status/graduate/prune/seed + issues.* lifecycle)",
      parameters: Type.Object({
        subAction: Type.String(),
        ticketId: Type.Optional(Type.String()),
        goals: Type.Optional(Type.String()),
        repos: Type.Optional(Type.Array(Type.String())),
        repoName: Type.Optional(Type.String()),
        justification: Type.Optional(Type.String()),
      }),
      execute: async (_toolCallId, params, pi) => executeWipSubAction(WIP_ROOT, params, pi),
    },
  });

  registry = entries;
  registryLocked = true;

  if (config.isVerboseLogging()) {
    console.log(`[OMNITOOL-BOOT] Registry complete with ${registry.size} tools`);
  }
}

function listTools() {
  const tools = Array.from(registry.values()).map((t) => ({
    key: t.key,
    description: t.tool.description || "",
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
    (t.tool.description || "").toLowerCase().includes(q)
  );
  return {
    content: [{ type: "text", text: hits.map((h) => `- ${h.key}`).join("\n") || "(none)" }],
    details: { count: hits.length, tools: hits.map((h) => h.key) },
  };
}

async function dispatch(action: string, params: any, pi: any, toolCallId: string) {
  const config = OmnitoolConfig.getInstance();

  if (!FACILITATION_ACTIONS.has(action)) {
    throw new Error(`Unsupported omnitool action '${action}'. Use one of: ${Array.from(FACILITATION_ACTIONS).join(", ")}`);
  }

  if (config.isVerboseLogging()) {
    console.log(`[OMNITOOL-DISPATCH] action=${action}, tool=${params?.tool || 'N/A'}`);
  }

  if (action === "list") return listTools();
  if (action === "search") return searchTools(params?.query || "");

  if (action === "call") {
    const toolKey = params?.tool;
    const args = params?.args || {};

    if (!toolKey || typeof toolKey !== "string") {
      throw new Error("omnitool 'call' action requires params.tool as 'module.tool'");
    }

    const target = registry.get(toolKey);
    if (!target) {
      throw new Error(`Unknown tool '${toolKey}'. Use omnitool list/search.`);
    }

    return target.tool.execute(toolCallId, args, pi);
  }

  if (action === "wip") {
    const wipTool = registry.get("core.wip");
    if (!wipTool) throw new Error("core.wip unavailable");
    return wipTool.tool.execute(toolCallId, params || {}, pi);
  }

  if (action === "librarian") {
    const subAction = params?.subAction;
    const librarianToolKey = `librarian.${subAction}`;
    const target = registry.get(librarianToolKey);
    if (!target) throw new Error(`Unknown librarian verb '${subAction}'.`);
    return target.tool.execute(toolCallId, params?.params || {}, pi);
  }

  if (action === "guardrail") {
    // Proxy guardrail tools (negotiate, resolve, status)
    const subAction = params?.subAction;
    const guardrailToolKey = `guardrails.${subAction}`;
    const target = registry.get(guardrailToolKey);
    if (!target) throw new Error(`Unknown guardrail subAction '${subAction}'.`);
    return target.tool.execute(toolCallId, params?.params || {}, pi);
  }


  const toolKey = params?.tool;
  const args = params?.args || {};

  if (!toolKey || typeof toolKey !== "string") {
    throw new Error(`Unsupported omnitool action '${action}' or missing params.tool. Use action: "call" with params: { tool: "module.tool", args: { ... } }`);
  }

  const target = registry.get(toolKey);
  if (!target) {
    throw new Error(`Unknown tool '${toolKey}'. Use omnitool list/search.`);
  }

  return target.tool.execute(toolCallId, args, pi);
}

export default async function (pi: ExtensionAPI) {
  await bootRegistry();
  const omnitool_debug = true;


  if (!omnitool_debug) {
      // RULE-12: Global Tool Surface Lockdown
      // On session start: inspect all registered tools via sourceInfo, verify omnitool
      // exists, audit what gets removed, then enforce surface = ["omnitool"].
      pi.on("session_start", async (_event, ctx: any) => {
        const allTools = pi.getAllTools();
        const previousActive = pi.getActiveTools();

        // Find omnitool — fail closed if not registered
        const omnitoolEntry = allTools.find((t) => t.name === "omnitool");
        if (!omnitoolEntry) {
          appendAudit(AUDIT_LOG_PATH, {
            event: "rule12_boot",
            status: "FAIL_CLOSED",
            reason: "omnitool not found in registered tools",
            registeredTools: allTools.map((t) => ({ name: t.name, source: t.sourceInfo?.source, path: t.sourceInfo?.path })),
          });
          ctx.ui.notify("🚨 RULE-12 FAIL CLOSED: 'omnitool' not registered. Surface lockdown cannot proceed.", "error");
          return;
        }

        // Identify tools being removed from the surface (for audit)
        const removedTools = allTools
          .filter((t) => t.name !== "omnitool")
          .map((t) => ({
            name: t.name,
            source: t.sourceInfo?.source,
            path: t.sourceInfo?.path,
            scope: t.sourceInfo?.scope,
            origin: t.sourceInfo?.origin,
          }));

        // Enforce lockdown
        pi.setActiveTools(["omnitool"]);

        appendAudit(AUDIT_LOG_PATH, {
          event: "rule12_boot",
          status: "PASS",
          omnitoolSource: { source: omnitoolEntry.sourceInfo?.source, path: omnitoolEntry.sourceInfo?.path },
          previousActive,
          removedFromSurface: removedTools,
          finalSurface: ["omnitool"],
        });

        ctx.ui.notify(
          `🛡️ RULE-12 Active: surface locked to [omnitool]. ${removedTools.length} tool(s) hidden.`,
          "info",
        );
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
  }

  // 2. OR: A single generic dispatcher (Recommended for debugging)
  pi.registerCommand("omni", {
      description: "omni tool proxies all other tools",
     handler: async (args, ctx) => {
     const match = args.match(/^(\S+)\s*(.*)$/);
     if (!match) throw new Error("Usage: /omni <toolName> <params>");

     if (args === "list") return ctx.ui.notify(listTools().content[0].text);
      if (args.startsWith("search")) return searchTools(args.trimPrefix("search") || "");

      if (args.startsWith("wip")) {
        const wipTool = registry.get("core.wip");
        if (!wipTool) throw new Error("core.wip unavailable");
        return wipTool.tool.execute(toolCallId, params || {}, pi);
      }

      if (args.startsWith("guardrail")) {
        // Proxy guardrail tools (negotiate, resolve, status)
        const subAction = params?.subAction;
        const guardrailToolKey = `guardrails.${subAction}`;
        const target = registry.get(guardrailToolKey);
        if (!target) throw new Error(`Unknown guardrail subAction '${subAction}'.`);
        return target.tool.execute(toolCallId, params?.params || {}, pi);
      }

     const [_, toolName, paramsRaw] = match;
     const entry = registry.get(toolName);

     if (!entry) {
       throw new Error(`Tool ${toolName} not found in registry. Usage: "/omni toolName { 'param': 'value' }"`);
     }

     try {
       const params = paramsRaw ? JSON.parse(paramsRaw) : {};
       return await entry.tool.execute("omni-cmd", params, pi);
     } catch (e: any) {
       throw new Error(`Invalid params. Ensure they are JSON. Error: ${e.message}`);
     }
    }
  });

  pi.registerCommand("omnitool-mode", {
    description: "Get or set the current omnitool operational mode",
    handler: async (args, ctx) => {
      const config = OmnitoolConfig.getInstance();
      const currentMode = config.getMode();

      if (!args || args.trim() === "") {
        const modeDescriptions: Record<string, string> = {
          [OmnitoolMode.OFF]: "OFF: Omnitool disabled (Inert).",
          [OmnitoolMode.DEBUG]: "DEBUG: Verbose registration/dispatch logs; no guardrails.",
          [OmnitoolMode.ON]: "ON: Sole proxy active; no guardrails; error-only logs.",
          [OmnitoolMode.GUARDED_DEBUG]: "GUARDED_DEBUG: Guardrails active (warn only); verbose logging.",
          [OmnitoolMode.GUARDED]: "GUARDED: Standard secure mode; blocking enabled (Default).",
          [OmnitoolMode.AFK]: "AFK: Autonomous mode; forces issue creation for blockers.",
        };
        return ctx.ui.notify(`Current Omnitool Mode: ${currentMode}\n${modeDescriptions[currentMode]}`);
      }

      const targetMode = args.trim().toUpperCase();
      if (Object.values(OmnitoolMode).includes(targetMode as OmnitoolMode)) {
        config.setMode(targetMode as OmnitoolMode);
        return ctx.ui.notify(`Omnitool mode changed to: ${targetMode}`);
      }

      const validModes = Object.values(OmnitoolMode).join(", ");
      throw new Error(`Invalid mode '${targetMode}'. Valid modes are: ${validModes}`);
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
      const config = OmnitoolConfig.getInstance();
      const action = input?.action;
      const params = input?.params ?? {};
      
      try {
        // GUARDRAIL INTERCEPTION
        if (config.isGuardrailsActive()) {
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
        } else if (config.isVerboseLogging()) {
          console.log(`[OMNITOOL-EXECUTE] Guardrails inactive (mode: ${config.getMode()}), proceeding without interception`);
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
