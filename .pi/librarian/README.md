# 📚 Librarian Stewardship Engine - Architecture

## Overview

The Librarian Stewardship Engine is a rigorous, non-proxying implementation of the Librarian's Registry within omnitool. It provides 8 core verbs for file I/O, memory querying, and workspace orchestration—all with token stewardship, wip/ mirror enforcement, and atomic ledger operations.

## Primitive Mapping Table (Reference Implementation)

| Verb | Internal Primitive(s) | Execution Path | Token Stewardship | Output Structure |
|---|---|---|---|---|
| **index** | BinaryResolver + lean-ctx CLI | Stateless CLI → OutputParser | Compression footer parsing | `{ structure, metadata }` |
| **fetch** | PathResolver + fs.readFile | Line-range slicing → cache | Truncation flag + savings | `{ content, metadata }` |
| **search** | BinaryResolver + lean-ctx CLI | Pattern scan → OutputParser | Match count + ratio | `{ matches, metadata }` |
| **knowledge** | BinaryResolver + lean-ctx CLI | L3 query + L2 reconciliation | Dual-source compression | `{ facts, metadata }` |
| **note** | LedgerManager → BUDDY.md | Type-safe append | Ledger entry ID + ref | `{ ledgerId, ledgerRef }` |
| **draft** | PathResolver + LedgerManager | Create-only gate → wip/ mirror → ledger | Parent check + atomicity | `{ path, ledgerRef, metadata }` |
| **amend** | PathResolver + LedgerManager | oldText validation → replace → ledger | Uniqueness check + atomicity | `{ delta, ledgerRef, metadata }` |
| **audit** | fs module | Existence + content validation | Proof of correctness | `{ passed, proof, metadata }` |

## Core Primitives

### 1. BinaryResolver (`binary-resolver.ts`)
**Purpose**: Locate and validate lean-ctx binary

```typescript
// Usage
const resolution = BinaryResolver.resolve('lean-ctx');
if (!resolution.isValid) throw new Error(resolution.error);

// Returns
{
  binary: '/opt/homebrew/bin/lean-ctx',
  isValid: true,
  // Cached for subsequent calls
}
```

**Key Features**:
- `which` command resolution
- Binary validation (executable + --version test)
- In-memory caching to prevent repeated lookups
- Error handling + structured results

---

### 2. OutputParser (`output-parser.ts`)
**Purpose**: Parse and compress lean-ctx CLI output with token tracking

```typescript
// Parse output with footer
const parsed = OutputParser.parseLeanCtxOutput(rawOutput);
// { content: "...", stats: { original: 100, compressed: 50, ratio: -50, savings: 50 } }

// Build structured result
const result = OutputParser.buildResult(content, stats, 'cli');
// { content, metadata: { tokensSaved: 50, compressionRatio: -50, source: 'cli', timestamp } }
```

**Key Features**:
- Compression footer parsing (`Compressed X → Y tokens (Z%)`)
- Content extraction without footer pollution
- Token savings calculation
- Structured metadata generation
- Footer formatting with context

---

### 3. PathResolver (`path-resolver.ts`)
**Purpose**: Enforce wip/ mirror for Canonical Intelligence

```typescript
// Classify and resolve paths
const result = PathResolver.resolve('src/index.ts', true);
// { 
//   original: 'src/index.ts',
//   resolved: 'wip/primary/src/index.ts',
//   isMirror: true,
//   isCanonical: true
// }

// Create-only gate
const gate = PathResolver.checkCreateOnlyGate(wipPath);
if (!gate.allowed) throw new Error(gate.reason); // "File already exists; use amend instead"
```

**Canonical Roots** (auto-mirror to wip/):
- `.pi/extensions`
- `.pi/memory`
- `.pi/subroutines`
- `src/`, `lib/`, `memory/`, `docs/`

**Key Features**:
- Path classification (canonical vs. temp)
- Automatic wip/ mirror routing
- Parent directory validation + creation
- Create-only gate enforcement
- Atomic permission checks

---

### 4. LedgerManager (`ledger-manager.ts`)
**Purpose**: Atomic, append-only BUDDY.md ledger operations

```typescript
// Create entries
const ledger = new LedgerManager('ticket-id');

const result = await ledger.recordDraft('src/index.ts', 'wip/primary/src/index.ts', true);
// { 
//   success: true,
//   ledgerId: '2026-06-21T10-30-00-abc123',
//   ledgerRef: 'wip/ticket-id/BUDDY.md#2026-06-21T10-30-00-abc123'
// }

// Read ledger
const content = ledger.readLedger();
```

**Entry Types**:
- `draft`: File creation operation
- `amend`: File modification operation
- `finding`: Evidence-backed fact
- `decision`: Irreversible choice with rollback plan
- `uncertainty`: Open question with owner + resolution trigger

**Key Features**:
- Unique ID generation (timestamp + random)
- Markdown formatting + structure preservation
- Type-safe entries
- Atomic file writes
- Ledger path resolution

---

### 5. LibrarianService (`librarian-service.ts`)
**Purpose**: Orchestrate all primitives and implement Librarian verbs

```typescript
// Initialize service with optional ticket context
const service = new LibrarianService('ticket-id');

// Use any verb
const result = await service.index('src');
const fetch = await service.fetch('src/index.ts', 1, 100); // offset, limit
const search = await service.search('TODO', 'src');
const knowledge = await service.knowledge('authentication patterns');
const note = await service.note('finding', { fact: '...', confidence: 'high' });
const draft = await service.draft('wip/new-file.ts', 'content');
const amend = await service.amend('wip/new-file.ts', 'old', 'new');
const audit = await service.audit('wip/new-file.ts');
```

**Verb Specifications**:

#### index(scope?: string)
Maps project structure via lean-ctx.
- **Returns**: `{ structure, metadata }`
- **Ledger**: Records as finding

#### fetch(filePath, offset?, limit?)
Reads file with line-range slicing.
- **Returns**: `{ content, metadata }`
- **Truncation Flag**: Set if limit hit
- **Ledger**: Records as finding

#### search(pattern, scope?)
Pattern scan across codebase.
- **Returns**: `{ matches: Match[], count, metadata }`
- **Ranked**: By lean-ctx compression
- **Ledger**: Records as finding

#### knowledge(query)
Query L3 memory with L2 reconciliation.
- **Returns**: `{ facts, sources: ['L3', 'L2'], reconciled: true, metadata }`
- **Dual-Source**: Validates consistency
- **Ledger**: Records as finding

#### note(type, content)
Log working memory + BUDDY.md update.
- **Returns**: `{ metadata, ledgerRef }`
- **Type-Safe**: finding | decision | uncertainty
- **Atomic**: BUDDY.md append

#### draft(filePath, content)
Create-only to wip/ mirror + ledger.
- **Returns**: `{ metadata, ledgerRef }`
- **Gate**: File must NOT exist
- **Mirror**: Auto-routes canonical to wip/primary/
- **Atomic**: File + ledger entry

#### amend(filePath, oldText, newText)
Surgical edit to wip/ + ledger.
- **Returns**: `{ metadata, ledgerRef }`
- **Validation**: oldText must match exactly once
- **Mirror**: Auto-routes canonical to wip/primary/
- **Atomic**: File + ledger entry

#### audit(target)
Verify correctness of target.
- **Returns**: `{ target, passed: boolean, proof: string[], metadata }`
- **Proof**: File size, line count, readability
- **Extensible**: Can add test discovery later

---

## Design Rationale

### Why Not a Simple Proxy?

The **Primitive Mapping Table** is NOT a "verb-to-CLI-string" mapper. Each design decision prevents a Path of Least Resistance violation:

| Violation | Prevention | Implementation |
|---|---|---|
| Lossy compression | Token stewardship | `ResultMetadata` on every verb with `tokensSaved` |
| Canonical mutation | wip/ mirror enforcement | PathResolver auto-routes + gates |
| Data loss | Atomic ledger | LedgerManager append-only + type-safe entries |
| Silent failures | Structured errors | `LibrarianResult<T>` with `error` field |
| Unverifiable correctness | Proof-of-compliance | Ledger refs, gate checks, metadata |

### Token Efficiency

Every verb returns `ResultMetadata`:
```typescript
{
  tokensSaved: number,       // Compression gains
  compressionRatio: number,  // % reduction
  source: 'cli' | 'cache',   // Where data came from
  timestamp: string          // ISO 8601
}
```

This enables future optimization: agent can track savings/cost per operation and tune strategy.

### wip/ Mirror Pattern

**Before (No Mirror)**:
```
agent writes directly to src/index.ts
→ Risk: Canonical mutation without review
→ No rollback: File contaminated forever
```

**After (wip/ Mirror)**:
```
agent writes to wip/primary/src/index.ts
→ Canonical src/index.ts untouched
→ User reviews wip/ before graduation
→ Graduation = merge wip/ to canonical (user-only command)
```

### Atomic Ledger Design

**Before (No Ledger)**:
```
agent edits file
→ What changed?
→ Who approved it?
→ Can we audit?
→ NO
```

**After (Atomic Ledger)**:
```
agent edits file
→ Ledger entry recorded atomically
  {
    id: '2026-06-21T10-30-00-abc123',
    timestamp: '2026-06-21T10:30:00Z',
    type: 'amend',
    scope: 'repo',
    data: { filePath: 'src/index.ts', oldText, newText }
  }
→ Linked in BUDDY.md: "[AMEND] ...#id"
→ Full audit trail: grep BUDDY.md for all changes
→ Provenance preserved: timestamp + randid prevents collisions
```

---

## False Win Risk Mitigations

Each verb has specific checks built in:

### 1. Fetch Truncation
**Risk**: Fetch returns 100 lines, caller assumes file is 100 lines.
**Mitigation**: Return `truncation: boolean` flag + hint `"truncated at limit 100"`.

### 2. draft Create-Only Gate
**Risk**: draft overwrites existing file silently.
**Mitigation**: `PathResolver.checkCreateOnlyGate()` throws if file exists. Caller must use amend.

### 3. amend Uniqueness Check
**Risk**: oldText appears 3x, replacement corrupts file.
**Mitigation**: Regex match count validation. Fails if count ≠ 1.

### 4. knowledge Reconciliation
**Risk**: L3 returns stale fact, outdated by L2 session data.
**Mitigation**: Dual-source query + timestamp comparison. Mark reconciliation status.

### 5. note Structure Preservation
**Risk**: BUDDY.md becomes corrupted JSON/YAML hybrid.
**Mitigation**: Type-safe markdown append with validated header + field structure.

### 6. audit Proof
**Risk**: Audit passes but deployed code is broken.
**Mitigation**: Explicit proof generation (file size, line count, syntax if available).

---

## Test Suite

**File**: `librarian-service.test.ts` (mocha)

**Covers**:
- BinaryResolver caching + missing binary handling
- OutputParser footer parsing + content extraction
- PathResolver path classification + mirror routing + gate enforcement
- LedgerManager unique ID generation + append ordering
- LibrarianService all 8 verbs + error cases

**Run**:
```bash
npm run test:ext:librarian
```

---

## Integration Points (Phase 2)

The LibrarianService is ready to be integrated into omnitool:

```typescript
// In omnitool dispatcher (.pi/extensions/omnitool/index.ts)
case 'index':
  const indexService = new LibrarianService(params.ticketId);
  return await indexService.index(params.scope);

case 'fetch':
  const fetchService = new LibrarianService(params.ticketId);
  return await fetchService.fetch(params.path, params.offset, params.limit);

// ... etc for all 8 verbs
```

**Expected omnitool usage**:
```javascript
// Agent code
omnitool({
  action: 'index',
  params: { scope: 'src' }
})

omnitool({
  action: 'draft',
  params: { 
    ticketId: 'TASK-001',
    path: 'src/new-feature.ts',
    content: '...'
  }
})

omnitool({
  action: 'amend',
  params: {
    ticketId: 'TASK-001',
    path: 'src/new-feature.ts',
    oldText: '...',
    newText: '...'
  }
})
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    LibrarianService                          │
│                  (Verb Orchestrator)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬────────────────┐
        │              │              │                │
   BinaryResolver  OutputParser  PathResolver    LedgerManager
        │              │              │                │
        ├─ validates   ├─ parses      ├─ routes      ├─ appends
        ├─ caches      ├─ compresses  ├─ gates        ├─ types
        └─ errors      └─ metadata    └─ validates    └─ tracks

        Result: LibrarianResult<T>
        {
          success: boolean,
          data: T,
          metadata: ResultMetadata,
          error?: string,
          ledgerRef?: string
        }
```

---

## Next: Phase 2 (Integration)

1. Integrate LibrarianService into omnitool dispatcher
2. Map Librarian actions to verb methods
3. Execute test suite
4. Update system prompt with Librarian registry
5. Verify illegal calls (shell, ctx_*) are blocked
6. Full cycle test: knowledge → note → draft → amend → audit
