import * as fs from "node:fs";
import * as path from "node:path";

export interface WipIssuePayload {
  issueId: string; // local issueId, doubles as our sessionId
  sessionId?: string; // pi agent sessionId
  ticketUrl?: string; // optional remote ticket url
  timestamp?: string;
  decisionRef?: string;
  actor?: string;
}

export const validateIssueInit = (params: any): string[] => {
  const errors: string[] = [];
  if (!params.issueId) errors.push("Missing issueId");
  if (!params.summary) errors.push("Missing summary");
  if (!params.currentState) errors.push("Missing currentState");
  if (!params.targetState) errors.push("Missing targetState");
  if (!Array.isArray(params.acceptanceCriteria) || params.acceptanceCriteria.length === 0) {
    errors.push("Acceptance criteria required as a non-empty array");
  }
  if (!Array.isArray(params.evidence) || params.evidence.length === 0) {
    errors.push("Evidence array cannot be empty");
  }
  return errors;
};

export const validateIssueUpdateStatus = (params: any): string[] => {
  const errors: string[] = [];
  if (!params.issueId) errors.push("Missing issueId");
  if (!params.status) errors.push("Missing status");
  return errors;
};

export const validateIssueTransition = (params: any): string[] => {
  const errors: string[] = [];
  if (!params.issueId) errors.push("Missing issueId");
  if (!params.fromStatus) errors.push("Missing fromStatus");
  if (!params.toStatus) errors.push("Missing toStatus");
  return errors;
};

