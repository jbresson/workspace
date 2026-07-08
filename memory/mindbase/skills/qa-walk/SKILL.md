# QA Walk Skill

**Identifier**: `qa-walk`  
**Type**: Pi Extension / Interactive TUI Component  
**Purpose**: Single-question-at-a-time questionnaire interface within Pi harness  
**Status**: ✅ LIVE & VERIFIED (2026-07-07)  
**Implementation**: `.pi/extensions/qa-walk/` (8 files, 632 LOC)  
**Issue**: `EXT-QA-WALK-001`  
**Tests**: 18 unit tests (parser + state logic)

---

## Definition

Pi extension that renders an overlay TUI component for guided questionnaires. Presents one structured question per screen, collects multi-line answers, compiles to markdown.

**Problem**: Agent detects multiple questions in response → user must scroll, parse, context-switch per question.

**Solution**: 
- Agent extracts questions → calls `qa_walk_open` tool with structured params
- Tool renders overlay UI (one Q at a time, ↑↓ navigate, Ctrl+D submit)
- User answers interactively, gets compiled markdown output

---

## Flows

### Flow 1: Agent-Driven (Primary)

Agent detects multi-question scenario → structures questions → calls `qa_walk_open` tool → UX renders, user answers, tool returns compiled markdown.

**Responsibility split**:
- Agent: Extract & structure questions from context
- Tool: Render UI, collect answers, compile output

---

### Flow 2: User-Triggered (Fallback)

#### `/qa_walk` (no args)
- Read last agent message
- Heuristic parse: Look for `?`, "questions", bullets/numbers
- If found: call `qa_walk_open` tool with structured params
- If not: "No questions detected"

#### `/qa_walk <filepath>`
- Read file (plain text, markdown, whatever)
- Simple parse: Split on `?`, extract bulleted details
- If parse fails: Try LLM structuring
- Call `qa_walk_open` tool with result

---

## Tool: `qa_walk_open`

**Input**:
```
{
  questions: [
    {
      id: string,
      brief: string,        // 5-10 words
      details: string[],    // bullet context
      category?: string
    }
  ],
  metadata?: {
    title: string,
    category: string,
    targetDoc?: string,
    targetIssue?: string
  }
}
```

**Output**: 
- Compiled markdown with Q+A+metadata
- Tool call result visible in conversation

---

## TUI Component: `QuestionnaireBrowser`

**Layout** (overlay):
```
┌─ QUESTIONNAIRE: [title] ──────────────────┐
│ Progress: [████░░░░░░] 2/5 answered        │
├──────────────────────────────────────────┤
│ Q1/5: [brief]                            │
│ • [detail 1]                             │
│ • [detail 2]                             │
│                                          │
│ Your answer:                             │
│ ┌──────────────────────────────────────┐ │
│ │ [multi-line editor, Ctrl+D to submit]│ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [↑] Prev  [↓] Next  [S]kip  [Q]uit     │
└──────────────────────────────────────────┘
```

**Controls**:
- ↑/↓: navigate prev/next (auto-saves current answer)
- Enter / Ctrl+D: submit answer, advance to next
- Esc: cancel walk (discards answers)

**Editor**:
- Plain text input (no syntax highlighting)
- Auto-scrolls as user types (keeps cursor visible)

**Completion**:
- Show skipped questions summary (if any)
- Display compiled markdown
- Offer to copy/save

**State**:
- Answers stored in memory (module-level map)
- Auto-checkpoint to `wip/qa_walk_session_<id>.json` after each answer
- `/qa_walk --resume <id>` restores from checkpoint

---

## File Parsing (Heuristic)

When user provides file:

1. **Pagination**: If file > N lines, warn user "This is large. Parsing may take time."
2. **Heuristic**: Look for `?` + next bulleted/numbered block
3. **Extract**: Build `{id, brief, details, category}`
4. **LLM Fallback**: If heuristic finds 0 questions, try LLM structuring
5. **Failure**: If both fail, return error to user: "Could not parse questions. Try /qa_walk with a file containing lines with '?' and bullet details."

**Agent Response**: If tool returns error (parse + LLM both failed), agent sees failure and responds with guidance (e.g., "Let me help you structure these questions...").

**No Questions Detected**: If heuristic + LLM both find 0 questions, tool fails with message. Agent handles response.

---

## Implementation Structure

**Files**:
- `qa-walk.ts` — Main extension, registers tool + command
- `lib/parser.ts` — Heuristic parsing + LLM fallback
- `lib/renderer.ts` — TUI component (QuestionnaireBrowser)
- `lib/state.ts` — State management + checkpointing

**Module-level state**:
```
walkState: WalkState | null
checkpoints: Map<string, WalkState>
```

**Registration** (extension-pattern):
- Tool: `qa_walk_open` (LLM-callable, agent-driven)
- Command: `/qa_walk` (user-driven fallback)
- Both use same renderer, state mgmt

---

## YAML Schema (Optional, Future)

User could pre-define complex questionnaires in `.memo.yaml` for reuse. Not required for MVP.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Parse + LLM fail | Tool returns error. Agent responds with guidance. |
| No questions found | Tool fails with message. Agent handles. |
| Empty questions array (agent call) | Tool fails, agent sees error. |
| Large file (>1000 lines) | Show warning before parsing. |
| User quits mid-walk | Discard answers, restore checkpoint option. |

---

## Status

✅ **Design locked. Implementation complete.**

---

## Implementation Notes

**Files**: `.pi/extensions/qa-walk/`
- types.ts (31L): All interfaces defined
- state.ts (48L): Module-level state mgmt + lifecycle
- parser.ts (87L): Heuristic parsing + LLM stub
- compile.ts (60L): Markdown output
- renderer.ts (187L): TUI component (Component, Focusable)
- tool.ts (121L): qa_walk_open tool registration
- command.ts (125L): /qa_walk command handler
- index.ts (14L): Extension factory

**Tests**: 18 unit test cases
- parser.test.ts: 8 cases (heuristic edge cases)
- state.test.ts: 10 cases (lifecycle, bounds, mutations)

**Live since**: 2026-07-07 — TUI integration fully operational via `ctx.ui.custom()`.

**Remaining deferred** (non-blocking):
- LLM fallback for `/qa_walk <file>` parse failures
- Checkpoint persistence / `--resume`
- Last-message extraction for `/qa_walk` (no args)
