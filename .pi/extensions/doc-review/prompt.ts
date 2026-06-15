import type { SourceContext, GitCommit, DocChange } from "./types";

export function buildReviewPrompt(
  modifiedDocs: DocChange[],
  sourceContext: SourceContext,
  gitHistory: Map<string, GitCommit[]>
): string {
  const sourcesList = sourceContext.sources
    .map((s) => `- ${s.path} (priority: ${s.priority})\n${s.content.substring(0, 300)}...`)
    .join("\n\n");

  const docsToReview = modifiedDocs
    .map(
      (doc) => `
FILE: ${doc.path}
CHANGED: ${doc.isDiff ? "yes" : "no"}

CURRENT:
${doc.currentContent.substring(0, 500)}

PREVIOUS (unmodified):
${doc.unmodifiedContent.substring(0, 500)}

RECENT HISTORY:
${
  gitHistory
    .get(doc.path)
    ?.slice(0, 3)
    .map((c) => `Commit ${c.hash}: ${c.message}\nDiff: ${c.diff.substring(0, 200)}`)
    .join("\n") || "No history"
}
`
    )
    .join("\n---\n");

  return `You review technical documentation changes rigorously.

TASK: Compare current docs against source material.
Identify contradictions, lost detail, and misalignment.
When you identify potential improvements, verify they maintain historical accuracy.

SOURCE MATERIAL (30k token budget):
${sourcesList}

TOKEN BUDGET: ${sourceContext.tokensUsed} / ${sourceContext.budget} used

CURRENT MODIFIED DOCS:
${docsToReview}

INSTRUCTIONS:
1. For each change, cite exact line numbers and sections
2. Contradictions: Where does current conflict with sources?
3. Detail loss: What specifics were removed without justification?
4. Misalignment: How does current diverge from patterns in memory or Pi docs?
5. Improvements: If current improves clarity while maintaining accuracy, note it
   (but only include if you can verify against sources)
6. Be specific: Quote the exact text from current and source
7. Do not praise—only identify issues and verified improvements
8. No vague claims; all findings must be traceable to exact sections

RESPONSE FORMAT: Return ONLY valid JSON matching this schema:
{
  "findings": [
    {
      "type": "contradiction" | "detail_loss" | "misalignment" | "improvement",
      "severity": "high" | "medium" | "low",
      "file": "path/to/doc.md",
      "section": "heading or line range",
      "description": "What's wrong/improved? Be specific.",
      "evidence": {
        "current": "exact quote from modified doc",
        "source": "exact quote from reference",
        "commit": "optional: commit hash if relevant"
      },
      "verification": "For improvements only: why this is correct based on sources"
    }
  ],
  "summary": {
    "contradictions": N,
    "detail_losses": N,
    "misalignments": N,
    "improvements": N,
    "timestamp": "ISO date"
  }
}

Ensure the JSON is valid and parseable.`;
}

export function buildVerificationPrompt(
  improvementClaim: string,
  sourceEvidence: string,
  improvement: string
): string {
  return `You verify improvement claims rigorously.

IMPROVEMENT CLAIM:
${improvementClaim}

SOURCE EVIDENCE:
${sourceEvidence}

IMPROVEMENT PROPOSED:
${improvement}

TASK: Is this improvement factually supported by the source material?
- Does it maintain all details from the original?
- Is it technically accurate?
- Does it improve clarity without changing meaning?

Respond with JSON:
{
  "valid": true | false,
  "reason": "Why or why not this improvement is correct"
}`;
}
