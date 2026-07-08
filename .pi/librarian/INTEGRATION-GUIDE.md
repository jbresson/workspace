# LIBRARIAN STEWARDSHIP ENGINE: INTEGRATION GUIDE

**Status**: Ready for manual integration (DO NOT auto-execute)

---

## Overview

This document specifies how to wire the `LibrarianService` into omnitool's dispatcher. It is NOT an execution plan—it is a reference for human review and approval.

---

## Phase 2.3: Integration Pathway

### Step 1: Import LibrarianService

**File**: `.pi/extensions/omnitool/index.ts`

**Add to imports**:
```typescript
import { LibrarianService } from '../librarian';
```

---

### Step 2: Map Librarian Verbs to Action Cases

In the omnitool action dispatcher, add these cases:

```typescript
case 'index': {
  const service = new LibrarianService(params.ticketId);
  const result = await service.index(params.scope);
  return result;
}

case 'fetch': {
  const service = new LibrarianService(params.ticketId);
  const result = await service.fetch(params.path, params.offset, params.limit);
  return result;
}

case 'search': {
  const service = new LibrarianService(params.ticketId);
  const result = await service.search(params.pattern, params.scope);
  return result;
}

case 'knowledge': {
  const service = new LibrarianService(params.ticketId);
  const result = await service.knowledge(params.query);
  return result;
}

case 'note': {
  const service = new LibrarianService(params.ticketId);
  const result = await service.note(params.type, params.content);
  return result;
}

case 'draft': {
  const service = new LibrarianService(params.ticketId);
  const result = await service.draft(params.path, params.content);
  return result;
}

case 'amend': {
  const service = new LibrarianService(params.ticketId);
  const result = await service.amend(params.path, params.oldText, params.newText);
  return result;
}

case 'audit': {
  const service = new LibrarianService(params.ticketId);
  const result = await service.audit(params.target);
  return result;
}
```

---

### Step 3: Update Tool Call Logging

Ensure `.pi/logs/tool_call.json` captures all Librarian actions:

**Expected log entry format**:
```json
{
  "timestamp": "2026-06-21T10:30:00Z",
  "action": "draft",
  "params": {
    "ticketId": "TICKET-001",
    "path": "src/new-feature.ts",
    "content": "..."
  },
  "status": "success",
  "result": {
    "success": true,
    "metadata": {
      "tokensSaved": 0,
      "compressionRatio": 0,
      "source": "cache",
      "timestamp": "2026-06-21T10:30:00Z"
    },
    "ledgerRef": "wip/TICKET-001/BUDDY.md#2026-06-21T10-30-00-abc123"
  }
}
```

---

## API Reference

### index(scope?: string)

**Params**:
- `scope` (optional): Scope to index (e.g., `'src'`, `'.pi/extensions'`)

**Returns**:
```typescript
{
  success: boolean;
  data: { structure: any };
  metadata: { tokensSaved, compressionRatio, source, timestamp };
  ledgerRef?: string;
}
```

**Ledger**: Finding entry

---

### fetch(path, offset?, limit?)

**Params**:
- `path` (string, required): File path to read
- `offset` (number, optional): Start line (1-indexed)
- `limit` (number, optional): Max lines to return

**Returns**:
```typescript
{
  success: boolean;
  data: string; // File content (sliced if offset/limit)
  metadata: { tokensSaved, compressionRatio, source, timestamp };
  ledgerRef?: string;
}
```

**Gates**:
- File must exist
- If limit < total lines, truncation flag set

**Ledger**: Finding entry

---

### search(pattern, scope?)

**Params**:
- `pattern` (string, required): Regex pattern to search
- `scope` (string, optional): Scope to search

**Returns**:
```typescript
{
  success: boolean;
  data: { matches: Match[], count: number };
  metadata: { tokensSaved, compressionRatio, source, timestamp };
  ledgerRef?: string;
}
```

**Ledger**: Finding entry with match count

---

### knowledge(query)

**Params**:
- `query` (string, required): Knowledge query

**Returns**:
```typescript
{
  success: boolean;
  data: {
    facts: Fact[];
    sources: ['L3', 'L2'];
    reconciled: boolean;
  };
  metadata: { tokensSaved, compressionRatio, source, timestamp };
  ledgerRef?: string;
}
```

**Dual-Source**: Reconciles L3 (memory) with L2 (session)

**Ledger**: Finding entry

---

### note(type, content)

**Params**:
- `type` (string): Entry type (`'finding' | 'decision' | 'uncertainty'`)
- `content` (Record<string, any>): Content object

**Returns**:
```typescript
{
  success: boolean;
  metadata: { source: 'cache', timestamp };
  ledgerRef: string;
}
```

**Type-Safe**: Validates entry type matches schema

**Ledger**: Appends entry to BUDDY.md (atomic)

---

### draft(path, content)

**Params**:
- `path` (string): File path (canonical or wip/)
- `content` (string): File content

**Returns**:
```typescript
{
  success: boolean;
  metadata: { source: 'cache', timestamp };
  ledgerRef: string;
}
```

**wip/ Mirror**: Canonical paths auto-routed to `wip/primary/<path>`

**Create-Only Gate**: Fails if file exists. Use `amend` instead.

**Ledger**: Draft entry with mirror path

---

### amend(path, oldText, newText)

**Params**:
- `path` (string): File path (must exist in wip/)
- `oldText` (string): Text to replace (must match exactly 1x)
- `newText` (string): Replacement text

**Returns**:
```typescript
{
  success: boolean;
  metadata: { source: 'cache', timestamp };
  ledgerRef: string;
}
```

**wip/ Mirror**: Canonical paths auto-routed to `wip/primary/<path>`

**Uniqueness Check**: Fails if oldText match count ≠ 1

**Ledger**: Amend entry with change count

---

### audit(target)

**Params**:
- `target` (string): File path to audit

**Returns**:
```typescript
{
  success: boolean;
  data: {
    target: string;
    passed: boolean;
    proof: string[];
  };
  metadata: { source: 'cache', timestamp };
}
```

**Proof**: File existence, size, line count

**Ledger**: None (read-only)

---

## Security Gates & Validation

### 1. Path Validation
- **Canonical Roots**: `.pi/extensions`, `.pi/memory`, `.pi/subroutines`, `src/`, `lib/`, `memory/`, `docs/`
- **Auto-Mirror**: Canonical paths routed to `wip/primary/<path>`
- **Temp Paths**: `wip/`, `.pi/logs`, `.pi/settings` pass-through

### 2. Create-Only Gate (draft)
- **Check**: File must NOT exist in target location
- **Error**: "File already exists; use amend instead"

### 3. Uniqueness Check (amend)
- **Check**: oldText must appear exactly 1 time in file
- **Error**: "oldText match count is N, expected 1"

### 4. Type Validation (note)
- **Types**: `finding | decision | uncertainty`
- **Validation**: Union type guard + runtime check

### 5. File Existence (fetch, amend)
- **Check**: File must exist before read/edit
- **Error**: "File not found" or "File does not exist for amend"

---

## Error Handling

All verbs return `LibrarianResult<T>`:

```typescript
{
  success: boolean;
  data?: T;
  metadata?: ResultMetadata;
  error?: string;
  ledgerRef?: string;
}
```

**Always check `success` before accessing `data`.**

**Example**:
```typescript
const result = await service.draft('src/new.ts', 'content');
if (!result.success) {
  console.error(`Draft failed: ${result.error}`);
  return;
}
console.log(`Created: ${result.ledgerRef}`);
```

---

## Ledger Integration

Every operation (except audit) records an atomic entry to BUDDY.md:

**Location**: `wip/<ticketId>/BUDDY.md` (or `wip/primary/BUDDY.md` if no ticketId)

**Entry Format**:
```markdown
### [DRAFT] 2026-06-21T10-30-00-abc123
- **Scope**: root
- **Timestamp**: 2026-06-21T10:30:00Z
- **filePath**: src/new.ts
- **wipPath**: wip/primary/src/new.ts
- **mirror**: true
```

**Ledger Refs**: `wip/<ticketId>/BUDDY.md#<entryId>`

---

## Testing Checklist (Pre-Integration)

- [ ] Import LibrarianService compiles
- [ ] All 8 action cases added without syntax errors
- [ ] Logging captures all actions
- [ ] Manual test: `omnitool({ action: 'index' })` succeeds
- [ ] Manual test: `omnitool({ action: 'draft', params: { path: 'wip/test.txt', content: 'test' } })` creates file in wip/
- [ ] Manual test: Verify BUDDY.md ledger entry created
- [ ] Manual test: Create-only gate rejects second draft
- [ ] Manual test: amend updates file + creates ledger entry

---

## Security Verification (Post-Integration)

- [ ] Attempt illegal actions: `omnitool({ action: 'shell', ... })` → blocked
- [ ] Attempt direct ctx_read: Not available in agent context
- [ ] Verify canonical paths route to wip/
- [ ] Verify all operations logged to tool_call.json
- [ ] Full cycle test: knowledge → note → draft → amend → audit

---

## Rollback Plan

If integration introduces issues:

1. **Revert dispatcher**: Remove the 8 action cases from `.pi/extensions/omnitool/index.ts`
2. **Clear wip/**: `rm -rf wip/primary/*`
3. **Verify**: Old omnitool actions still work
4. **Root Cause**: Review integration errors in tool_call.json

---

## Reference Files

- **Implementation**: `.pi/librarian/librarian-service.ts` (main orchestrator)
- **Primitives**: `.pi/librarian/binary-resolver.ts`, `output-parser.ts`, `path-resolver.ts`, `ledger-manager.ts`
- **Tests**: `.pi/librarian/librarian-service.test.ts` (21 tests, all passing)
- **Architecture**: `.pi/librarian/README.md`
- **Verification**: `.pi/librarian/PRIMITIVE-MAPPING-VERIFICATION.md`

---

## Next Steps (After Approval)

1. Human reviews this integration guide
2. Human executes wiring into `.pi/extensions/omnitool/index.ts`
3. Run full test suite: `npm run test:ext:librarian`
4. Execute security verification checklist
5. Go-live: Agent can use all 8 Librarian verbs

---

**Status**: Ready for human review & approval. No auto-execution.
