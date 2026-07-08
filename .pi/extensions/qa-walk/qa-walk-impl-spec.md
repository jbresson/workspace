# Implementation Spec: qa-walk Extension

**Issue ID**: `EXT-QA-WALK-001`
**Status**: ✅ CORE COMPLETE — TUI integration done, some deferred
**Owner**: buddy
**Implementation**: `.pi/extensions/qa-walk/` (8 files)
**Skill Reference**: `memory/mindbase/skills/qa-walk/SKILL.md`

---

## Overview

Pi extension that provides agent-driven questionnaire workflows. The agent calls
`qa_walk_open` with structured questions; the extension renders an interactive
TUI overlay (one question at a time), collects answers, and returns compiled
markdown to the agent. The agent decides what to do with the answers.

**Two pathways**:
1. **Agent-driven**: Agent calls `qa_walk_open` tool with structured questions
2. **User-driven**: `/qa_walk <file>` parses a file of questions and triggers the tool

> `/qa_walk` with no args is intentionally thin — user prompts the agent to read
> the relevant file and make the tool call. No special extraction logic needed.

---

## Acceptance Criteria

- [x] `qa_walk_open` tool registered and callable by agent
- [x] `/qa_walk <file>` parses questions from file and opens walk
- [x] TUI renders overlay via `ctx.ui.custom()` — one question per screen
- [x] Navigation (↑↓/S/Q/Ctrl+D) works
- [x] Text accumulation editor for answers
- [x] Skipped questions tracked and shown in compiled output
- [x] Pagination warning for large files (>1000 lines)
- [x] Error handling: parse + LLM fail → tool returns error
- [x] Compiled markdown returned as tool result
- [ ] `/qa_walk` no-args extracts questions from last agent message *(deferred — not needed, user prompts agent directly)*
- [ ] Answers checkpointed to `wip/qa_walk_session_<id>.json` after each Q *(deferred)*
- [ ] `/qa_walk --resume <id>` restores interrupted sessions *(deferred)*

---

## File Structure

```
.pi/extensions/qa-walk/
├── index.ts       Entry point, extension factory
├── tool.ts        qa_walk_open tool — registers + executes questionnaire TUI
├── command.ts     /qa_walk command handler
├── parser.ts      Heuristic parsing + LLM fallback stub
├── renderer.ts    QuestionnaireBrowser TUI component
├── state.ts       Module-level state + checkpoint stubs
├── compile.ts     Markdown compilation
└── types.ts       TypeScript interfaces
```

---

## Types (types.ts)

```typescript
interface Question {
  id: string;        // "q1", "q2", ...
  brief: string;     // 5–10 word summary
  details: string[]; // bullet points providing context
  category?: string; // "architecture", "security", etc.
}

interface Metadata {
  title: string;
  category?: string;
  targetIssue?: string;  // e.g. "GH-123" — for context/output header only
}

interface WalkState {
  sessionId: string;
  questions: Question[];
  metadata: Metadata;
  answers: Map<string, string>;  // id → answer text
  skipped: Set<string>;          // ids of skipped questions
  currentIndex: number;
  createdAt: number;
}

interface ParseResult {
  success: boolean;
  questions: Question[];
  error?: string;
}
```

---

## Tool: qa_walk_open (tool.ts)

**Parameters**:
```typescript
Type.Object({
  questions: Type.Array(
    Type.Object({
      id:       Type.String(),
      brief:    Type.String(),
      details:  Type.Array(Type.String()),
      category: Type.Optional(Type.String()),
    }),
    { minItems: 1 }
  ),
  metadata: Type.Optional(
    Type.Object({
      title:       Type.String(),
      category:    Type.Optional(Type.String()),
      targetIssue: Type.Optional(Type.String()),
    })
  ),
})
```

**Execute flow**:
1. Validate questions (non-empty)
2. Guard: `ctx.mode !== "tui"` → return error
3. Show `QuestionnaireBrowser` via `ctx.ui.custom()` — await user completion
4. If cancelled → return `"Questionnaire cancelled by user"`
5. Flush answers into walk state
6. `compileMarkdown(walk, "agent")` → return as `content[0].text`

---

## Command: /qa_walk (command.ts)

**`/qa_walk <file>`**:
1. Read file (error if missing)
2. If >1000 lines → notify "Large file, parsing may take time"
3. `parseQuestionsHeuristic(content)`
4. If 0 questions → `structureQuestionsViaAgent(content, ctx)` (LLM fallback)
5. If both fail → return error
6. Call `qa_walk_open` tool internally with parsed questions

**`/qa_walk` (no args)**:
- Notify user to ask the agent to read the target file and call `qa_walk_open`.
- No extraction logic — kept intentionally thin.

**`/qa_walk --resume <id>`** *(deferred)*:
- Placeholder stub — returns "Resume not yet implemented"

---

## Renderer: QuestionnaireBrowser (renderer.ts)

Implements `ctx.ui.custom()` contract via `{ render, handleInput, invalidate }`.

**render(width)** output structure:
```
Progress: [████░░░░░░░░░░░░░░░░] X/Y answered (Z skipped)

Q<n>/<total>: <brief>

  • <detail line 1>
  • <detail line 2>

Your answer:
<editor content>
<cursor>

[↑] Prev  [↓] Next  [S]kip  [Q]uit  [Ctrl+D] Done
```

**handleInput** key bindings:
- `↑` — save answer, go to previous question
- `↓` — save answer, go to next question
- `S/s` — mark skipped, advance
- `Q/q / Esc` — cancel walk
- `Ctrl+D` — save answer, advance (or finish if last question)
- All other input → text accumulation (backspace handled)

---

## Parser (parser.ts)

**Heuristic** (`parseQuestionsHeuristic`):
1. Split by lines
2. Line contains `?` → brief candidate
3. Subsequent bullet lines (`- `, `* `, `1. `) → details
4. Question requires ≥1 detail line
5. Stop collecting details at blank line or next `?`
6. Assign IDs: q1, q2, ...

**LLM fallback** (`structureQuestionsViaAgent`): stub — returns error if heuristic fails.

---

## Compilation: compileMarkdown (compile.ts)

```typescript
export function compileMarkdown(walk: WalkState, source: string): string
```

Output format:
```markdown
# <metadata.title>

**Date**: <ISO timestamp> | **Source**: <source>

---

## Q1: <brief>

**Details**:
- <detail>

**Answer**:
<answer text>

**Category**: <category>

---

## Skipped Questions
- q2, q3

---

**Summary**: X answered, Y skipped, Z total
```

---

## State (state.ts)

Module-level state shared across tool + command registrations:

```typescript
let activeWalk: WalkState | null = null;

export function createWalk(questions, metadata): WalkState
export function setActiveWalk(walk: WalkState | null): void
export function getActiveWalk(): WalkState | null
export function updateWalkAnswers(walk, index, answer): void
export function markSkipped(walk, index): void
// saveCheckpoint / loadCheckpoint — stubs, deferred
```

---

## Deferred Features

| Feature | Status | Notes |
|---|---|---|
| Checkpoint I/O | Stub | File path: `wip/qa_walk_session_<id>.json` |
| `/qa_walk --resume` | Stub | Needs checkpoint I/O first |
| LLM fallback parser | Stub | Needs agent call from extension context |
| `/qa_walk` no-args extraction | Not planned | User prompts agent directly instead |

---

## Dependencies

```json
{
  "@earendil-works/pi-coding-agent": "latest",
  "@earendil-works/pi-tui": "latest",
  "@sinclair/typebox": "latest"
}
```

No `diff` or `@shikijs/cli` — diff functionality lives in `subroutines` extension.
