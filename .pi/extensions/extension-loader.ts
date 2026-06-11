/**
 * Extension Loader (Auto-Discovery + Selective Tool Loading)
 * 
 * Features:
 * - Auto-discovers extensions in helpers/extensions/
 * - Loads entire extension or single tools from it
 * - Backward compatible with simple default exports
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSIONS_DIR = path.resolve(__dirname, "../../helpers/extensions");

interface ExtensionToolDefinition {
  name: string;
  description?: string;
  parameters?: any;
  execute: (toolCallId: string, params: any, ...args: any[]) => Promise<any>;
}

interface ExtensionManifest {
  id: string;
  description?: string;
  tools: Record<string, ExtensionToolDefinition>;
  onLoad?: (pi: ExtensionAPI) => Promise<void>;
}

type ExtensionExport =
  | ((pi: ExtensionAPI) => Promise<void> | void) // Legacy: simple function
  | ExtensionManifest; // New: manifest with tools registry

// State
const LOADED_MODULES: Record<string, Set<string>> = {}; // module -> loaded tool names
const MODULE_CACHE: Record<string, ExtensionExport> = {};
const MANIFESTS: Record<string, ExtensionManifest> = {};
const REGISTERED_TOOLS: Set<string> = new Set(); // Global tool registry

/**
 * Discover all extension modules by scanning helpers/extensions/ directory
 */
async function discoverExtensions(): Promise<Record<string, ExtensionExport>> {
  const extensions: Record<string, ExtensionExport> = {};

  if (!fs.existsSync(EXTENSIONS_DIR)) {
    console.warn(`[extension-loader] Extensions directory not found: ${EXTENSIONS_DIR}`);
    return extensions;
  }

  const entries = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const moduleId = entry.name;
    const modulePath = path.join(EXTENSIONS_DIR, moduleId);

    // Look for entry points in order: loader.ts, index.ts, named.ts, first .ts
    const candidates = [
      path.join(modulePath, "loader.ts"),
      path.join(modulePath, "index.ts"),
      path.join(modulePath, `${moduleId}.ts`),
    ];

    let resolvedPath: string | null = null;
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        resolvedPath = candidate;
        break;
      }
    }

    if (!resolvedPath) {
      const allFiles = fs
        .readdirSync(modulePath)
        .filter((f) => f.endsWith(".ts") && !["types.ts", "config.ts"].includes(f));
      if (allFiles.length > 0) {
        resolvedPath = path.join(modulePath, allFiles[0]);
      }
    }

    if (!resolvedPath) {
      console.warn(`[extension-loader] No entry point found for extension: ${moduleId}`);
      continue;
    }

    try {
      const mod = await import(`file://${resolvedPath}`);
      
      // Try to get manifest first (new pattern), then default (both patterns), then namespace (direct export)
      let exported: ExtensionExport | undefined;
      if (mod.manifest) exported = mod.manifest;
      else if (mod.default) exported = mod.default;
      else exported = mod as any;

      if (!exported || (typeof exported !== "function" && typeof exported !== "object")) {
        console.warn(
          `[extension-loader] Extension '${moduleId}' must export a function or manifest object`
        );
        continue;
      }

      extensions[moduleId] = exported;
      MODULE_CACHE[moduleId] = exported;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[extension-loader] Failed to discover extension '${moduleId}': ${msg}`);
    }
  }

  return extensions;
}

/**
 * Convert any export to manifest for uniform handling.
 * Detects: new manifest pattern, legacy function, or hybrid exports.
 */
function ensureManifest(moduleId: string, exported: ExtensionExport): ExtensionManifest | null {
  // New pattern: direct manifest object with `tools` and `id`
  if (exported && typeof exported === "object" && "tools" in exported) {
    return exported as ExtensionManifest;
  }

  // Hybrid: module.manifest export
  if (exported && typeof exported === "object" && "manifest" in exported) {
    const exp = exported as any;
    if (exp.manifest && typeof exp.manifest === "object" && "tools" in exp.manifest) {
      return exp.manifest as ExtensionManifest;
    }
  }

  // Legacy pattern: simple function - create wrapper
  if (typeof exported === "function") {
    return {
      id: moduleId,
      tools: {},
      onLoad: exported,
    };
  }

  return null;
}

/**
 * Register a single tool from a manifest
 */
function registerTool(pi: ExtensionAPI, moduleId: string, toolDef: ExtensionToolDefinition) {
  const toolName = toolDef.name.replace(/-/g, "_"); // Normalize underscores but NO prefix

  if (REGISTERED_TOOLS.has(toolName)) {
    throw new Error(`Duplicate tool name '${toolName}' from module '${moduleId}'. Tool already registered.`);
  }

  pi.registerTool({
    name: toolName,
    label: toolDef.description || toolDef.name,
    description: toolDef.description,
    parameters: toolDef.parameters || Type.Object({}),
    async execute(toolCallId, params) {
      return toolDef.execute(toolCallId, params, pi);
    },
  });

  REGISTERED_TOOLS.add(toolName);
}

export default function (pi: ExtensionAPI) {
  let availableExtensions: Record<string, ExtensionExport> = {};

  pi.registerTool({
    name: "load_helper_extension",
    description:
      "Dynamically load tools from extensions in helpers/extensions/. Load entire extension or specific tools.",
    parameters: Type.Object({
      module: Type.String({
        description: "Extension module name (directory in helpers/extensions/)",
      }),
      tool: Type.Optional(
        Type.String({
          description: "Optional: specific tool name to load. Omit to load all.",
        })
      ),
    }),
    async execute(_toolCallId, params) {
      // Lazy-discover on first use
      if (Object.keys(availableExtensions).length === 0) {
        availableExtensions = await discoverExtensions();
      }

      const { module, tool } = params;

      // Handle listing
      if (module === "list" || !module) {
        const available = Object.keys(availableExtensions);
        const manifests = await Promise.all(
          available.map(async (id) => {
            const exp = availableExtensions[id];
            const mf = ensureManifest(id, exp);
            return { id, manifest: mf };
          })
        );

        const lines = manifests
          .map(({ id, manifest: mf }) => {
            if (!mf) return `  ❌ ${id} (invalid)`;
            const toolList = Object.keys(mf.tools).length > 0
              ? ` [${Object.keys(mf.tools).join(", ")}]`
              : "";
            const loaded = LOADED_MODULES[id] ? ` (${Array.from(LOADED_MODULES[id]).join(", ")} loaded)` : "";
            return `  - ${id}${toolList}${loaded}`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: available.length > 0
                ? `Available extensions:\n${lines}`
                : "No extensions found in helpers/extensions/",
            },
          ],
          details: { available, count: available.length },
        };
      }

      // Resolve module
      const exported = availableExtensions[module];
      if (!exported) {
        const available = Object.keys(availableExtensions);
        return {
          content: [
            {
              type: "text",
              text: `❌ Unknown extension: ${module}\nAvailable: ${available.join(", ") || "none"}`,
            },
          ],
          details: { status: "not-found", module },
          isError: true,
        };
      }

      const manifest = ensureManifest(module, exported);
      if (!manifest) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Extension '${module}' has invalid structure`,
            },
          ],
          details: { module, status: "invalid" },
          isError: true,
        };
      }

      MANIFESTS[module] = manifest;

      // Track loaded tools
      if (!LOADED_MODULES[module]) {
        LOADED_MODULES[module] = new Set();
      }

      try {
        if (tool) {
          // Load specific tool
          const toolDef = manifest.tools[tool];
          if (!toolDef) {
            const available = Object.keys(manifest.tools);
            return {
              content: [
                {
                  type: "text",
                  text: `❌ Tool not found: ${module}.${tool}\nAvailable: ${available.join(", ") || "none"}`,
                },
              ],
              details: { module, tool, status: "not-found" },
              isError: true,
            };
          }

          if (LOADED_MODULES[module].has(tool)) {
            return {
              content: [
                {
                  type: "text",
                  text: `ℹ️  Tool already loaded: ${module}.${tool}`,
                },
              ],
              details: { module, tool, status: "already-loaded" },
            };
          }

          registerTool(pi, module, toolDef);
          LOADED_MODULES[module].add(tool);

          return {
            content: [
              {
                type: "text",
                text: `✓ Loaded tool: ${module}.${tool}`,
              },
            ],
            details: { module, tool, status: "loaded" },
          };
        } else {
          // Load entire extension
          // First run onLoad hook if exists (legacy pattern)
          if (manifest.onLoad) {
            // onLoad is a legacy function that registers tools via pi.registerTool
            await manifest.onLoad(pi);
          }

          // Then register all tools from manifest registry
          for (const [toolName, toolDef] of Object.entries(manifest.tools)) {
            if (!LOADED_MODULES[module].has(toolName)) {
              registerTool(pi, module, toolDef);
              LOADED_MODULES[module].add(toolName);
            }
          }

          const toolCount = LOADED_MODULES[module].size;
          return {
            content: [
              {
                type: "text",
                text: `✓ Loaded extension: ${module} (${toolCount} tool${toolCount !== 1 ? "s" : ""})`,
              },
            ],
            details: {
              module,
              status: "loaded",
              toolsLoaded: Array.from(LOADED_MODULES[module]),
            },
          };
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to load extension '${module}': ${msg}`,
            },
          ],
          details: { module, status: "error", error: msg },
          isError: true,
        };
      }
    },
  });
}
