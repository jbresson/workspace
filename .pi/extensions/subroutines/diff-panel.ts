/**
 * qa-walk DiffPanel — split/unified diff overlay
 *
 * Pipeline (mirrors @heyhuynhgiabuu/pi-diff architecture):
 *   diff npm pkg     → DiffLine[]
 *   @shikijs/cli     → ANSI highlighted blocks (cached, async)
 *   injectBg()       → composite diff bg on top of Shiki fg
 *   buildSplitRows() → two-column rows zipped from del/add pairs
 *   render()         → string[] for ctx.ui.custom()
 *
 * We own this code. Zero runtime dep on pi-diff.
 */

import { structuredPatch, diffChars } from "diff";
import { codeToANSI }                 from "@shikijs/cli";
import { Key, matchesKey, truncateToWidth } from "@earendil-works/pi-tui";
import type { Theme }                  from "@earendil-works/pi-coding-agent";
import { extname }                     from "node:path";

// ── Language detection ────────────────────────────────────────────────

const EXT_LANG: Record<string, string> = {
  ts:"typescript",  tsx:"tsx",       js:"javascript",  jsx:"jsx",
  mjs:"javascript", py:"python",     rb:"ruby",        rs:"rust",
  go:"go",          java:"java",     c:"c",            cpp:"cpp",
  cs:"csharp",      swift:"swift",   kt:"kotlin",      html:"html",
  css:"css",        scss:"scss",     json:"json",      yaml:"yaml",
  yml:"yaml",       toml:"toml",     md:"markdown",    sql:"sql",
  sh:"bash",        bash:"bash",     zsh:"bash",       lua:"lua",
  php:"php",        dart:"dart",     xml:"xml",
};

export function detectLang(filePath: string): string | undefined {
  return EXT_LANG[extname(filePath).slice(1).toLowerCase()];
}

// ── DiffLine / SplitRow data models ──────────────────────────────────

export interface DiffLine {
  type: "add" | "del" | "ctx" | "sep";
  oldNum: number | null;
  newNum: number | null;
  content: string;
  gapSize?: number;  // only on sep lines
}

export interface SplitRow {
  left:  DiffLine | null;  // old side (del / ctx / sep / empty filler)
  right: DiffLine | null;  // new side (add / ctx / sep / empty filler)
}

// ── Parser ────────────────────────────────────────────────────────────

export function parseDiffLines(oldText: string, newText: string): DiffLine[] {
  const patch = structuredPatch("before", "after", oldText, newText, "", "", { context: 3 });
  const out: DiffLine[] = [];
  let prevOldEnd = 1;

  for (const hunk of patch.hunks) {
    const gap = hunk.oldStart - prevOldEnd;
    if (out.length > 0 && gap > 2) {
      out.push({ type: "sep", oldNum: null, newNum: null, content: "", gapSize: gap });
    }
    let oldNum = hunk.oldStart, newNum = hunk.newStart;
    for (const line of hunk.lines) {
      // Skip POSIX "no newline" marker — not a content line, not a context line
      if (line === "\\ No newline at end of file") continue;
      if      (line[0] === "+") out.push({ type:"add", oldNum:null,     newNum:newNum++, content:line.slice(1) });
      else if (line[0] === "-") out.push({ type:"del", oldNum:oldNum++, newNum:null,     content:line.slice(1) });
      else                       out.push({ type:"ctx", oldNum:oldNum++, newNum:newNum++, content:line.slice(1) });
    }
    prevOldEnd = oldNum;
  }
  return out;
}

// ── Split row builder ─────────────────────────────────────────────────
// Pairs del/add blocks side-by-side. ctx and sep are mirrored left+right.
// null on either side = diagonal stripe filler in render.

export function buildSplitRows(lines: DiffLine[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.type === "ctx" || l.type === "sep") {
      rows.push({ left: l, right: l });
      i++; continue;
    }
    const dels: DiffLine[] = [];
    const adds: DiffLine[] = [];
    while (i < lines.length && lines[i].type === "del") dels.push(lines[i++]);
    while (i < lines.length && lines[i].type === "add") adds.push(lines[i++]);
    const n = Math.max(dels.length, adds.length);
    for (let j = 0; j < n; j++) {
      rows.push({ left: dels[j] ?? null, right: adds[j] ?? null });
    }
  }
  return rows;
}

// ── shouldUseSplit heuristic ──────────────────────────────────────────
// Split only when: wide enough, both sides have changes, not heavily
// imbalanced, and lines don't wrap more than 20% of the time.
// Mirrors pi-diff logic exactly.

const SPLIT_MIN_WIDTH      = 120;
const SPLIT_MIN_CODE_W     = 40;
const SPLIT_MAX_WRAP_RATIO = 0.2;

export function shouldUseSplit(lines: DiffLine[], termWidth: number): boolean {
  if (termWidth < SPLIT_MIN_WIDTH) return false;
  const adds = lines.filter(l => l.type === "add").length;
  const dels = lines.filter(l => l.type === "del").length;
  if (adds === 0 || dels === 0) return false;                         // one-sided: split wastes a column
  if (Math.max(adds, dels) > Math.min(adds, dels) * 2) return false; // heavily imbalanced
  const half = Math.floor(termWidth / 2);
  const cw   = Math.max(12, half - GW);
  if (cw < SPLIT_MIN_CODE_W) return false;
  const content  = lines.filter(l => l.type !== "sep");
  const wrapable = content.filter(l => l.content.length > cw).length;
  if (content.length > 0 && wrapable / content.length >= SPLIT_MAX_WRAP_RATIO) return false;
  return true;
}

// ── Shiki LRU cache ───────────────────────────────────────────────────
//
// render() is synchronous (called every keypress by Pi TUI).
// Shiki is async. Pattern:
//   cache miss → kick off hlBlock() async → return plain-text placeholder
//   on resolve → invalidate() + requestRender() → next render() hits cache
//
// LRU eviction: Map insertion-order + delete-before-reinsert on access.
// When size > CACHE_LIMIT, delete the oldest (first inserted) entry.
// 64 entries: sufficient for single-file scope (pi-diff uses 192 for multi-file).

const CACHE_LIMIT  = 64;
const MAX_HL_CHARS = 80_000;  // skip highlighting for huge files
const SHIKI_THEME  = "github-dark";

const _hlCache = new Map<string, string[]>();

function _touch(k: string, v: string[]): string[] {
  _hlCache.delete(k);
  _hlCache.set(k, v);
  while (_hlCache.size > CACHE_LIMIT) {
    _hlCache.delete(_hlCache.keys().next().value!);
  }
  return v;
}

async function hlBlock(code: string, lang: string | undefined): Promise<string[]> {
  if (!code) return [""];
  if (!lang || code.length > MAX_HL_CHARS) return code.split("\n");
  const k = `${SHIKI_THEME}\0${lang}\0${code}`;
  const hit = _hlCache.get(k);
  if (hit) return _touch(k, hit);  // promote to MRU position
  try {
    const ansi = await codeToANSI(code, lang as any, SHIKI_THEME);
    const out  = (ansi.endsWith("\n") ? ansi.slice(0, -1) : ansi).split("\n");
    return _touch(k, out);
  } catch {
    return code.split("\n");  // graceful fallback: plain text
  }
}

// ── ANSI color constants ──────────────────────────────────────────────
//
// Shiki emits fg-only ANSI codes. We prepend a bg escape per line so
// diff color shows through behind syntax colors:
//   bg escape + Shiki fg ANSI → both visible simultaneously.
//
// Values tuned for dark terminals (github-dark Shiki theme base).

const BG_ADD        = "\x1b[48;2;30;52;40m";   // muted green tint
const BG_DEL        = "\x1b[48;2;60;30;30m";   // muted red tint
const BG_ADD_W      = "\x1b[48;2;45;90;60m";   // word-level emphasis green (brighter)
const BG_DEL_W      = "\x1b[48;2;100;45;45m";  // word-level emphasis red  (brighter)
const BG_GUTTER_ADD = "\x1b[48;2;24;42;32m";   // slightly darker green gutter
const BG_GUTTER_DEL = "\x1b[48;2;48;28;28m";   // slightly darker red gutter
const BG_EMPTY      = "\x1b[48;2;18;18;18m";   // diagonal stripe filler bg
const FG_ADD        = "\x1b[38;2;100;180;120m";
const FG_DEL        = "\x1b[38;2;200;100;100m";
const FG_LNUM       = "\x1b[38;2;100;100;100m";
const FG_DIM        = "\x1b[38;2;80;80;80m";
const RST           = "\x1b[0m";

function injectBg(ansiLine: string, bg: string): string {
  // Prepend bg escape; Shiki fg codes override fg only, leaving our bg intact.
  return `${bg}${ansiLine}${RST}`;
}

// ── Word-level emphasis ───────────────────────────────────────────────
//
// Applied on PLAIN TEXT content BEFORE Shiki highlighting.
// Changed character spans get a brighter bg escape injected.
// Shiki then highlights the text portions; emphasis bg persists under the fg.
// Skipped when lines are too dissimilar (ratio < 0.15 → emphasis is noise).

const WORD_DIFF_MIN_SIM = 0.15;

function similarity(a: string, b: string): number {
  const longer = Math.max(a.length, b.length);
  if (longer === 0) return 1;
  const changes = diffChars(a, b);
  const same = changes
    .filter(c => !c.added && !c.removed)
    .reduce((s, c) => s + c.value.length, 0);
  return same / longer;
}

/**
 * Compute which visible-column ranges changed on each side of a del/add pair.
 * diffChars(del, add):
 *   removed parts → in del but not add → highlight on left (del) side
 *   added parts   → in add but not del → highlight on right (add) side
 */
function computeEmphRanges(
  delContent: string,
  addContent: string,
): { delRanges: [number, number][]; addRanges: [number, number][] } {
  if (similarity(delContent, addContent) < WORD_DIFF_MIN_SIM) {
    return { delRanges: [], addRanges: [] };
  }
  const changes = diffChars(delContent, addContent);
  const delRanges: [number, number][] = [];
  const addRanges: [number, number][] = [];
  let dc = 0, ac = 0;
  for (const part of changes) {
    const len = part.value.length;
    if (part.removed) { delRanges.push([dc, dc + len]); dc += len; }
    else if (part.added) { addRanges.push([ac, ac + len]); ac += len; }
    else                 { dc += len; ac += len; }
  }
  return { delRanges, addRanges };
}

/**
 * Inject bg emphasis escapes at visible-column ranges inside an ANSI string.
 * Walks char-by-char, skips escape sequences (zero visible cols),
 * injects emphBg at range start and lineBg at range end.
 * Uses lineBg (not RST) at range end to restore diff bg without killing Shiki fg.
 */
function injectWordBg(
  ansiLine: string,
  ranges:   [number, number][],
  emphBg:   string,
  lineBg:   string,
): string {
  if (ranges.length === 0) return ansiLine;
  let out = "", col = 0, ri = 0, inEmph = false, i = 0;
  while (i < ansiLine.length) {
    // Skip ANSI escape sequence — zero visible columns
    if (ansiLine[i] === "\x1b" && ansiLine[i + 1] === "[") {
      const end = ansiLine.indexOf("m", i + 2);
      if (end !== -1) { out += ansiLine.slice(i, end + 1); i = end + 1; continue; }
    }
    // Inject emphasis boundaries at this visible column
    if (ri < ranges.length) {
      if (!inEmph && col === ranges[ri][0]) { out += emphBg; inEmph = true; }
      if (inEmph  && col === ranges[ri][1]) {
        out += lineBg; inEmph = false; ri++;
        // Immediately adjacent range?
        if (ri < ranges.length && col === ranges[ri][0]) { out += emphBg; inEmph = true; }
      }
    }
    out += ansiLine[i]; col++; i++;
  }
  if (inEmph) out += lineBg;
  return out;
}

// ── Diagonal stripe filler ────────────────────────────────────────────
// Renders on the empty side of an imbalanced split row (null DiffLine).
// Signals "this side has no corresponding line" without a blank void.

function stripeFill(width: number, rowIdx: number): string {
  let s = "";
  for (let c = 0; c < width; c++) {
    s += ((c + rowIdx) % 3 === 0) ? "╱" : " ";
  }
  return `${BG_EMPTY}${FG_DIM}${s}${RST}`;
}

// ── Layout constants ──────────────────────────────────────────────────

const NPAD        = 4;         // digit width for line numbers
const GW          = NPAD + 3;  // total gutter cols: num + " " + sign + " "
const MAX_VISIBLE = 150;       // max rows rendered per frame before scroll

// ── DiffPanel ─────────────────────────────────────────────────────────

export class DiffPanel {
  private lines:        DiffLine[];
  private rows:         SplitRow[];
  private scrollOffset  = 0;
  private cachedRender: string[] | undefined;
  private cachedWidth:  number   | undefined;

  // Async Shiki state.
  // leftHL / rightHL: one highlighted string per non-sep content row,
  // index-aligned to rows[] via leftRowMap / rightRowMap.
  // leftEmphRanges / rightEmphRanges: word-level emphasis ranges (same index space).
  // null = not yet computed (pending) or no paired partner for that row.
  private hlPending  = false;
  private leftHL:  string[] | null = null;
  private rightHL: string[] | null = null;
  private leftRowMap:  number[] = [];  // rows[i] → leftHL index  (-1 = sep/null)
  private rightRowMap: number[] = [];  // rows[i] → rightHL index (-1 = sep/null)
  private leftEmphRanges:  ([number, number][] | null)[] = [];  // leftHL index  → ranges
  private rightEmphRanges: ([number, number][] | null)[] = [];  // rightHL index → ranges

  private requestRender: () => void;
  private done: (confirmed: boolean) => void;

  readonly added:   number;
  readonly removed: number;
  readonly lang:    string | undefined;

  constructor(
    oldText:       string,
    newText:       string,
    filePath:      string,       // used for language detection only
    requestRender: () => void,   // tui.requestRender — called after async HL resolves
    done:          (confirmed: boolean) => void,
  ) {
    this.requestRender = requestRender;
    this.done          = done;
    this.lang          = detectLang(filePath);
    this.lines         = parseDiffLines(oldText, newText);
    this.rows          = buildSplitRows(this.lines);
    this.added         = this.lines.filter(l => l.type === "add").length;
    this.removed       = this.lines.filter(l => l.type === "del").length;
    this._buildRowMaps();
    this._warmHL();  // fire-and-forget; render() handles the not-yet-ready case
  }

  // ── Row index maps ────────────────────────────────────────────────
  // leftHL[leftRowMap[i]] gives the Shiki-highlighted line for rows[i].left.
  // -1 means sep, null filler — no hl entry for those.

  private _buildRowMaps(): void {
    let li = 0, ri = 0;
    this.leftRowMap  = new Array(this.rows.length).fill(-1);
    this.rightRowMap = new Array(this.rows.length).fill(-1);
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      if (row.left  && row.left.type  !== "sep") this.leftRowMap[i]  = li++;
      if (row.right && row.right.type !== "sep") this.rightRowMap[i] = ri++;
    }
  }

  // ── Async highlight warm-up ───────────────────────────────────────
  // Sends all content lines to Shiki as one block per side (left/right),
  // splits result back into per-row string[] via newline boundaries.
  // On completion: invalidate cache + requestRender for one extra frame.

  private async _warmHL(): Promise<void> {
    if (this.hlPending || !this.lang) return;
    this.hlPending = true;
    const leftSrc:  string[] = [];
    const rightSrc: string[] = [];

    // Collect content lines and compute word emphasis ranges for paired del/add rows.
    // Ranges are indexed in the same space as leftHL / rightHL.
    let li = 0, ri = 0;
    const lEmph: ([number, number][] | null)[] = [];
    const rEmph: ([number, number][] | null)[] = [];

    for (const row of this.rows) {
      const hasPair = row.left?.type === "del" && row.right?.type === "add";
      if (row.left && row.left.type !== "sep") {
        leftSrc.push(row.left.content);
        if (hasPair) {
          const { delRanges } = computeEmphRanges(row.left.content, row.right!.content);
          lEmph[li] = delRanges.length > 0 ? delRanges : null;
        } else {
          lEmph[li] = null;
        }
        li++;
      }
      if (row.right && row.right.type !== "sep") {
        rightSrc.push(row.right.content);
        if (hasPair) {
          const { addRanges } = computeEmphRanges(row.left!.content, row.right.content);
          rEmph[ri] = addRanges.length > 0 ? addRanges : null;
        } else {
          rEmph[ri] = null;
        }
        ri++;
      }
    }

    const [lHL, rHL] = await Promise.all([
      hlBlock(leftSrc.join("\n"),  this.lang),
      hlBlock(rightSrc.join("\n"), this.lang),
    ]);
    this.leftHL          = lHL;
    this.rightHL         = rHL;
    this.leftEmphRanges  = lEmph;
    this.rightEmphRanges = rEmph;
    this.hlPending = false;
    this.invalidate();
    this.requestRender();  // triggers one extra frame with syntax-highlighted output
  }

  // ── Public API ────────────────────────────────────────────────────

  invalidate(): void { this.cachedRender = undefined; }

  handleInput(data: string): void {
    const pageSize = 20;
    const maxOff   = Math.max(0, this.rows.length - 1);
    if      (matchesKey(data, Key.up))       { this.scrollOffset = Math.max(0,      this.scrollOffset - 1); }
    else if (matchesKey(data, Key.down))     { this.scrollOffset = Math.min(maxOff, this.scrollOffset + 1); }
    else if (matchesKey(data, Key.pageUp))   { this.scrollOffset = Math.max(0,      this.scrollOffset - pageSize); }
    else if (matchesKey(data, Key.pageDown)) { this.scrollOffset = Math.min(maxOff, this.scrollOffset + pageSize); }
    else if (matchesKey(data, Key.enter) || data === "y" || data === "Y") { this.done(true);  return; }
    else if (matchesKey(data, Key.escape)  || data === "n" || data === "N") { this.done(false); return; }
    this.invalidate();
  }

  render(width: number): string[] {
    if (this.cachedRender && this.cachedWidth === width) return this.cachedRender;
    this.cachedWidth = width;
    const lines: string[] = [];
    const emit = (s: string) => lines.push(truncateToWidth(s, width));

    // Header
    emit(`${FG_DIM}${"─".repeat(width)}${RST}`);
    emit(` \x1b[1mPreview\x1b[0m  ${FG_ADD}+${this.added}${RST}  ${FG_DEL}-${this.removed}${RST}   ${FG_DIM}↑↓ PgUp/PgDn scroll  Y confirm  N cancel${RST}`);
    emit(`${FG_DIM}${"─".repeat(width)}${RST}`);

    if (this.lines.length === 0) {
      emit(`${FG_DIM} (no changes)${RST}`);
    } else {
      const useSplit = shouldUseSplit(this.lines, width);
      const visible  = this.rows.slice(this.scrollOffset, this.scrollOffset + MAX_VISIBLE);
      if (useSplit) {
        this._renderSplit(visible, this.scrollOffset, width, emit);
      } else {
        this._renderUnified(visible, width, emit);
      }
      if (this.rows.length > MAX_VISIBLE) {
        const pct = Math.round(this.scrollOffset / Math.max(1, this.rows.length - MAX_VISIBLE) * 100);
        emit(`${FG_DIM} ↓ ${pct}%  (${this.rows.length} rows total)${RST}`);
      }
    }

    emit(`${FG_DIM}${"─".repeat(width)}${RST}`);
    this.cachedRender = lines;
    return lines;
  }

  // ── Split renderer ────────────────────────────────────────────────

  private _renderSplit(
    visible:   SplitRow[],
    rowOffset: number,
    width:     number,
    emit:      (s: string) => void,
  ): void {
    const half = Math.floor(width / 2);
    const cw   = Math.max(12, half - GW);

    for (let vi = 0; vi < visible.length; vi++) {
      const row    = visible[vi];
      const absIdx = rowOffset + vi;

      if (row.left?.type === "sep") {
        const gap = row.left.gapSize ?? 0;
        emit(`${FG_DIM}··· ${gap} unchanged lines ···${RST}`);
        continue;
      }

      const lHlIdx = this.leftRowMap[absIdx]  ?? -1;
      const rHlIdx = this.rightRowMap[absIdx] ?? -1;

      const leftCell  = this._buildHalfCell(row.left,  lHlIdx, cw, vi, "left");
      const rightCell = this._buildHalfCell(row.right, rHlIdx, cw, vi, "right");

      // Each half independently ANSI-safe via truncateToWidth.
      // Outer emit() adds final full-line guard.
      emit(`${truncateToWidth(leftCell, half)}${FG_DIM}│${RST}${truncateToWidth(rightCell, half - 1)}`);
    }
  }

  private _buildHalfCell(
    line:   DiffLine | null,
    hlIdx:  number,
    cw:     number,
    rowIdx: number,
    side:   "left" | "right",
  ): string {
    // null → diagonal stripe filler (imbalanced del/add block)
    if (!line) return stripeFill(cw + GW, rowIdx);

    const isDel  = line.type === "del";
    const isAdd  = line.type === "add";
    const lineBg = isDel ? BG_DEL : isAdd ? BG_ADD : "";
    const gutBg  = isDel ? BG_GUTTER_DEL : isAdd ? BG_GUTTER_ADD : "";
    const fg     = isDel ? FG_DEL : isAdd ? FG_ADD : FG_DIM;
    const sign   = isDel ? "-" : isAdd ? "+" : " ";
    const num    = (isDel ? line.oldNum : line.newNum) ?? 0;
    const numStr = String(num).padStart(NPAD);
    const gutter = `${gutBg}${FG_LNUM}${numStr}${RST} ${fg}${sign}${RST} `;

    const hlBank    = side === "left" ? this.leftHL          : this.rightHL;
    const emphBank   = side === "left" ? this.leftEmphRanges  : this.rightEmphRanges;
    const emphBg     = side === "left" ? BG_DEL_W             : BG_ADD_W;
    const emphRanges = (emphBank && hlIdx >= 0) ? (emphBank[hlIdx] ?? null) : null;

    let content: string;
    if (hlBank && hlIdx >= 0 && hlIdx < hlBank.length) {
      // Shiki line ready:
      // 1. inject diff bg so syntax fg + diff bg are both visible
      // 2. inject word emphasis bg at changed char ranges (on top of diff bg, under Shiki fg)
      content = injectBg(hlBank[hlIdx], lineBg);
      if (emphRanges) content = injectWordBg(content, emphRanges, emphBg, lineBg);
    } else {
      // Async pending or no lang: plain text with diff fg + word emphasis
      const plain = emphRanges
        ? injectWordBg(`${fg}${line.content}${RST}`, emphRanges, emphBg, lineBg)
        : `${fg}${line.content}${RST}`;
      content = `${lineBg}${plain}`;
    }

    // truncateToWidth: ANSI-safe column count — won't split mid-escape-sequence
    return `${gutter}${truncateToWidth(content, cw)}`;
  }

  // ── Unified renderer ──────────────────────────────────────────────
  // Fallback: narrow terminals or one-sided diffs.
  // No Shiki — avoids async complexity on the fallback path.
  // Plain fg colors are sufficient at this width.

  private _renderUnified(
    visible: SplitRow[],
    width:   number,
    emit:    (s: string) => void,
  ): void {
    for (const row of visible) {
      const line = row.left ?? row.right;
      if (!line) continue;
      if (line.type === "sep") {
        emit(`${FG_DIM} ··· ${line.gapSize} unchanged lines ···${RST}`);
        continue;
      }
      const bg     = line.type === "add" ? BG_ADD : line.type === "del" ? BG_DEL : "";
      const fg     = line.type === "add" ? FG_ADD : line.type === "del" ? FG_DEL : FG_DIM;
      const sign   = line.type === "add" ? "+" : line.type === "del" ? "-" : " ";
      const num    = line.oldNum ?? line.newNum ?? 0;
      const numStr = String(num).padStart(NPAD);
      emit(`${bg}${FG_LNUM}${numStr} ${fg}${sign} ${line.content}${RST}`);
    }
  }
}
