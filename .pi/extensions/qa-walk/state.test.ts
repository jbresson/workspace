/**
 * QA Walk Extension - State Management Unit Tests
 */

import {
  createWalk,
  updateWalkAnswers,
  markSkipped,
  getActiveWalk,
  setActiveWalk,
  clearActiveWalk,
} from "./state.ts";
import type { Question, Metadata } from "./types.ts";

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}:`, err);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// Setup
const questions: Question[] = [
  {
    id: "q1",
    brief: "First question?",
    details: ["Detail 1", "Detail 2"],
  },
  {
    id: "q2",
    brief: "Second question?",
    details: ["Detail A"],
  },
  {
    id: "q3",
    brief: "Third question?",
    details: ["Detail X", "Detail Y", "Detail Z"],
  },
];

const metadata: Metadata = {
  title: "Test QA Walk",
};

// Test 1: Create walk
test("createWalk - initializes state", () => {
  const walk = createWalk(questions, metadata);
  assert(walk.sessionId.startsWith("qa_walk_"), "Session ID should start with qa_walk_");
  assert(walk.questions.length === 3, "Should have 3 questions");
  assert(walk.answers.size === 0, "Should have no answers initially");
  assert(walk.skipped.size === 0, "Should have no skipped initially");
  assert(walk.currentIndex === 0, "Should start at index 0");
});

// Test 2: Update walk answers
test("updateWalkAnswers - stores answers", () => {
  const walk = createWalk(questions, metadata);

  updateWalkAnswers(walk, 0, "My answer to Q1");
  assert(
    walk.answers.get("q1") === "My answer to Q1",
    "Should store answer for q1"
  );
  assert(walk.answers.size === 1, "Should have 1 answer");

  updateWalkAnswers(walk, 2, "My answer to Q3");
  assert(
    walk.answers.get("q3") === "My answer to Q3",
    "Should store answer for q3"
  );
  assert(walk.answers.size === 2, "Should have 2 answers");
});

// Test 3: Update out-of-bounds index
test("updateWalkAnswers - bounds check", () => {
  const walk = createWalk(questions, metadata);

  updateWalkAnswers(walk, -1, "Bad answer");
  assert(walk.answers.size === 0, "Should not store out-of-bounds answer");

  updateWalkAnswers(walk, 100, "Bad answer");
  assert(walk.answers.size === 0, "Should not store out-of-bounds answer");

  updateWalkAnswers(walk, 1, "Good answer");
  assert(walk.answers.size === 1, "Should store in-bounds answer");
});

// Test 4: Mark skipped
test("markSkipped - tracks skipped questions", () => {
  const walk = createWalk(questions, metadata);

  markSkipped(walk, 0);
  assert(walk.skipped.has("q1"), "Should mark q1 as skipped");
  assert(walk.skipped.size === 1, "Should have 1 skipped");

  markSkipped(walk, 2);
  assert(walk.skipped.has("q3"), "Should mark q3 as skipped");
  assert(walk.skipped.size === 2, "Should have 2 skipped");
});

// Test 5: Mark skipped out-of-bounds
test("markSkipped - bounds check", () => {
  const walk = createWalk(questions, metadata);

  markSkipped(walk, -1);
  assert(walk.skipped.size === 0, "Should not mark out-of-bounds");

  markSkipped(walk, 1);
  assert(walk.skipped.has("q2"), "Should mark in-bounds");
  assert(walk.skipped.size === 1, "Should have 1 skipped");
});

// Test 6: Active walk state
test("getActiveWalk / setActiveWalk - state management", () => {
  clearActiveWalk();
  assert(getActiveWalk() === null, "Should be null initially");

  const walk = createWalk(questions, metadata);
  setActiveWalk(walk);
  assert(getActiveWalk() === walk, "Should return set walk");
  assert(getActiveWalk()?.sessionId === walk.sessionId, "Should be same walk");
});

// Test 7: Clear active walk
test("clearActiveWalk - clears state", () => {
  const walk = createWalk(questions, metadata);
  setActiveWalk(walk);
  assert(getActiveWalk() !== null, "Should have active walk");

  clearActiveWalk();
  assert(getActiveWalk() === null, "Should clear active walk");
});

// Test 8: Session ID uniqueness
test("createWalk - generates unique session IDs", () => {
  const walk1 = createWalk(questions, metadata);
  const walk2 = createWalk(questions, metadata);

  assert(
    walk1.sessionId !== walk2.sessionId,
    "Should generate unique session IDs"
  );
});

// Test 9: Timestamp is set
test("createWalk - sets createdAt timestamp", () => {
  const before = Date.now();
  const walk = createWalk(questions, metadata);
  const after = Date.now();

  assert(
    walk.createdAt >= before && walk.createdAt <= after,
    "Timestamp should be within test execution range"
  );
});

// Test 10: Maps/Sets work correctly
test("Walk state - Map and Set behavior", () => {
  const walk = createWalk(questions, metadata);

  // Test Map
  updateWalkAnswers(walk, 0, "Answer 1");
  updateWalkAnswers(walk, 0, "Answer 1 Updated"); // Overwrite
  assert(
    walk.answers.get("q1") === "Answer 1 Updated",
    "Map should allow updates"
  );

  // Test Set (no duplicates)
  markSkipped(walk, 1);
  markSkipped(walk, 1); // Try to add again
  assert(walk.skipped.size === 1, "Set should prevent duplicates");
});

console.log("\n--- State Tests Complete ---\n");
