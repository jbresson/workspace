/**
 * QA Walk Extension - State Management
 */

import type { Question, Metadata, WalkState } from "./types.ts";

// Persistent across command invocations within a Pi session
let activeWalk: WalkState | null = null;

export function createWalk(
  questions: Question[],
  metadata: Metadata
): WalkState {
  return {
    sessionId: `qa_walk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    questions,
    metadata,
    answers: new Map(),
    skipped: new Set(),
    currentIndex: 0,
    createdAt: Date.now(),
  };
}

export function updateWalkAnswers(
  walk: WalkState,
  index: number,
  answer: string
): void {
  if (index >= 0 && index < walk.questions.length) {
    walk.answers.set(walk.questions[index].id, answer);
  }
}

export function markSkipped(walk: WalkState, index: number): void {
  if (index >= 0 && index < walk.questions.length) {
    walk.skipped.add(walk.questions[index].id);
  }
}

export function getActiveWalk(): WalkState | null {
  return activeWalk;
}

export function setActiveWalk(walk: WalkState | null): void {
  activeWalk = walk;
}

export function clearActiveWalk(): void {
  activeWalk = null;
}
