#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";

const extPath = "./.pi/extensions/doc-review";
const files = readdirSync(extPath).filter((f) => f.endsWith(".ts"));

console.log("📦 Extension Structure:");
files.forEach((f) => {
  const content = readFileSync(`${extPath}/${f}`, "utf8");
  const lines = content.split("\n").length;
  const hasExport = content.includes("export");
  console.log(`  ${f}: ${lines} lines ${hasExport ? "✅ exported" : ""}`);
});

console.log("\n✅ Extension files created successfully");
console.log("\nModules:");
console.log("  - types.ts: Type definitions");
console.log("  - collector.ts: Git & file operations");
console.log("  - context.ts: Source context loading & budgeting");
console.log("  - analysis.ts: Local change analysis");
console.log("  - prompt.ts: LLM prompt builders");
console.log("  - index.ts: Extension entry point");

console.log("\n🔗 Registration:");
console.log("  - Command: /doc-review");
console.log("  - Tool: doc_review_files");

console.log("\n📋 Next steps:");
console.log("  1. Test in pi: pi /doc-review");
console.log("  2. Verify git history fetch works");
console.log("  3. Verify context loader respects budget");
console.log("  4. Test model integration (github-copilot + claude-haiku-4.5)");
