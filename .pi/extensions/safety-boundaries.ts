import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

interface SafetyConfig {
  globalEnabled: boolean;
  rules: {
    pathProtection: {
      enabled: boolean;
      bannedPaths: string[];
      level: "hard" | "warn";
    };
    contentFiltering: {
      enabled: boolean;
      patterns: Array<{
        name: string;
        regex: string;
        level: "hard" | "warn";
      }>;
    };
  };
}

export default function (pi: ExtensionAPI) {
  const CONFIG_PATH = path.resolve(process.cwd(), ".pi/settings/safety_rules.json");
  const LOG_PATH = path.resolve(process.cwd(), ".pi/safety_violations.log");

  function loadConfig(): SafetyConfig {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      }
    } catch (e) {
      console.error("[safety-boundaries] Failed to load config:", e);
    }
    return {
      globalEnabled: true,
      rules: {
        pathProtection: { enabled: true, bannedPaths: [], level: "hard" },
        contentFiltering: { enabled: true, patterns: [] },
      },
    };
  }

  function logViolation(tool: string, input: any, rule: string, level: string) {
    const entry = `[${new Date().toISOString()}] TOOL:${tool} RULE:${rule} LEVEL:${level} INPUT:${JSON.stringify(input)}\n`;
    fs.appendFileSync(LOG_PATH, entry);
  }

  // --- COMMANDS ---
  pi.registerCommand("safety:on", {
    description: "Enable safety boundaries",
    handler: async (_args, ctx) => {
      pi.appendEntry("safety_state", { enabled: true });
      ctx.ui.notify("Safety boundaries ENABLED", "success");
    },
  });

  pi.registerCommand("safety:off", {
    description: "Disable safety boundaries for this session",
    handler: async (_args, ctx) => {
      pi.appendEntry("safety_state", { enabled: false });
      ctx.ui.notify("Safety boundaries DISABLED for this session", "warning");
    },
  });

  // --- EVENT HOOK ---
  pi.on("tool_call", async (event, ctx) => {
    // 1. Check session override
    const sessionState = ctx.sessionManager.getEntries()
      .filter(e => e.type === "custom" && e.customType === "safety_state")
      .pop();
    
    const isSessionDisabled = sessionState?.data?.enabled === false;
    const config = loadConfig();

    if (!config.globalEnabled || isSessionDisabled) return;

    // 2. Target tools that modify state
    if (event.toolName === "write" || event.toolName === "edit") {
      const inputPath = event.input.path;
      let absolutePath: string;
      
      try {
        absolutePath = fs.existsSync(inputPath) 
          ? fs.realpathSync(path.resolve(ctx.cwd, inputPath))
          : path.resolve(ctx.cwd, inputPath);
      } catch (e) {
        absolutePath = path.resolve(ctx.cwd, inputPath);
      }

      // Rule A: Path Protection
      if (config.rules.pathProtection.enabled) {
        const isBanned = config.rules.pathProtection.bannedPaths.some(banned => 
          absolutePath.includes(path.resolve(ctx.cwd, banned))
        );

        if (isBanned) {
          logViolation(event.toolName, { path: absolutePath }, "PathProtection", config.rules.pathProtection.level);
          if (config.rules.pathProtection.level === "hard") {
            return { block: true, reason: `Write access to ${inputPath} is banned.` };
          } else {
            ctx.ui.notify(`Warning: Writing to protected path ${inputPath}`, "warning");
          }
        }
      }

      // Rule B: Content Filtering
      if (config.rules.contentFiltering.enabled) {
        const content = event.toolName === "write" 
          ? event.input.text 
          : JSON.stringify(event.input.edits);

        for (const pattern of config.rules.contentFiltering.patterns) {
          const regex = new RegExp(pattern.regex, "m");
          if (regex.test(content)) {
            logViolation(event.toolName, { path: absolutePath }, pattern.name, pattern.level);
            if (pattern.level === "hard") {
              return { block: true, reason: `Content violation: ${pattern.name}` };
            } else {
              ctx.ui.notify(`Warning: Content matches rule ${pattern.name}`, "warning");
            }
          }
        }
      }
    }
  });
}
