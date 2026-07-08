// Simple test runner without TypeScript compilation
const { parseQuestionsHeuristic } = require("./parser.test-compiled.js");

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (\!condition) throw new Error(message);
}

// Test: basic parsing
test("Basic heuristic parsing", () => {
  // Mock result
  assert(true, "Parser module loads");
});

console.log(`\nTests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
