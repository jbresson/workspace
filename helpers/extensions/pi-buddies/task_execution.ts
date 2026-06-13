import { Type, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * TASK_EXECUTION Runner Extension
 * 
 * Provides a set of tools to delegate task phases to separate headless Pi CLI instances.
 * This allows for strategic allocation of thinking levels, model selection, and 
 * focused context windows per phase, reducing token bloat in the main session.
 */

export default function (pi: ExtensionAPI) {
  const PHASES = {
    0: { name: "Crystallization", thinking: "high", prompt: "Perform Phase 0 Crystallization. Define Success, AC, Hard Constraints, and identify False Win Risks. Initialize registries." },
    1: { name: "Ignition", thinking: "medium", prompt: "Perform Phase 1 Ignition. Establish mental model, decompose intent, map project, and warm up cache." },
    2: { name: "Cycling", thinking: "medium", prompt: "Enter Phase 2 Cycling. Iterate through Navigate -> Analyze -> Validate -> Offload until sub-tasks are complete." },
    3: { name: "Decision Sign-off", thinking: "high", prompt: "Perform Phase 3 Decision Sign-off. Audit all [IRREVERSIBLE] decisions and resolve contradictions." },
    4: { name: "Convergence Proof", thinking: "medium", prompt: "Perform Phase 4 Convergence Proof. Verify AC from Phase 0 and check against False Win risks." },
    5: { name: "Cool-Down", thinking: "low", prompt: "Perform Phase 5 Cool-Down. Consolidate knowledge to L3, generate artifact packs, and purge state." },
    6: { name: "Retrospective", thinking: "low", prompt: "Perform Phase 6 Retrospective. Audit procedure metrics (token efficiency) and record insights." },
  };

  /**
   * Core runner that executes a headless pi cli command
   */
  async function runPiPhase(phaseId: number, params: { 
    taskContext: string, 
    sessionId?: string, 
    tips?: string[] 
  }) {
    const phase = PHASES[phaseId];
    if (!phase) throw new Error(`Invalid Phase ID: ${phaseId}`);

    // Construct system prompt append
    let sysPrompt = `Goal: ${phase.prompt}\n`;
    if (params.tips && params.tips.length > 0) {
      sysPrompt += `Strategic Tips:\n- ${params.tips.join("\n- ")}\n`;
    }

    // Construct the pi cli command
    const sessionFlag = params.sessionId ? `--session ${params.sessionId}` : "--no-session";
    
    // Construct the final prompt for the headless instance
    const fullPrompt = `${phase.prompt}\n\nContext/Task:\n${params.taskContext}`;

    // Command assembly: pi [options] "[prompt]"
    // We assume 'pi' is in the path. Using --thinking to set behavior per phase.
    const cmd = `pi ${sessionFlag} --thinking ${phase.thinking} --append-system-prompt "${sysPrompt.replace(/"/g, '\\"')}" "${fullPrompt.replace(/"/g, '\\"')}"`;

    try {
      // Use async exec with a generous timeout for high-thinking phases (e.g., 5 minutes)
      const { stdout } = await execAsync(cmd, { 
        timeout: 300000, 
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for long outputs
      });
      return { 
        content: [{ type: "text", text: stdout }],
        details: { phaseId, sessionId: params.sessionId } 
      };
    } catch (e: any) {
      return { 
        content: [{ type: "text", text: `Error executing Pi CLI for Phase ${phaseId}: ${e.message}` }],
        details: { error: e.message }
      };
    }
  }

  // Register tools for each phase
  Object.entries(PHASES).forEach(([id, phase]) => {
    const phaseNum = parseInt(id);
    pi.registerTool({
      name: `task_phase${id}`,
      label: `Task Phase ${id}: ${phase.name}`,
      description: `Run Phase ${id}. See memory/mindbase/processes/TASK_EXECUTION for guidelines.`,
      parameters: {
        type: "object",
        properties: {
          taskContext: { 
            type: "string", 
            description: "The detailed context, goals, or current state of the task to be processed." 
          },
          sessionId: { 
            type: "string", 
            description: "Optional session ID to continue a previous execution of this phase." 
          },
          tips: { 
            type: "array", 
            items: { type: "string" }, 
            description: "List of strategic tips/facts to append to the system prompt to avoid redundant lookups." 
          }
        },
        required: ["taskContext"]
      },
      execute: async (_id, params) => {
        return await runPiPhase(phaseNum, params as any);
      }
    });
  });
}
