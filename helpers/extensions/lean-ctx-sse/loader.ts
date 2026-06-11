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

let bridges: Record<string, any> = {};

export default async function (pi: ExtensionAPI) {
  try {
    const { Type } = await import("@sinclair/typebox");
    const { McpSseBridge } = await import("./mcp-sse-bridge");

    pi.registerTool({
      name: "project_memory_lean_ctx",
      description: "Access project memory via lean-ctx.",
      parameters: Type.Object({
        projectPath: Type.String({
          description: "Path to project (e.g., ~/platform/photoframe)",
        }),
      }),
      async execute(_toolCallId: string, params: any) {
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

          const bridge = new McpSseBridge(projectPath);
          await bridge.start(pi);
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
      },
    });
  } catch (error) {
    throw error;
  }
}
