/**
 * QA Walk Extension - Question Parsing (Heuristic + LLM Fallback)
 */

import type { ParseResult, Question } from "./types.ts";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

const BULLET_PATTERNS = /^\s*(?:[-*]|\d+\.)\s+/;
const QUESTION_MARKER = /\?/;

export function parseQuestionsHeuristic(text: string): ParseResult {
  const lines = text.split("\n");
  const questions: Question[] = [];
  let currentBrief: string | null = null;
  let currentDetails: string[] = [];
  let questionIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines unless we're building details
    if (line === "") {
      if (currentBrief && currentDetails.length > 0) {
        // End current question
        questions.push({
          id: `q${++questionIndex}`,
          brief: currentBrief,
          details: currentDetails,
        });
        currentBrief = null;
        currentDetails = [];
      }
      continue;
    }

    // Check for question marker
    if (QUESTION_MARKER.test(line)) {
      // Save previous question if exists
      if (currentBrief && currentDetails.length > 0) {
        questions.push({
          id: `q${++questionIndex}`,
          brief: currentBrief,
          details: currentDetails,
        });
        currentDetails = [];
      }
      // Start new question
      currentBrief = line;
      continue;
    }

    // Check for bullet/number marker (details)
    if (BULLET_PATTERNS.test(line) && currentBrief) {
      const detail = line.replace(BULLET_PATTERNS, "");
      currentDetails.push(detail);
      continue;
    }

    // Any other line with currentBrief but no bullet = end of details
    if (currentBrief && !BULLET_PATTERNS.test(line)) {
      if (currentDetails.length > 0) {
        questions.push({
          id: `q${++questionIndex}`,
          brief: currentBrief,
          details: currentDetails,
        });
        currentBrief = null;
        currentDetails = [];
      }
    }
  }

  // Flush final question
  if (currentBrief && currentDetails.length > 0) {
    questions.push({
      id: `q${++questionIndex}`,
      brief: currentBrief,
      details: currentDetails,
    });
  }

  if (questions.length === 0) {
    return {
      success: false,
      questions: [],
      error: "No questions found",
    };
  }

  return {
    success: true,
    questions,
  };
}

export async function structureQuestionsViaAgent(
  text: string,
  ctx: ExtensionContext
): Promise<ParseResult> {
  try {
    // Call agent to structure questions
    const prompt = `Extract questions from this text. Return ONLY a valid JSON array (no other output):
[
  { "id": "q1", "brief": "...", "details": ["...", "..."] },
  ...
]

Strict format. Text to parse:

${text}`;

    // Note: In a real implementation, this would call an agent via ctx
    // For MVP, we'll return error indicating LLM fallback needs implementation
    console.warn(
      "[qa-walk] LLM fallback not yet implemented. Returning error."
    );
    return {
      success: false,
      questions: [],
      error: "LLM fallback not available",
    };
  } catch (err) {
    return {
      success: false,
      questions: [],
      error: `LLM fallback failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
