/**
 * Core Headless Pi CLI Runner
 * 
 * Extracted from buddy.ts to allow direct import by other services (e.g. Guardrails).
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export function escapeShellArg(arg: string): string {
  return `"${arg.replace(/"/g, '\\"')}"`;
}

export function buildPiCommand(params: {
  systemPrompt?: string;
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

  if (params.outputMode === "print" || params.outputMode === undefined) {
    parts.push("-p");
  } else if (params.outputMode === "json") {
    parts.push("--mode json");
  }

  if (params.provider) parts.push(`--provider ${params.provider}`);
  if (params.model) parts.push(`--model ${params.model}`);
  if (params.thinking) parts.push(`--thinking ${params.thinking}`);

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

  if (params.noSession) {
    parts.push("--no-session");
  } else if (params.session) {
    parts.push(`--session ${params.session}`);
  }

  if (params.fork) parts.push(`--fork ${params.fork}`);
  if (params.sessionName) parts.push(`--name ${escapeShellArg(params.sessionName)}`);

  if (params.noExtensions) {
    parts.push("--no-extensions");
  } else if (params.extensions && params.extensions.length > 0) {
    params.extensions.forEach((ext) => parts.push(`-e ${escapeShellArg(ext)}`));
  }

  if (params.noSkills) {
    parts.push("--no-skills");
  } else if (params.skills && params.skills.length > 0) {
    params.skills.forEach((skill) => parts.push(`--skill ${escapeShellArg(skill)}`));
  }

  if (params.noPromptTemplates) {
    parts.push("--no-prompt-templates");
  } else if (params.promptTemplates && params.promptTemplates.length > 0) {
    params.promptTemplates.forEach((pt) => parts.push(`--prompt-template ${escapeShellArg(pt)}`));
  }

  if (params.themes && params.themes.length > 0) {
    params.themes.forEach((theme) => parts.push(`--theme ${escapeShellArg(theme)}`));
  }

  if (params.noContextFiles) parts.push("--no-context-files");

  if (params.systemPrompt) {
    parts.push(`--append-system-prompt ${escapeShellArg(params.systemPrompt)}`);
  }

  parts.push(escapeShellArg(params.prompt));

  return parts.join(" ");
}

export async function runBuddy(params: {
  systemPrompt?: string;
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
    const timeoutMs = params.timeout || 300000;

    const { stdout } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 10,
    });

    return {
      content: [{ type: "text", text: stdout }],
      details: {
        systemPrompt: params.systemPrompt?.slice(0, 100),
        prompt: params.prompt.slice(0, 100),
        model: params.model || "default",
        thinking: params.thinking || "default",
        outputMode: params.outputMode || "print",
      },
    };
  } catch (e: any) {
    const errorMsg = e.stderr || e.message || String(e);
    return {
      content: [{ type: "text", text: `Error executing Pi CLI: ${errorMsg}` }],
      details: { error: errorMsg },
      isError: true,
    };
  }
}
