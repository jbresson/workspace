/**
 * QA Walk Extension - Tool Definition (qa_walk_open)
 */

import { Type } from "typebox";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { Question, Metadata } from "./types.ts";
import { createWalk, setActiveWalk, updateWalkAnswers, markSkipped } from "./state.ts";
import { compileMarkdown } from "./compile.ts";

export function registerQaWalkOpenTool(pi: ExtensionAPI) {
  pi.registerTool({
    name: "qa_walk_open",
    label: "Open Questionnaire",
    description: "Render questionnaire and collect user answers",
    parameters: Type.Object({
      questions: Type.Array(
        Type.Object({
          id: Type.String(),
          brief: Type.String(),
          details: Type.Array(Type.String()),
          category: Type.Optional(Type.String()),
        }),
        { minItems: 1 }
      ),
      metadata: Type.Optional(
        Type.Object({
          title: Type.String(),
          category: Type.Optional(Type.String()),
          targetIssue: Type.Optional(Type.String()),
        })
      ),
    }),
    async execute(
      _toolCallId: string,
      params: {
        questions: Question[];
        metadata?: Metadata;
      },
      _signal?: AbortSignal,
      _onUpdate?: any,
      ctx?: ExtensionContext
    ) {
      if (!params.questions || params.questions.length === 0) {
        return {
          content: [{ type: "text" as const, text: "Error: No questions provided" }],
          details: { status: "error" },
        };
      }

      const metadata: Metadata = params.metadata || { title: "QA Walk Session" };
      const walk = createWalk(params.questions, metadata);
      setActiveWalk(walk);

      // ── Phase 1: Questionnaire TUI ──────────────────────────────────
      // Shows the question-by-question overlay and collects answers.
      // Non-TUI fallback: return error asking user to run in interactive mode.

      if (!ctx || ctx.mode !== "tui") {
        setActiveWalk(null);
        return {
          content: [{ type: "text" as const, text: "Error: qa_walk_open requires interactive TUI mode" }],
          details: { status: "error" },
        };
      }

      const walkResult = await ctx.ui.custom<{
        answers: Map<string, string>;
        skipped: Set<string>;
        cancelled: boolean;
      }>((tui, theme, _kb, done) => {
        const { QuestionnaireBrowser } = require("./renderer.ts");
        const browser = new QuestionnaireBrowser(
          walk,
          tui,
          (answers: Map<string, string>, skipped: Set<string>) => done({ answers, skipped, cancelled: false }),
          () => done({ answers: new Map(), skipped: new Set(), cancelled: true }),
        );
        return {
          render:      (w: number) => browser.render(w),
          handleInput: (d: string) => { browser.handleInput(d); tui.requestRender(); },
          invalidate:  ()          => browser.invalidate(),
        };
      });

      if (walkResult.cancelled) {
        setActiveWalk(null);
        return {
          content: [{ type: "text" as const, text: "User cancelled the questionnaire" }],
          details: { status: "cancelled" },
        };
      }

      // Flush answers into walk state
      walkResult.answers.forEach((answer, questionId) => {
        const qIndex = walk.questions.findIndex(q => q.id === questionId);
        if (qIndex >= 0) updateWalkAnswers(walk, qIndex, answer);
      });
      walkResult.skipped.forEach((questionId) => {
        const qIndex = walk.questions.findIndex(q => q.id === questionId);
        if (qIndex >= 0) markSkipped(walk, qIndex);
      });

      const markdown = compileMarkdown(walk, "agent");
      setActiveWalk(null);

      return {
        content: [{ type: "text" as const, text: markdown }],
        details: { status: "success" },
      };
    },
  });
}
