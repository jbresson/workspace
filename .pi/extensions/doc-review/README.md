# Doc Review Extension

Comprehensive documentation review tool for Pi. Detects contradictions, detail loss, misalignment, and verified improvements in modified `.md` files against source material.

## 🎯 Purpose

- **Input**: Modified `.md` files in workspace vs git HEAD
- **Sources**: Full memory hierarchy + Pi SDK docs + git history (30k token budget)
- **Output**: Structured findings grouped by issue type
- **Rigor**: No side-quests, facts only, verified improvements

## 📋 Workflow

### Phase 1: Collect Modified Docs
- Find `.md` files with `git diff --name-only HEAD`
- Fetch unmodified version from git HEAD (source-of-truth)
- Store both current and baseline for comparison

### Phase 2: Fetch Git History
- `git log -p --follow -n10` per file
- Clean diff noise (keep only diff hunks)
- Track commit context for intentional changes

### Phase 3: Load Source Context (30k budget)
**Priority order:**
1. `memory/mindbase/identity/*` (mandates, rigor)
2. `memory/mindbase/processes/*` (workflows)
3. `memory/knowledgebase/*` (decisions, projects)
4. `memory/mindbase/skills/*` (patterns)
5. `.pi/extensions/**/*.md` (Pi config docs)
6. Pi SDK docs (`/opt/homebrew/.../docs/**/*.md`)
7. Remaining `memory/**/*.md`

Hard stop when budget exhausted. Token estimate: 1 token ≈ 4 characters.

### Phase 4: Call Review Model
- Provider: `github-copilot`
- Model: `claude-haiku-4.5`
- Endpoint: GitHub Copilot API
- Budget: Remaining tokens for LLM reasoning

### Phase 5: Parse Response
- Extract JSON findings (contradiction, detail_loss, misalignment, improvement)
- Fallback to local analysis if model fails
- Group by severity: high > medium > low

### Phase 6: Report
- Structured JSON with exact citations
- No narrative; pure data

## 🛠️ Usage

### Command (Interactive)
```bash
/doc-review
```

### Tool (LLM-callable)
```
LLM calls: doc_review_files { budgetTokens?: 30000, forceModel?: boolean }
```

## 📁 Extension Structure

```
.pi/extensions/doc-review/
├── index.ts        # Extension entry point, command + tool registration
├── types.ts        # TypeScript interfaces (DocChange, ReviewResult, etc.)
├── collector.ts    # Git operations, file collection
├── context.ts      # Source context loader, budget management
├── analysis.ts     # Local change analysis, finding formatting
└── prompt.ts       # LLM prompt builders
```

### Module Responsibilities

| Module | Responsibility |
|--------|---|
| `index.ts` | Entry point, command/tool registration, phase orchestration |
| `collector.ts` | Git diff, git log, token estimation, diff noise stripping |
| `context.ts` | File discovery, priority-based loading, token budgeting |
| `analysis.ts` | Line-level diff, local issue detection, result formatting |
| `prompt.ts` | Review prompt builder, verification prompt builder |
| `types.ts` | All TypeScript interfaces and enums |

## 🔑 Key Concepts

### Source-of-Truth Hierarchy
1. **Unmodified docs** (git HEAD) — primary reference
2. **Modified history** (git log) — detect intentional changes
3. **Memory/ full load** — catch interdoc inconsistencies
4. **All reference material** (.pi/, SDK) — catch divergence

### Token Budget
- **Total**: 30k tokens
- **Allocation**:
  - Mandates + rigor: ~2k
  - Processes: ~8k
  - Knowledge base: ~10k
  - Skills: ~5k
  - Pi + SDK docs: ~5k
- **Hard stop**: Fail if any source exceeds remaining budget

### Finding Types
- **contradiction**: Current conflicts with source
- **detail_loss**: Structured info removed without justification
- **misalignment**: Diverges from patterns in memory or Pi docs
- **improvement**: Improves clarity while maintaining accuracy (must be verified)

### Severity Levels
- **high**: Contradictions, critical detail loss
- **medium**: Misalignment, minor detail loss
- **low**: Edge cases, marginal improvements

## 🔒 Safety & Rigor

### No Side-Quests
- Only review what was asked
- Don't analyze code, only `.md` documentation
- Don't suggest refactors outside scope

### No "Told You So" Mentality
- Prefer rigor over having an answer
- Flag uncertainty explicitly
- Cite sources, don't assume

### Improvement Verification
- All improvements must be verified against source
- No improvements based on opinion
- Verification call to model if needed

## 📊 Output Format

### Command Output
Sets editor text with full JSON result + structured findings.

### Tool Output
Returns JSON:
```typescript
{
  findings: ReviewFinding[],
  summary: {
    contradictions: number,
    detail_losses: number,
    misalignments: number,
    improvements: number,
    timestamp: string
  }
}
```

### Finding Structure
```typescript
{
  type: "contradiction" | "detail_loss" | "misalignment" | "improvement",
  severity: "high" | "medium" | "low",
  file: "path/to/doc.md",
  section: "heading or line range",
  description: "What's wrong/improved? (specific, 1-2 sentences)",
  evidence: {
    current: "exact quote from modified doc",
    source: "exact quote from reference",
    commit?: "optional commit hash if relevant"
  },
  verification?: "For improvements: why correct based on sources"
}
```

## ⚙️ Configuration

### Environment Variables
- `GITHUB_TOKEN` or `COPILOT_API_KEY` — github-copilot API authentication

### Parameters
- `budgetTokens` (optional, default: 30000) — override token budget
- `forceModel` (optional, default: false) — skip model call, use local analysis only

## 🧪 Testing

Verify extension structure:
```bash
node .pi/extensions/doc-review/verify.mjs
```

Expected output:
- ✅ Module structure valid
- ✅ Git integration available
- ✅ Memory index accessible
- ✅ Token budgeting logic sound
- ✅ Extension ready for testing

## 🚀 Integration Points

1. **Git**: `git diff`, `git log -p`, `git show HEAD:file`
2. **Model**: GitHub Copilot API (HTTP POST)
3. **Memory**: Reads from `memory/**/*.md`
4. **Pi SDK**: Optional `.pi/extensions/*.md` context
5. **Session**: Can be invoked via LLM tool or `/doc-review` command

## ⚠️ Known Limitations

1. **Token Estimation**: Uses 1 token ≈ 4 chars (rough; actual varies by model)
2. **Diff Noise**: Strips metadata; focuses on content changes only
3. **API Fallback**: If GitHub Copilot fails, reverts to local analysis
4. **JSON Parsing**: Expects model response as valid JSON; fallback if invalid

## 🔍 Troubleshooting

### "No modified .md files found"
- Extension only processes files modified vs `git HEAD`
- Make local changes or create a test file

### "API key not configured"
- Set `GITHUB_TOKEN` or `COPILOT_API_KEY` environment variable
- Verify GitHub Copilot subscription active

### "Model response was not valid JSON"
- Model may have injected narrative text before JSON
- Fallback to local analysis (lower accuracy)
- Check prompt for clarity

### "Budget exceeded"
- Too many sources loaded before hard stop
- Reduce memory file sizes or skip unnecessary source categories

## 📝 Future Enhancements

1. **Streaming output**: Line-by-line updates during analysis
2. **Cached sources**: Memoize source loads per project
3. **Batch mode**: Review multiple sessions in one run
4. **Custom criteria**: Extension hooks for domain-specific rules
5. **Report export**: PDF/markdown report generation
6. **Historical tracking**: Compare across multiple reviews
