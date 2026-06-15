export interface DocChange {
  path: string;
  currentContent: string;
  unmodifiedContent: string;
  isDiff: boolean;
}

export interface GitCommit {
  hash: string;
  date: string;
  message: string;
  diff: string;
  author: string;
}

export interface SourceContext {
  sources: Array<{
    path: string;
    content: string;
    priority: number;
  }>;
  tokensUsed: number;
  budget: number;
}

export type FindingType =
  | "contradiction"
  | "detail_loss"
  | "misalignment"
  | "improvement";

export interface ReviewFinding {
  type: FindingType;
  severity: "high" | "medium" | "low";
  file: string;
  section: string;
  description: string;
  evidence: {
    current: string;
    source: string;
    commit?: string;
  };
  verification?: string;
}

export interface ReviewResult {
  findings: ReviewFinding[];
  summary: {
    contradictions: number;
    detail_losses: number;
    misalignments: number;
    improvements: number;
    timestamp: string;
  };
}
