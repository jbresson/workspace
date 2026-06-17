import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendAudit,
  buildRegistryFromExtensions,
  executeWipSubAction,
  type RegistryEntry,
} from "./subroutines/omnitool";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSIONS_DIR = path.resolve(__dirname, "./"); // .pi/extensions is home
const WIP_ROOT = path.resolve(__dirname, "../../wip");
const AUDIT_LOG_PATH = path.resolve(__dirname, "../logs/tool_call.json");

const FACILITATION_ACTIONS = new Set(["call", "list", "search", "wip"]);
let registry = new Map<string, RegistryEntry>();
let registryLocked = false;

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

async function dispatch(action: string, params: any, pi: ExtensionAPI, toolCallId: string) {
  if (!FACILITATION_ACTIONS.has(action)) {
    throw new Error(`Unsupported omnitool action '${action}'. Use one of: call, list, search, wip`);
  }

  if (action === "list") return listTools();
  if (action === "search") return searchTools(params?.query || "");

  if (action === "wip") {
    // explicit proxy path, no alias magic
    const wipTool = registry.get("core.wip");
    if (!wipTool) throw new Error("core.wip unavailable");
    return wipTool.execute(toolCallId, params || {}, pi);
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

export default async function (pi: ExtensionAPI) {
  await bootRegistry();

  pi.registerTool({
    name: "omnitool",
    description: "Single proxy for all tool calls. Use actions: call/list/search/wip.",
    parameters: Type.Object({
      action: Type.String({ description: "call | list | search | wip" }),
      params: Type.Optional(Type.Any()),
    }),
    async execute(toolCallId, input) {
      const action = input?.action;
      const params = input?.params ?? {};
      try {
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
