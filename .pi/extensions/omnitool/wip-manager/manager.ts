import * as fs from "node:fs";
import * as path from "node:path";
import { Type } from "@sinclair/typebox";
import { value } from "@sinclair/typebox/value";
import { 
  IssueInitSchema, 
  IssueUpdateStatusSchema, 
  IssueTransitionSchema 
} from "./schemas";

export async function executeWipSubAction(
  wipRoot: string,
  params: any
) {
  const { subAction } = params;

  if (subAction === "issues.init") {
    if (!value(IssueInitSchema).Check(params)) {
      throw new Error(`Invalid payload for issues.init: ${JSON.stringify(value(IssueInitSchema).Errors(params))}`);
    }
    const ticketDir = path.join(wipRoot, params.ticketId);
    if (fs.existsSync(ticketDir)) throw new Error(`WIP ticket already exists: ${params.ticketId}`);

    fs.mkdirSync(ticketDir, { recursive: true });
    fs.mkdirSync(path.join(ticketDir, ".archives"), { recursive: true });

    const rootBuddy = [
      "STATUS: OPEN",
      "# TICKET LEDGER",
      "",
      `TICKET-ID: ${params.ticketId}`,
      `ISSUE-ID: ${params.issueId}`,
      `GOAL: ${params.summary}`,
      "",
      "## REPOS",
    ].join("\n");

    fs.writeFileSync(path.join(ticketDir, "BUDDY.md"), rootBuddy);
    fs.writeFileSync(path.join(ticketDir, "tool_call.json"), "[]\n");

    return { content: [{ type: "text", text: `Issue ${params.issueId} initialized in ticket ${params.ticketId}` }] };
  }

  if (subAction === "issues.update_status") {
    if (!value(IssueUpdateStatusSchema).Check(params)) {
      throw new Error(`Invalid payload for issues.update_status`);
    }
    const ticketDir = path.join(wipRoot, params.ticketId);
    if (!fs.existsSync(ticketDir)) throw new Error(`WIP ticket not found: ${params.ticketId}`);

    const logPath = path.join(ticketDir, "status_log.jsonl");
    const entry = JSON.stringify({ timestamp: new Date().toISOString(), ...params }) + "\n";
    fs.appendFileSync(logPath, entry);

    return { content: [{ type: "text", text: `Status updated to ${params.status} for ${params.issueId}` }] };
  }

  if (subAction === "issues.transition") {
    if (!value(IssueTransitionSchema).Check(params)) {
      throw new Error(`Invalid payload for issues.transition`);
    }
    const ticketDir = path.join(wipRoot, params.ticketId);
    if (!fs.existsSync(ticketDir)) throw new Error(`WIP ticket not found: ${params.ticketId}`);

    const transitionLog = path.join(ticketDir, "transitions.jsonl");
    const entry = JSON.stringify({ timestamp: new Date().toISOString(), ...params }) + "\n";
    fs.appendFileSync(transitionLog, entry);

    return { content: [{ type: "text", text: `Transitioned ${params.issueId} from ${params.fromStatus} to ${params.toStatus}` }] };
  }

  // Legacy / Fallback for basic WIP ops
  if (subAction === "init") {
     // ... (existing init logic can be ported or kept as legacy)
     return { content: [{ type: "text", text: "Legacy init handled" }] };
  }

  throw new Error(`Unknown wip subAction: ${subAction}`);
}
