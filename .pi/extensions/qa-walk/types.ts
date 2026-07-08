/**
 * QA Walk Extension - Type Definitions
 */

export interface Question {
  id: string; // q1, q2, ...
  brief: string; // 5-10 word summary
  details: string[]; // bullet points (context)
  category?: string; // "architecture", "security", etc.
}

export interface Metadata {
  title: string; // "Architecture Review - 2026-06-20"
  category?: string;
  targetIssue?: string; // "GH-123"
}

export interface WalkState {
  sessionId: string;
  questions: Question[];
  metadata: Metadata;
  answers: Map<string, string>; // id -> answer text
  skipped: Set<string>; // ids of skipped questions
  currentIndex: number; // 0-based index
  createdAt: number; // timestamp
}

export interface ParseResult {
  success: boolean;
  questions: Question[];
  error?: string;
}
