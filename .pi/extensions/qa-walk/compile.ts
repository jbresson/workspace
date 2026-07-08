/**
 * QA Walk Extension - Markdown Compilation
 */

import type { WalkState } from "./types.ts";

export function compileMarkdown(walk: WalkState, source: string): string {
  const lines: string[] = [];
  const timestamp = new Date(walk.createdAt).toISOString();

  // Header
  lines.push("# QA Walk Compilation\n");
  lines.push(
    `**Session**: ${walk.metadata.title} | **Date**: ${timestamp} | **Source**: ${source}\n`
  );
  lines.push("---\n");

  // Questions and answers
  walk.questions.forEach((q) => {
    const answer = walk.answers.get(q.id);

    lines.push(`## Q${q.id}: ${q.brief}\n`);

    if (q.details.length > 0) {
      lines.push("**Details**:");
      q.details.forEach((detail) => lines.push(`- ${detail}`));
      lines.push("");
    }

    lines.push("**Your Answer**:");
    lines.push(answer?.trim() ? answer : "(no answer provided)");
    lines.push("");

    if (q.category) lines.push(`**Category**: ${q.category}\n`);
    lines.push("---\n");
  });

  // Metadata summary
  lines.push("## Metadata\n");
  lines.push(`- Total Questions: ${walk.questions.length}`);
  const answered = [...walk.questions].filter(q => walk.answers.get(q.id)?.trim()).length;
  lines.push(`- Answered: ${answered}`);
  lines.push(`- Unanswered: ${walk.questions.length - answered}`);
  if (walk.metadata.targetIssue) {
    lines.push(`- Target Issue: ${walk.metadata.targetIssue}`);
  }
  if (walk.metadata.category) {
    lines.push(`- Category: ${walk.metadata.category}`);
  }

  return lines.join("\n");
}
