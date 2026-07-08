/**
 * QA Walk Extension - Main Entry Point
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerQaWalkOpenTool } from "./tool.ts";
import { registerQaWalkCommand } from "./command.ts";

/**
 * Main extension factory
 * Registers both the qa_walk_open tool and /qa_walk command
 */
export default function (pi: ExtensionAPI) {
  registerQaWalkOpenTool(pi);
  registerQaWalkCommand(pi);
  console.log("[qa-walk] Extension loaded: tool=qa_walk_open, command=/qa_walk");
}
