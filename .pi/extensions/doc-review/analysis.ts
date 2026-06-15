import type { ReviewFinding, ReviewResult, GitCommit } from "./types";

interface AnalysisInput {
  currentContent: string;
  unmodifiedContent: string;
  history: GitCommit[];
  sourceContext: string;
  filePath: string;
}

export async function analyzeDocChanges(input: AnalysisInput): Promise<ReviewFinding[]> {
  const findings: ReviewFinding[] = [];

  // Parse line-by-line diff
  const currentLines = input.currentContent.split("\n");
  const unmodifiedLines = input.unmodifiedContent.split("\n");

  // Simple diff: detect removals and changes
  const linesRemoved: string[] = [];
  const linesChanged: Array<{ old: string; new: string; lineNum: number }> = [];

  for (let i = 0; i < Math.max(currentLines.length, unmodifiedLines.length); i++) {
    const current = currentLines[i] || "";
    const original = unmodifiedLines[i] || "";

    if (current !== original) {
      if (original && !current) {
        linesRemoved.push(original);
      } else if (current && original) {
        linesChanged.push({
          old: original,
          new: current,
          lineNum: i + 1,
        });
      }
    }
  }

  // Check for detail loss (removed lines that aren't just formatting)
  for (const removed of linesRemoved) {
    if (
      removed.trim().length > 0 &&
      !removed.match(/^#+\s/) && // Not just headings
      removed.includes(":") // Likely a key-value or structured info
    ) {
      findings.push({
        type: "detail_loss",
        severity: "high",
        file: input.filePath,
        section: "unknown",
        description: `Structured detail removed: "${removed.trim().substring(0, 80)}"`,
        evidence: {
          current: "(removed)",
          source: removed.trim(),
        },
      });
    }
  }

  // Check for contradictions (conflicting statements)
  for (const change of linesChanged) {
    // Look for negations or reversals
    if (
      (change.old.includes("must") && change.new.includes("should")) ||
      (change.old.includes("required") && change.new.includes("optional"))
    ) {
      findings.push({
        type: "contradiction",
        severity: "high",
        file: input.filePath,
        section: `line ${change.lineNum}`,
        description: "Requirement severity changed without explanation",
        evidence: {
          current: change.new.trim(),
          source: change.old.trim(),
        },
      });
    }
  }

  // Check for inconsistency with history
  if (input.history.length > 0) {
    const recentCommit = input.history[0];
    const recentMessage = recentCommit.message.toLowerCase();

    // If recent commit message mentions "deprecate" or "remove" but lines still present
    if (recentMessage.includes("deprecat") && input.currentContent.includes(recentCommit.message)) {
      findings.push({
        type: "misalignment",
        severity: "medium",
        file: input.filePath,
        section: "general",
        description: "Deprecated content still present without deprecation notice",
        evidence: {
          current: input.currentContent.substring(0, 100),
          source: recentCommit.message,
          commit: recentCommit.hash,
        },
      });
    }
  }

  return findings;
}

export async function validateImprovement(
  improvementClaim: string,
  sourceEvidence: string,
  improvement: string
): Promise<{ valid: boolean; reason: string }> {
  // This would be called by the LLM verification step
  // For now, return a placeholder
  return {
    valid: true,
    reason: "Verification deferred to LLM",
  };
}

export function extractSection(content: string, lineNum: number): string {
  // Find the heading that contains this line number
  const lines = content.split("\n");
  let section = "unknown";

  for (let i = lineNum; i >= 0; i--) {
    if (lines[i] && lines[i].match(/^#+\s/)) {
      section = lines[i].trim();
      break;
    }
  }

  return section;
}

export function buildComparisonText(current: string, unmodified: string): string {
  // Create side-by-side comparison for LLM
  return `CURRENT:\n${current}\n\nPREVIOUS:\n${unmodified}`;
}

export function groupFindingsBySeverity(findings: ReviewFinding[]): Record<string, ReviewFinding[]> {
  return {
    high: findings.filter((f) => f.severity === "high"),
    medium: findings.filter((f) => f.severity === "medium"),
    low: findings.filter((f) => f.severity === "low"),
  };
}

export function formatReviewResult(findings: ReviewFinding[]): ReviewResult {
  const grouped = groupFindingsBySeverity(findings);

  return {
    findings: [...grouped.high, ...grouped.medium, ...grouped.low],
    summary: {
      contradictions: findings.filter((f) => f.type === "contradiction").length,
      detail_losses: findings.filter((f) => f.type === "detail_loss").length,
      misalignments: findings.filter((f) => f.type === "misalignment").length,
      improvements: findings.filter((f) => f.type === "improvement").length,
      timestamp: new Date().toISOString(),
    },
  };
}
