/**
 * task_buddy.ts
 *
 * Keep Task Agent. Handles !task checklist notes.
 * Full tool access — executes tasks as direct pi agent prompts.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { runBuddy } from "./runner";
import { applyInferenceProfile } from "./utils";

const SYSTEM_PROMPT = `\
You are a capable engineering agent executing a concrete task on behalf of a user.

MISSION:
Execute the given task completely and correctly. You have full tool access.
Do the work — do not just describe what you would do. Verify your output.

OUTPUT:
Produce a clear summary of:
1. What was done (concrete actions taken)
2. What changed (files modified, commands run, outputs)
3. Any issues or caveats
4. Recommended follow-up (if applicable)
`;

export default function (pi: ExtensionAPI) {
  pi.registerFlag("inference-profile", {
    description: "JSON object of inference parameters",
    type: "string",
    default: "{}",
  });

  pi.registerFlag("task-working-dir", {
    description: "Working directory for task execution",
    type: "string",
    default: process.env.HOME ?? "~",
  });

  // Outer session: only the task tool
  pi.on("session_start", () => { pi.setActiveTools(["keep_task"]); });

  pi.on("before_agent_start", () => ({
    systemPrompt:
      "You have exactly one task: call the keep_task tool with the task " +
      "provided by the user. Call it immediately.",
  }));

  pi.on("before_provider_request", (event) => {
    applyInferenceProfile(pi, event.payload);
  });

  pi.registerTool({
    name: "keep_task",
    label: "Keep: Execute Task",
    description:
      "Execute a task with full tool access (bash, read, write, edit, etc.). " +
      "Treats the input as a direct pi agent prompt.",
    parameters: Type.Object({
      task: Type.String({ description: "The task to execute." }),
      sessionName: Type.Optional(
        Type.String({ description: "Optional session name to persist this task's history." })
      ),
    }),
    async execute(_id, params) {
      const workingDir = pi.getFlag("task-working-dir") as string;

      return runBuddy({
        systemPrompt: SYSTEM_PROMPT,
        prompt: params.task,
        noSession: !params.sessionName,
        sessionName: params.sessionName,
        noContextFiles: true,
        thinking: "medium",
        // Full tool access for task execution
        // No tool restriction — tasks need whatever the job requires
        timeout: 600_000,
      });
    },
  });
}


