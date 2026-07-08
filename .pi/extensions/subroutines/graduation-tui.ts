/**
 * GraduationReviewPanel — file-by-file diff TUI for /graduate command.
 *
 * Flow:
 *   For each changed file:
 *     Y / Enter  → confirm, advance to next
 *     N          → open inline deny Editor, submit reason, advance to next
 *     Esc        → cancel entire review (returns reviews collected so far)
 *   When all files reviewed → done(ReviewResult)
 *
 *   Plugs into ctx.ui.custom() contract: { render, handleInput, invalidate }
 */

import { Editor, Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import type { TUI, Theme }                           from "@earendil-works/pi-tui";
import { DiffPanel }                                 from "./diff-panel.ts";

// ── Types ─────────────────────────────────────────────────────────────

export interface FileDiff {
  path:       string;
  oldContent: string;  // "" = new file
  newContent: string;  // "" = deleted file
}

export interface FileReview {
  path:       string;
  confirmed:  boolean;
  reason?:    string;  // present when confirmed=false
}

export interface ReviewResult {
  reviews:   FileReview[];  // files reviewed before cancel/complete
  cancelled: boolean;
}

type Mode = "diff" | "deny-input";

// ── GraduationReviewPanel ─────────────────────────────────────────────

export class GraduationReviewPanel {
  private files:        FileDiff[];
  private panels:       DiffPanel[];
  private currentIdx    = 0;
  private mode:         Mode = "diff";
  private reviews:      Map<string, FileReview> = new Map();
  private denyEditor:   Editor;
  private cachedRender: string[] | undefined;
  private cachedWidth:  number   | undefined;
  private requestRender: () => void;
  private done:          (result: ReviewResult) => void;
  private theme:         Theme;

  constructor(
    files:         FileDiff[],
    tui:           TUI,
    theme:         Theme,
    requestRender: () => void,
    done:          (result: ReviewResult) => void,
  ) {
    this.files         = files;
    this.theme         = theme;
    this.requestRender = requestRender;
    this.done          = done;

    // Pre-warm one DiffPanel per file — all start async Shiki highlight in parallel
    this.panels = files.map(f => new DiffPanel(
      f.oldContent,
      f.newContent,
      f.path,
      requestRender,
      () => {},  // inner panel done is never called; outer panel owns confirm/deny
    ));

    this.denyEditor = new Editor(tui, {
      borderColor: (s: string) => theme.fg("error", s),
      selectList: {
        borderColor:    (s: string) => s,
        selectionColor: (s: string) => s,
        disabledColor:  (s: string) => s,
      },
    });
    this.denyEditor.onSubmit = (value: string) => this._submitDenial(value);
  }

  invalidate(): void { this.cachedRender = undefined; }

  // ── Input ─────────────────────────────────────────────────────────

  handleInput(data: string): void {
    this.invalidate();

    if (this.mode === "deny-input") {
      if (matchesKey(data, Key.escape)) {
        // Cancel denial — back to diff view without recording anything
        this.denyEditor.setText("");
        this.mode = "diff";
        return;
      }
      this.denyEditor.handleInput(data);
      return;
    }

    // mode === "diff"

    // Cancel entire review
    if (matchesKey(data, Key.escape)) {
      this.done({ reviews: Array.from(this.reviews.values()), cancelled: true });
      return;
    }

    // Confirm current file
    if (data === "y" || data === "Y" || matchesKey(data, Key.enter)) {
      const f = this.files[this.currentIdx];
      this.reviews.set(f.path, { path: f.path, confirmed: true });
      this._advance();
      return;
    }

    // Deny current file — open inline editor for reason
    if (data === "n" || data === "N") {
      this.mode = "deny-input";
      return;
    }

    // File list navigation (jump without confirming/denying)
    if (matchesKey(data, Key.left)) {
      this.currentIdx = Math.max(0, this.currentIdx - 1);
      return;
    }
    if (matchesKey(data, Key.right)) {
      this.currentIdx = Math.min(this.files.length - 1, this.currentIdx + 1);
      return;
    }

    // Delegate scroll / everything else to the current file's DiffPanel
    this.panels[this.currentIdx].handleInput(data);
  }

  // ── Internals ─────────────────────────────────────────────────────

  private _submitDenial(reason: string): void {
    const f = this.files[this.currentIdx];
    this.reviews.set(f.path, {
      path:      f.path,
      confirmed: false,
      reason:    reason.trim() || "(no reason given)",
    });
    this.denyEditor.setText("");
    this.mode = "diff";
    this._advance();
  }

  private _advance(): void {
    // Find next unreviewed file
    for (let i = this.currentIdx + 1; i < this.files.length; i++) {
      if (!this.reviews.has(this.files[i].path)) {
        this.currentIdx = i;
        this.invalidate();
        this.requestRender();
        return;
      }
    }
    // All files reviewed
    this.done({ reviews: Array.from(this.reviews.values()), cancelled: false });
  }

  // ── Render ────────────────────────────────────────────────────────

  render(width: number): string[] {
    if (this.cachedRender && this.cachedWidth === width) return this.cachedRender;
    this.cachedWidth = width;

    const t    = this.theme;
    const lines: string[] = [];
    const emit = (s: string) => lines.push(truncateToWidth(s, width));

    // ── Header ────────────────────────────────────────────────────
    const confirmed = Array.from(this.reviews.values()).filter(r =>  r.confirmed).length;
    const denied    = Array.from(this.reviews.values()).filter(r => !r.confirmed).length;
    const reviewed  = this.reviews.size;
    const total     = this.files.length;

    emit(t.fg("accent", "─".repeat(width)));
    const stats   = `${t.fg("success", `✓${confirmed}`)}  ${t.fg("error", `✗${denied}`)}  ${t.fg("dim", `${reviewed}/${total}`)}`;
    const navHint = t.fg("dim", "←/→ jump  Y confirm  N deny  Esc cancel");
    emit(` \x1b[1mGraduation Review\x1b[0m  ${stats}   ${navHint}`);

    // ── File list (compact, one entry per file) ────────────────────
    const fileBar = this.files.map((f, i) => {
      const review = this.reviews.get(f.path);
      const icon   = !review
        ? t.fg("dim",     "○")
        : review.confirmed
          ? t.fg("success", "✓")
          : t.fg("error",   "✗");
      const name  = f.path.split("/").pop() ?? f.path;
      const label = i === this.currentIdx
        ? t.bg("selectedBg", t.fg("text", ` ${name} `))
        : t.fg("muted", ` ${name} `);
      return `${icon}${label}`;
    }).join(" ");
    emit(` ${fileBar}`);
    emit(t.fg("dim", "─".repeat(width)));

    // ── Current file diff ─────────────────────────────────────────
    for (const l of this.panels[this.currentIdx].render(width)) {
      lines.push(l);
    }

    // ── Deny editor (shown below diff when mode=deny-input) ───────
    if (this.mode === "deny-input") {
      emit(t.fg("error", "─".repeat(width)));
      emit(` ${t.fg("error", "✗ Reason for denial:")}  ${t.fg("dim", "Enter to submit  Esc to cancel")}`);
      for (const l of this.denyEditor.render(width - 2)) {
        emit(` ${l}`);
      }
      emit(t.fg("error", "─".repeat(width)));
    }

    this.cachedRender = lines;
    return lines;
  }
}
