/**
 * QA Walk Extension - TUI Renderer Component
 */

import type {
  Component,
  Focusable,
  TUI,
  Theme,
} from "@earendil-works/pi-tui";
import { Editor, Key, matchesKey, truncateToWidth, wrapTextWithAnsi } from "@earendil-works/pi-tui";
import type { WalkState } from "./types.ts";

export class QuestionnaireBrowser implements Component, Focusable {
  focused: boolean = false;
  private walk: WalkState;
  private onComplete: (answers: Map<string, string>, skipped: Set<string>) => void;
  private onCancel: () => void;
  private editor: Editor;
  private tui: TUI;
  // Local text buffer — stays in sync with editor on every input.
  // Needed because Editor doesn't expose a getText() getter;
  // we track manually and use editor.setText() on question changes.
  private currentText: string = "";

  constructor(
    walk: WalkState,
    tui: TUI,
    onComplete: (answers: Map<string, string>, skipped: Set<string>) => void,
    onCancel: () => void
  ) {
    this.walk = walk;
    this.tui = tui;
    this.onComplete = onComplete;
    this.onCancel = onCancel;

    this.editor = new Editor(tui, {
      borderColor: (str) => str,
      selectList: {
        borderColor:    (str) => str,
        selectionColor: (str) => str,
        disabledColor:  (str) => str,
      },
    });
    this.editor.focused = true;

    // Load any existing answer for the first question
    const initial = this.walk.answers.get(this.walk.questions[0]?.id ?? "") ?? "";
    this.currentText = initial;
    this.editor.setText(initial);
  }

  render(width: number): string[] {
    const lines: string[] = [];
    const add = (s: string) => lines.push(truncateToWidth(s, width));
    const totalQ   = this.walk.questions.length;
    const answered = this.walk.answers.size;
    const skipped  = this.walk.skipped.size;
    const currentQ = this.walk.questions[this.walk.currentIndex];

    add("");

    // Progress bar
    const filled = Math.round((answered / Math.max(totalQ, 1)) * 20);
    const bar    = "█".repeat(filled) + "░".repeat(20 - filled);
    add(`│ Progress: [${bar}] ${answered}/${totalQ} answered`);
    add(`│`);

    // Question header
    add(`│ Q${this.walk.currentIndex + 1}/${totalQ}: ${currentQ.brief}`);
    add(`│`);

    // Details
    for (const detail of currentQ.details) {
      const wrapped = wrapTextWithAnsi(detail, width - 6);
      for (const line of wrapped) add(`│   • ${line}`);
    }
    add(`│`);

    // Answer field label
    add(`│ Your answer:`);

    // Editor renders multi-line answer with cursor
    for (const line of this.editor.render(width - 4)) {
      add(`│   ${line}`);
    }

    add(`│`);

    // Footer — no single-letter hotkeys
    const prev = this.walk.currentIndex > 0
      ? "↑ prev"
      : "      ";
    const next = this.walk.currentIndex < totalQ - 1
      ? "↓ next"
      : "       ";
    add(`│ ${prev}  ${next}  Enter/Ctrl+D done  Esc cancel`);
    add("");

    return lines;
  }

  handleInput(data: string): void {
    const currentQ = this.walk.questions[this.walk.currentIndex];

    // ── Navigation & control keys (intercepted before editor) ────

    if (matchesKey(data, Key.up)) {
      this._saveAndGo(this.walk.currentIndex - 1);
      return;
    }

    if (matchesKey(data, Key.down)) {
      this._saveAndGo(this.walk.currentIndex + 1);
      return;
    }

    if (matchesKey(data, Key.ctrl("d")) || matchesKey(data, Key.enter)) {
      this._saveCurrentAnswer();
      if (this.walk.currentIndex < this.walk.questions.length - 1) {
        this._saveAndGo(this.walk.currentIndex + 1);
      } else {
        this._finish();
      }
      return;
    }

    if (matchesKey(data, Key.escape)) {
      this.onCancel();
      return;
    }

    // ── All other input → editor ────────────────────────────────
    // Pass to editor for cursor movement, rendering, and all other sequences
    // (Shift+Enter for newlines handled natively by editor)
    if (data === "\x7f" || matchesKey(data, Key.backspace)) {
      this.currentText = this.currentText.slice(0, -1);
    } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
      this.currentText = this.currentText + data;
    }
    // Pass to editor for cursor movement, rendering, and all other sequences
    this.editor.handleInput(data);
  }

  invalidate(): void {}

  // ── Private ─────────────────────────────────────────────────────

  private _saveCurrentAnswer(): void {
    const currentQ = this.walk.questions[this.walk.currentIndex];
    this.walk.answers.set(currentQ.id, this.currentText);
  }

  private _saveAndGo(targetIndex: number): void {
    this._saveCurrentAnswer();
    const clamped = Math.max(0, Math.min(this.walk.questions.length - 1, targetIndex));
    if (clamped === this.walk.currentIndex) return;
    this.walk.currentIndex = clamped;
    // Restore saved answer for new question (or empty string)
    const saved = this.walk.answers.get(this.walk.questions[clamped].id) ?? "";
    this.currentText = saved;
    this.editor.setText(saved);  // resets cursor to end — acceptable on question change
  }

  private _finish(): void {
    this._saveCurrentAnswer();
    this.onComplete(this.walk.answers, this.walk.skipped);
  }
}
