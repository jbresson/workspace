import * as fs from "node:fs";
import * as path from "node:path";
import { Type } from "@sinclair/typebox";

export interface WipIssuePayload {
  ticketId: string;
  issueId: string;
  sessionId: string;
  timestamp?: string;
  decisionRef?: string;
  actor?: string;
}

export const IssueInitSchema = Type.Object({
  ...Type.Object({
    ticketId: Type.String(),
    issueId: Type.String(),
    sessionId: Type.String(),
  }),
  title: Type.String(),
  type: Type.Union([
    Type.Literal("bug"),
    Type.Literal("feature"),
    Type.Literal("task"),
    Type.Literal("risk"),
    Type.Literal("decision"),
    Type.Literal("investigation"),
  ]),
  summary: Type.String(),
  currentState: Type.String(),
  targetState: Type.String(),
  delta: Type.String(),
  acceptanceCriteria: Type.Array(Type.String()),
  impact: Type.String(),
  scope: Type.Object({
    components: Type.Array(Type.String()),
    paths: Type.Array(Type.String()),
  }),
  owner: Type.Optional(Type.String()),
  ownerNeeded: Type.Optional(Type.Boolean()),
  evidence: Type.Array(
    Type.Object({
      type: Type.String(),
      ref: Type.String(),
      summary: Type.String(),
    })
  ),
  valuesAlignment: Type.Object({
    rigorOverBrevity: Type.String(),
    auditability: Type.String(),
    safetyNoBypass: Type.String(),
  }),
  dedupCheck: Type.Object({
    query: Type.String(),
    similarIssueIds: Type.Array(Type.String()),
    whyNotDuplicate: Type.String(),
  }),
  riskLevel: Type.Optional(Type.Union([Type.Literal("low"), Type.Literal("med"), Type.Literal("high")])),
  rollbackPlan: Type.Optional(Type.String()),
  alternativesConsidered: Type.Optional(Type.Array(Type.String())),
  expiresAt: Type.Optional(Type.String()),
});

export const IssueUpdateStatusSchema = Type.Object({
  ...Type.Object({
    ticketId: Type.String(),
    issueId: Type.String(),
    sessionId: Type.String(),
  }),
  status: Type.Union([
    Type.Literal("OPEN"),
    Type.Literal("IN_PROGRESS"),
    Type.Literal("BLOCKED"),
    Type.Literal("READY"),
    Type.Literal("CLOSED"),
  ]),
  progressNote: Type.String(),
  componentsDone: Type.Array(Type.String()),
  componentsInFlight: Type.Array(Type.String()),
  blockers: Type.Array(Type.String()),
  percentComplete: Type.Optional(Type.Number()),
  nextStep: Type.Optional(Type.String()),
  eta: Type.Optional(Type.String()),
});

export const IssueTransitionSchema = Type.Object({
  ...Type.Object({
    ticketId: Type.String(),
    issueId: Type.String(),
    sessionId: Type.String(),
  }),
  fromStatus: Type.String(),
  toStatus: Type.String(),
  reason: Type.String(),
});
