import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { runBuddy } from "./runner";

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

/**
 * Core runner that executes a headless pi cli command
 * Now delegated to runner.ts
 */
async function runBuddyWrapper(params: any) {
  return runBuddy(params);
}

export default function (pi: ExtensionAPI) {

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
      return runBuddyWrapper(params);
    },
  });

  // Register as command
  pi.registerCommand("buddy", {
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
      const result = await runBuddyWrapper(args);
      // Extract text from result for notification if desired
      const text = result.content[0]?.text;
      return result;
    },
  });
}
