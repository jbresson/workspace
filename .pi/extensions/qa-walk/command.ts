/**
 * QA Walk Extension - Command Handler (/qa_walk)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { parseQuestionsHeuristic, structureQuestionsViaAgent } from "./parser.ts";
import { createWalk, setActiveWalk, getActiveWalk } from "./state.ts";

export function registerQaWalkCommand(pi: ExtensionAPI) {
  pi.registerCommand("qa_walk", {
    description: "Start questionnaire walk from message or file",
    handler: async (args: string) => {
      // Handle different input modes
      if (!args || args.trim() === "") {
        // Mode 1: Extract from last agent message
        return await handleLastMessage(pi);
      }

      if (args.startsWith("--resume")) {
        // Mode 2: Resume saved session
        const sessionId = args.split(/\s+/)[1];
        return await handleResume(sessionId);
      }

      // Mode 3: Parse file
      return await handleFile(args.trim(), pi);
    },
  });
}

async function handleLastMessage(pi: ExtensionAPI): Promise<any> {
  // Get last message from conversation (would be provided by Pi)
  // For MVP, return placeholder
  return {
    content: [
      {
        type: "text" as const,
        text: "No agent message found. Use `/qa_walk <filepath>` or provide a file path.",
      },
    ],
  };
}

async function handleResume(sessionId: string): Promise<any> {
  // Load checkpoint (MVP: not implemented)
  return {
    content: [
      {
        type: "text" as const,
        text: `Resume feature not yet implemented for session: ${sessionId}`,
      },
    ],
  };
}

async function handleFile(filePath: string, pi: ExtensionAPI): Promise<any> {
  try {
    // Check file exists
    if (!fs.existsSync(filePath)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: File not found: ${filePath}`,
          },
        ],
      };
    }

    // Read file
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").length;

    if (lines > 1000) {
      console.log("[qa-walk] Large file detected, parsing may take time");
    }

    // Try heuristic parse
    let parseResult = parseQuestionsHeuristic(content);

    // If heuristic fails, try LLM
    if (!parseResult.success) {
      parseResult = await structureQuestionsViaAgent(content, pi as any);
    }

    if (!parseResult.success) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${parseResult.error || "Could not parse questions"}`,
          },
        ],
      };
    }

    // Create walk and set as active
    const walk = createWalk(parseResult.questions, {
      title: `QA Walk: ${path.basename(filePath)}`,
    });
    setActiveWalk(walk);

    return {
      content: [
        {
          type: "text" as const,
          text: `Parsed ${parseResult.questions.length} questions from ${path.basename(filePath)}. Use qa_walk_open tool to begin.`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text" as const,
          text: `Error reading file: ${message}`,
        },
      ],
    };
  }
}
