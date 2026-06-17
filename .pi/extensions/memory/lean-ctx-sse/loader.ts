/**
 * Project Memory: lean-ctx Implementation
 * 
 * Provides tool: project_memory-lean-ctx
 * - Takes project path
 * - Starts lean-ctx SSE server for that project
 * - Discovers and registers project-specific tools
 * 
 * First memory management module; others (e.g., project_memory-redis) possible
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// Module-level state for sharing across tool and command
let bridges: Record<string, any> = {};

/**
 * Load or connect to project memory via lean-ctx SSE.
 * Helper function for dual tool/command registration.
 */
async function projectMemory(pi: ExtensionAPI, params: { projectPath: string }) {
  const projectPath = params.projectPath;

  try {
    if (bridges[projectPath]) {
      const status = bridges[projectPath].getStatus();
      return {
        content: [
          {
            type: "text",
            text: `✓ Project memory already loaded: ${projectPath}\nTools available: ${status.toolCount}`,
          },
        ],
        details: { status: "already-loaded", projectPath, toolCount: status.toolCount, tools: status.toolNames },
      };
    }

    const { McpSseBridge } = await import("./mcp-sse-bridge");
    const bridge = new McpSseBridge(projectPath);
    await bridge.start(pi, projectPath);
    bridges[projectPath] = bridge;

    const status = bridge.getStatus();

    return {
      content: [
        {
          type: "text",
          text: `✓ Project memory loaded: ${projectPath}\nTools available: ${status.toolCount}`,
        },
      ],
      details: {
        status: "loaded",
        projectPath,
        toolCount: status.toolCount,
        tools: status.toolNames,
      },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to load project memory (${projectPath}): ${msg}`,
        },
      ],
      details: { status: "error", projectPath, error: msg },
      isError: true,
    };
  }
}

export default async function (pi: ExtensionAPI) {
  try {
    // Register as tool
    pi.registerTool({
      name: "project_memory_lean_ctx",
      label: "Project Memory (Lean-Ctx)",
      description: "Access project memory via lean-ctx.",
      parameters: Type.Object({
        projectPath: Type.String({
          description: "Path to project (e.g., ~/platform/photoframe)",
        }),
      }),
      async execute(_toolCallId: string, params: any) {
        return await projectMemory(pi, params);
      },
    });

    // Register as command
    pi.registerCommand("project_memory_lean_ctx", {
      description: "Load or connect to project memory via lean-ctx SSE",
      handler: async (args) => {
        console.log("[project_memory_lean_ctx command] Called with:", args);
        
        // Parse string args like "projectPath:~/platform/photoframe"
        let parsed: any = args;
        if (typeof args === "string") {
          parsed = {};
          args.split(" ").forEach((pair: string) => {
            const [key, val] = pair.split(":");
            if (key && val) parsed[key] = val;
          });
          console.log("[project_memory_lean_ctx command] Parsed to:", parsed);
        }
        
        console.log("[project_memory_lean_ctx command] Calling helper with:", parsed);
        return await projectMemory(pi, parsed);
      },
    });
  } catch (error) {
    console.error("[lean-ctx-sse] Failed to register:", error);
    throw error;
  }
}
