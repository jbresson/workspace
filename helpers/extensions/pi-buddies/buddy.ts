/**
 * Generic Headless Pi Buddy Extension
 * 
 * A 100% customizable headless Pi CLI runner.
 * Accepts system prompt + user prompt as required params.
 * Exposes optional Pi CLI options for model selection, thinking level, tools, 
 * session management, resource control, and more.
 * 
 * Use cases:
 * - Specialized reasoning tasks with custom system prompts
 * - Tool-restricted sub-agents (read-only, no-bash, etc.)
 * - Model/thinking level swapping per task phase
 * - Session-isolated experiments or continuations
 * - Output mode switching (print vs JSON)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Helper to escape shell arguments safely
 */
function escapeShellArg(arg: string): string {
  return `"${arg.replace(/"/g, '\\"')}"`;
}

/**
 * Build a pi CLI command from options
 */
function buildPiCommand(params: {
  systemPrompt: string;
  prompt: string;
  provider?: string;
  model?: string;
  thinking?: string;
  tools?: string[];
  excludeTools?: string[];
  noBuiltinTools?: boolean;
  noTools?: boolean;
  session?: string;
  noSession?: boolean;
  sessionName?: string;
  fork?: string;
  extensions?: string[];
  noExtensions?: boolean;
  skills?: string[];
  noSkills?: boolean;
  promptTemplates?: string[];
  noPromptTemplates?: boolean;
  themes?: string[];
  noThemes?: boolean;
  noContextFiles?: boolean;
  outputMode?: "print" | "json";
  timeout?: number;
}): string {
  const parts: string[] = ["pi"];

  // Output mode: default to print, use -p flag
  if (params.outputMode === "print" || params.outputMode === undefined) {
    parts.push("-p");
  } else if (params.outputMode === "json") {
    parts.push("--mode json");
  }

  // Model options
  if (params.provider) {
    parts.push(`--provider ${params.provider}`);
  }
  if (params.model) {
    parts.push(`--model ${params.model}`);
  }
  if (params.thinking) {
    parts.push(`--thinking ${params.thinking}`);
  }

  // Tool options
  if (params.noTools) {
    parts.push("--no-tools");
  } else if (params.noBuiltinTools) {
    parts.push("--no-builtin-tools");
  }

  if (params.tools && params.tools.length > 0) {
    parts.push(`--tools ${params.tools.join(",")}`);
  }

  if (params.excludeTools && params.excludeTools.length > 0) {
    parts.push(`--exclude-tools ${params.excludeTools.join(",")}`);
  }

  // Session options
  if (params.noSession) {
    parts.push("--no-session");
  } else if (params.session) {
    parts.push(`--session ${params.session}`);
  }

  if (params.fork) {
    parts.push(`--fork ${params.fork}`);
  }

  if (params.sessionName) {
    parts.push(`--name ${escapeShellArg(params.sessionName)}`);
  }

  // Resource options
  if (params.noExtensions) {
    parts.push("--no-extensions");
  } else if (params.extensions && params.extensions.length > 0) {
    params.extensions.forEach((ext) => {
      parts.push(`-e ${escapeShellArg(ext)}`);
    });
  }

  if (params.noSkills) {
    parts.push("--no-skills");
  } else if (params.skills && params.skills.length > 0) {
    params.skills.forEach((skill) => {
      parts.push(`--skill ${escapeShellArg(skill)}`);
    });
  }

  if (params.noPromptTemplates) {
    parts.push("--no-prompt-templates");
  } else if (params.promptTemplates && params.promptTemplates.length > 0) {
    params.promptTemplates.forEach((pt) => {
      parts.push(`--prompt-template ${escapeShellArg(pt)}`);
    });
  }

  if (params.themes && params.themes.length > 0) {
    params.themes.forEach((theme) => {
      parts.push(`--theme ${escapeShellArg(theme)}`);
    });
  }

  if (params.noContextFiles) {
    parts.push("--no-context-files");
  }

  // System prompt (append to avoid replacing default if needed for specific context)
  if (params.systemPrompt) {
    parts.push(`--append-system-prompt ${escapeShellArg(params.systemPrompt)}`);
  }

  // User prompt (the main query)
  parts.push(escapeShellArg(params.prompt));

  return parts.join(" ");
}

/**
 * Core runner that executes a headless pi cli command
 */
async function runBuddy(params: {
  systemPrompt: string;
  prompt: string;
  provider?: string;
  model?: string;
  thinking?: string;
  tools?: string[];
  excludeTools?: string[];
  noBuiltinTools?: boolean;
  noTools?: boolean;
  session?: string;
  noSession?: boolean;
  sessionName?: string;
  fork?: string;
  extensions?: string[];
  noExtensions?: boolean;
  skills?: string[];
  noSkills?: boolean;
  promptTemplates?: string[];
  noPromptTemplates?: boolean;
  themes?: string[];
  noThemes?: boolean;
  noContextFiles?: boolean;
  outputMode?: "print" | "json";
  timeout?: number;
}) {
  try {
    const cmd = buildPiCommand(params);
    const timeoutMs = params.timeout || 300000; // Default 5 minutes

    const { stdout } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });

    return {
      content: [{ type: "text", text: stdout }],
      details: {
        systemPrompt: params.systemPrompt.slice(0, 100),
        prompt: params.prompt.slice(0, 100),
        model: params.model || "default",
        thinking: params.thinking || "default",
        outputMode: params.outputMode || "print",
      },
    };
  } catch (e: any) {
    const errorMsg =
      e.stderr || e.message || String(e);
    return {
      content: [
        {
          type: "text",
          text: `Error executing Pi CLI: ${errorMsg}`,
        },
      ],
      details: { error: errorMsg },
      isError: true,
    };
  }
}

export default function (pi: ExtensionAPI) {
  // Schema for common parameters
  const systemPromptParam = Type.String({
    description:
      "System prompt to shape behavior (appended to default system prompt)",
  });

  const promptParam = Type.String({
    description: "The user prompt / query to send to the Pi instance",
  });

  const modelOptions = {
    provider: Type.Optional(
      Type.String({
        description: "LLM provider (anthropic, openai, google, etc.)",
      })
    ),
    model: Type.Optional(
      Type.String({
        description:
          "Model name or pattern (e.g., claude-opus, gpt-4o, provider/model-name)",
      })
    ),
    thinking: Type.Optional(
      Type.String({
        description:
          "Thinking level: off, minimal, low, medium, high, xhigh",
        enum: ["off", "minimal", "low", "medium", "high", "xhigh"],
      })
    ),
  };

  const toolOptions = {
    tools: Type.Optional(
      Type.Array(Type.String(), {
        description:
          "Allowlist of tool names to enable (read, write, edit, bash, grep, find, ls, etc.)",
      })
    ),
    excludeTools: Type.Optional(
      Type.Array(Type.String(), {
        description: "Blacklist of tool names to disable",
      })
    ),
    noBuiltinTools: Type.Optional(
      Type.Boolean({
        description:
          "Disable built-in tools but keep extension/custom tools",
      })
    ),
    noTools: Type.Optional(
      Type.Boolean({
        description: "Disable all tools (no tool calls allowed)",
      })
    ),
  };

  const sessionOptions = {
    session: Type.Optional(
      Type.String({
        description: "Session file path or partial UUID to resume",
      })
    ),
    noSession: Type.Optional(
      Type.Boolean({
        description: "Ephemeral mode: don't save session",
      })
    ),
    sessionName: Type.Optional(
      Type.String({
        description: "Display name for this session",
      })
    ),
    fork: Type.Optional(
      Type.String({
        description: "Fork from existing session file or UUID",
      })
    ),
  };

  const resourceOptions = {
    extensions: Type.Optional(
      Type.Array(Type.String(), {
        description:
          "Custom extensions to load (paths or npm:pkg/git:host/user/repo)",
      })
    ),
    noExtensions: Type.Optional(
      Type.Boolean({
        description: "Disable extension discovery",
      })
    ),
    skills: Type.Optional(
      Type.Array(Type.String(), {
        description: "Skill files to load",
      })
    ),
    noSkills: Type.Optional(
      Type.Boolean({
        description: "Disable skill discovery",
      })
    ),
    promptTemplates: Type.Optional(
      Type.Array(Type.String(), {
        description: "Prompt template files to load",
      })
    ),
    noPromptTemplates: Type.Optional(
      Type.Boolean({
        description: "Disable prompt template discovery",
      })
    ),
    themes: Type.Optional(
      Type.Array(Type.String(), {
        description: "Theme files to load",
      })
    ),
    noContextFiles: Type.Optional(
      Type.Boolean({
        description: "Disable AGENTS.md/CLAUDE.md discovery",
      })
    ),
  };

  const outputOptions = {
    outputMode: Type.Optional(
      Type.String({
        description: 'Output mode: "print" (default) or "json"',
        enum: ["print", "json"],
      })
    ),
    timeout: Type.Optional(
      Type.Number({
        description: "Command timeout in milliseconds (default: 300000 / 5min)",
      })
    ),
  };

  const fullParameters = Type.Object({
    systemPrompt: systemPromptParam,
    prompt: promptParam,
    ...modelOptions,
    ...toolOptions,
    ...sessionOptions,
    ...resourceOptions,
    ...outputOptions,
  });

  // Register as tool
  pi.registerTool({
    name: "run_buddy",
    label: "Run Custom Pi Buddy",
    description:
      "Run a headless Pi buddy. See memory/mindbase/skills/buddy for usage.",
    parameters: fullParameters,
    async execute(_toolCallId, params) {
      return runBuddy(params as any);
    },
  });

  // Register as command
  pi.registerCommand("/buddy", {
    description: "Run a headless Pi buddy with custom system prompt and reasoning",
    handler: async (args) => {
      // Validate required params in command context
      if (!args.systemPrompt) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Missing required parameter: systemPrompt",
            },
          ],
          isError: true,
        };
      }
      if (!args.prompt) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Missing required parameter: prompt",
            },
          ],
          isError: true,
        };
      }
      const result = await runBuddy(args);
      // Extract text from result for notification if desired
      const text = result.content[0]?.text;
      return result;
    },
  });
}
