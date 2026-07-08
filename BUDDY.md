# LIBRARIAN STEWARDSHIP ENGINE: PHASE 1 COMPLETION

## 🎯 OBJECTIVE
Implement the Librarian Stewardship Engine within omnitool by building the core primitives that power all Librarian verbs without proxying or shortcuts.

## ✅ PHASE 1: KERNEL (COMPLETE)

### Deliverables

#### 1. BinaryResolver (`.pi/librarian/binary-resolver.ts`)
- ✅ Locates lean-ctx binary via `which`
- ✅ Validates binary is executable (tests `--version`)
- ✅ Caches resolution to prevent repeated lookups
- ✅ Returns structured result: `{ binary, isValid, error }`

#### 2. OutputParser (`.pi/librarian/output-parser.ts`)
- ✅ Parses lean-ctx compression footer (`Compressed X → Y tokens (Z%)`)
- ✅ Extracts content without footer pollution
- ✅ Calculates token savings and compression ratio
- ✅ Generates footer with metadata
- ✅ Builds structured results with `ResultMetadata`

#### 3. PathResolver (`.pi/librarian/path-resolver.ts`)
- ✅ Classifies paths: Canonical (must route to wip/) vs. Temp (safe to write directly)
- ✅ Enforces wip/ mirror: `src/index.ts` → `wip/primary/src/index.ts`
- ✅ Implements create-only gate for draft operations
- ✅ Ensures parent directories exist before writes
- ✅ Validates file permissions and existence

**Canonical Roots**: `.pi/extensions`, `.pi/memory`, `.pi/subroutines`, `src/`, `lib/`, `memory/`, `docs/`

#### 4. LedgerManager (`.pi/librarian/ledger-manager.ts`)
- ✅ Atomic append-only ledger operations (no rewrites)
- ✅ Type-safe entry creation: `draft`, `amend`, `finding`, `decision`, `uncertainty`
- ✅ Generates unique ledger IDs with timestamp + random suffix
- ✅ Ensures BUDDY.md exists and initializes structure
- ✅ Records provenance: timestamp, type, scope, data
- ✅ Methods: `recordDraft()`, `recordAmend()`, `recordFinding()`, `recordDecision()`

#### 5. LibrarianService (`.pi/librarian/librarian-service.ts`)
- ✅ Orchestrates all primitives
- ✅ **index()**: Maps project structure via lean-ctx
- ✅ **fetch()**: Reads file with optional line-range slicing
- ✅ **search()**: Pattern scan with compression stats
- ✅ **knowledge()**: Query L3 memory + L2 reconciliation
- ✅ **note()**: Log working memory + BUDDY.md update
- ✅ **draft()**: Create-only to wip/ + ledger (enforces mirror logic)
- ✅ **amend()**: Surgical edit to wip/ + ledger (validates oldText uniqueness)
- ✅ **audit()**: Verify correctness of target

**All verbs return structured `LibrarianResult<T>` with metadata including `tokensSaved`, `compressionRatio`, `source`, `timestamp`, and `ledgerRef`.**

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Dual-Path Execution** | CLI for stateless ops (index, search, knowledge) + McpBridge for cached ops (fetch) |
| **Token Stewardship** | Every verb returns `ResultMetadata` with savings/ratio; no lossy compression |
| **wip/ Mirror Enforcement** | Canonical paths automatically route to `wip/primary/` to prevent accidental mutations |
| **Atomic Ledger** | Append-only, no rewrites; preserves audit trail; atomic timestamp+ID per operation |
| **Create-Only Gate** | draft() checks file non-existence; amend() requires exact oldText match (1x) |

### False Win Risk Mitigations Built In

| Risk | Mitigation |
|---|---|
| Fetch returns partial, caller assumes complete | Return `truncation` flag + limit hint |
| draft/amend fail silently due to wip/ issues | Explicit path validation + error propagation |
| Knowledge returns stale facts | Dual-source query (L3 + L2) with reconciliation |
| Note corrupts BUDDY.md structure | Type-safe append with markdown formatting |
| Audit passes but tests don't exist | Explicit test discovery + skip detection |

### File Structure Created

```
.pi/librarian/
├── binary-resolver.ts          (91 lines)  - Locate + validate lean-ctx
├── output-parser.ts            (104 lines) - Parse + compress CLI output
├── path-resolver.ts            (159 lines) - Enforce wip/ mirror
├── ledger-manager.ts           (197 lines) - Atomic BUDDY.md operations
├── librarian-service.ts        (479 lines) - Orchestrator + all verbs
├── librarian-service.test.ts   (278 lines) - Full test suite (mocha)
└── index.ts                    (36 lines)  - Exports + namespace
```

**Total: 1,344 lines of rigor-driven, testable code.**

---

## 🎯 PHASE 2: VERBS (NEXT)

Integrate LibrarianService into omnitool dispatcher:

- [ ] Wire Librarian verbs into omnitool `action` router
- [ ] Map incoming params to verb methods
- [ ] Handle error cases + return structured responses
- [ ] Test illegal calls (shell, ctx_*, direct fs) are blocked

---

## 🎯 PHASE 3: INTEGRATION

- [ ] Update omnitool agent system prompt with Librarian registry
- [ ] Build verification tests (Primitive Mapping Table validation)
- [ ] Document Librarian verbs in omnitool spec

---

## 🎯 PHASE 4: VERIFICATION

- [ ] Illegal call test (attempt shell/ctx_* → verify failure)
- [ ] Audit trace test (verify `.pi/logs/tool_call.json` reflects operations)
- [ ] Full cycle test (knowledge → note → draft → amend → audit)
- [ ] AC checklist (all Librarian verbs implemented per spec)

---

## 🧠 WORKING NOTES

### Phase 1 → Phase 2 Transition

**Phase 1 Completion**:
- ✅ 5 core primitives: BinaryResolver, OutputParser, PathResolver, LedgerManager, LibrarianService
- ✅ 8 verbs fully implemented with gate logic + error handling
- ✅ 21 unit tests PASSING (all primitives, all verbs, all gates)
- ✅ Zero new npm dependencies added
- ✅ System prompt updated with Librarian registry

**Phase 2 Deliverables** (Complete, not wired):
- ✅ Test suite execution: `npm run test:ext:librarian` → 21/21 PASS
- ✅ System prompt: Added Librarian registry section (`.pi/SYSTEM.md`)
- ✅ Integration Guide: Exact code snippets + API reference (`.pi/librarian/INTEGRATION-GUIDE.md`)
- ✅ Integration Checklist: 15+ verification tests (`.pi/librarian/INTEGRATION-CHECKLIST.md`)

**Constraint Honored**: Do NOT wire into omnitool directly.
- ❌ Did NOT edit `.pi/extensions/omnitool/index.ts`
- ✅ Provided reference code (human can execute)
- ✅ Documented via guide (human can review)

**What's Ready**:
- `.pi/librarian/` — 11 files, 2,900+ lines total
- All verbs testable independently
- All gates verified by tests
- Ledger operations atomic
- Token tracking on every verb

**Next Phase** (Human-initiated):
1. Human reviews INTEGRATION-GUIDE.md
2. Human wires 8 action cases into omnitool
3. Human runs INTEGRATION-CHECKLIST.md verification
4. Agent uses Librarian verbs in agent loop (Phase 3)

---

## 🚧 HANDOVER

**Status**: ✅ PHASE 2 COMPLETE — DOCUMENTATION & VERIFICATION READY

### What Was Delivered

**Phase 1: Kernel** (Complete)
- 5 core primitives + LibrarianService orchestrator
- 8 verbs with gates + error handling
- 21 tests PASSING

**Phase 2: Verification & Documentation** (Complete, NOT wired)
- ✅ **Test Suite**: `npm run test:ext:librarian` → 21/21 PASS
- ✅ **System Prompt**: Updated `.pi/SYSTEM.md` with Librarian registry
- ✅ **Integration Guide**: `.pi/librarian/INTEGRATION-GUIDE.md` (exact code, API reference, error handling)
- ✅ **Integration Checklist**: `.pi/librarian/INTEGRATION-CHECKLIST.md` (15+ verification tests)

### Files Delivered (Phase 2)
- `.pi/librarian/INTEGRATION-GUIDE.md` (450 lines) — How to wire + API reference
- `.pi/librarian/INTEGRATION-CHECKLIST.md` (320 lines) — Verification tests
- `.pi/SYSTEM.md` (updated) — Librarian registry documented
- `package.json` (updated) — Added `test:ext:librarian` script
- `tsconfig.tests.json` (updated) — Includes librarian test files

**Total Phase 1+2**: 11 files in `.pi/librarian/`, 2,900+ lines

### Key Results

| Metric | Status |
|---|---|
| **Tests Passing** | ✅ 21/21 (100%) |
| **Verbs Implemented** | ✅ 8/8 (index, fetch, search, knowledge, note, draft, amend, audit) |
| **Gates Enforced** | ✅ Create-only gate, uniqueness check, path validation |
| **Ledger Atomic** | ✅ Append-only with type-safe entries |
| **Token Stewardship** | ✅ Tracked on all verbs |
| **wip/ Mirror** | ✅ Auto-enforced for canonical paths |
| **npm Dependencies** | ✅ ZERO added |
| **Wired to omnitool** | ❌ Not executed (per constraint) |

### Next: Phase 3 (Human-Initiated)

When ready, human should:

1. **Review**:
   - `.pi/librarian/INTEGRATION-GUIDE.md` (code snippets + API)
   - `.pi/librarian/INTEGRATION-CHECKLIST.md` (verification plan)

2. **Execute**:
   - Edit `.pi/extensions/omnitool/index.ts` (add 8 action cases)
   - Run `npm run test:ext:librarian` (verify)
   - Run integration checklist (manual verification)

3. **Verify**:
   - All 15+ checklist items pass
   - tool_call.json logs all operations
   - BUDDY.md ledger grows with each operation

4. **Go-Live**:
   - Agent gains access to 8 Librarian verbs
   - All writes route through wip/ mirror
   - All operations logged + auditable

### Constraint Honored

❌ **Do NOT wire into omnitool directly** → ✅ **Not executed**
- Provided reference code (human can copy/paste)
- Documented pathway (human can review)
- Integration gated behind human approval

### No Blockers

- All primitives tested independently
- All verbs functional in isolation
- All gates verified
- Test suite passes 100%
- Ready for human-driven integration whenever approved
