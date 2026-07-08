/**
 * QA Walk Extension - Parser Unit Tests
 */

import { parseQuestionsHeuristic } from "./parser.ts";

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => console.log(`✓ ${name}`))
        .catch((err) => console.error(`✗ ${name}:`, err));
    } else {
      console.log(`✓ ${name}`);
    }
  } catch (err) {
    console.error(`✗ ${name}:`, err);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// Test 1: Basic heuristic parsing
test("parseQuestionsHeuristic - basic parsing", () => {
  const input = `
What is the purpose of this architecture?
- It should define system boundaries
- It should identify key components
- It should explain data flow

How do we handle scaling?
- Horizontal scaling via load balancer
- Database replication
- Cache layer for hot data
`;

  const result = parseQuestionsHeuristic(input);
  assert(result.success, "Should succeed");
  assert(result.questions.length === 2, `Should find 2 questions, found ${result.questions.length}`);
  assert(result.questions[0].brief.includes("purpose"), "Q1 should be about purpose");
  assert(result.questions[0].details.length === 3, "Q1 should have 3 details");
  assert(result.questions[1].brief.includes("scaling"), "Q2 should be about scaling");
  assert(result.questions[1].details.length === 3, "Q2 should have 3 details");
});

// Test 2: Empty input
test("parseQuestionsHeuristic - empty input", () => {
  const result = parseQuestionsHeuristic("");
  assert(!result.success, "Should fail on empty input");
  assert(result.questions.length === 0, "Should have no questions");
  assert(result.error === "No questions found", "Should indicate no questions");
});

// Test 3: No questions (no question marks)
test("parseQuestionsHeuristic - no question marks", () => {
  const input = `
This is just some text
- with some bullets
- but no questions`;

  const result = parseQuestionsHeuristic(input);
  assert(!result.success, "Should fail");
  assert(result.questions.length === 0, "Should have no questions");
});

// Test 4: Question without details
test("parseQuestionsHeuristic - question without details", () => {
  const input = `
What is the first question?
Second paragraph without bullets should be ignored.

What is the second question?
- Detail 1
- Detail 2`;

  const result = parseQuestionsHeuristic(input);
  assert(result.success, "Should succeed");
  assert(result.questions.length === 1, "Should find 1 valid question (first has no details)");
  assert(
    result.questions[0].brief.includes("second question"),
    "Should be the second question"
  );
});

// Test 5: Multiple bullet formats
test("parseQuestionsHeuristic - mixed bullet formats", () => {
  const input = `
What uses mixed bullets?
- Dash bullet
* Star bullet
1. Numbered item
2. Another numbered`;

  const result = parseQuestionsHeuristic(input);
  assert(result.success, "Should succeed");
  assert(result.questions.length === 1, "Should find 1 question");
  assert(result.questions[0].details.length === 4, "Should parse all 4 bullets");
});

// Test 6: Question IDs are sequential
test("parseQuestionsHeuristic - IDs are sequential", () => {
  const input = `
First question?
- detail

Second question?
- detail

Third question?
- detail`;

  const result = parseQuestionsHeuristic(input);
  assert(result.success, "Should succeed");
  assert(result.questions[0].id === "q1", "First should be q1");
  assert(result.questions[1].id === "q2", "Second should be q2");
  assert(result.questions[2].id === "q3", "Third should be q3");
});

// Test 7: Whitespace handling
test("parseQuestionsHeuristic - whitespace normalization", () => {
  const input = `
   What is trimmed?   
  -  Detail with spaces  
  -  Another   `;

  const result = parseQuestionsHeuristic(input);
  assert(result.success, "Should succeed");
  assert(result.questions[0].brief === "What is trimmed?", "Should trim question");
  assert(
    result.questions[0].details[0] === "Detail with spaces",
    "Should trim detail"
  );
});

// Test 8: Consecutive questions
test("parseQuestionsHeuristic - consecutive questions", () => {
  const input = `
Question 1?
- detail 1
- detail 2
Question 2?
- detail 3`;

  const result = parseQuestionsHeuristic(input);
  assert(result.success, "Should succeed");
  assert(result.questions.length === 1, "Should find 1 question (Q2 has no empty line separator)");
});

console.log("\n--- Parser Tests Complete ---\n");
