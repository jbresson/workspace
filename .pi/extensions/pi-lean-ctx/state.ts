import { McpBridge } from "./mcp-bridge.js";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { loadPiConfig } from "./config.js";

const PI_CONFIG = loadPiConfig();

export const bridgeState = {
  instance: null as McpBridge | null,
};

export function getBridge() {
  return bridgeState.instance;
}

export function initBridge(pi: any) {
  const bin = "lean-ctx"; // Simplified for state; real resolve is in index.ts
  const enableMcpBridge = PI_CONFIG.enableMcp;
  
  if (enableMcpBridge) {
    bridgeState.instance = new McpBridge(bin, PI_CONFIG.forwardedEnv, {
      disabledTools: PI_CONFIG.disabledTools,
      toolPrefix: PI_CONFIG.toolPrefix,
      localTools: new Set(), // Populated by manifest later if needed
    });
  }
  return bridgeState.instance;
}
