# LIBRARIAN STEWARDSHIP ENGINE: INTEGRATION CHECKLIST

**Use this checklist AFTER wiring LibrarianService into omnitool. Do NOT execute until integration is complete.**

---

## Pre-Integration Verification

- [ ] All 21 tests passed locally
  ```bash
  node --test .tmp-test-dist/.pi/librarian/librarian-service.test.js
  ```

- [ ] Zero new npm dependencies added
  - Verify `package.json` unchanged (except test script)

- [ ] LibrarianService compiles
  ```bash
  npm run build:test 2>&1 | grep librarian
  # Should have NO errors related to librarian/
  ```

---

## Integration Tests (Post-Wiring)

### 1. Import & Compilation

- [ ] LibrarianService imports successfully
  - Check: No TypeScript errors in omnitool/index.ts
  
- [ ] All 8 action cases present
  ```typescript
  // Verify these cases exist:
  case 'index':
  case 'fetch':
  case 'search':
  case 'knowledge':
  case 'note':
  case 'draft':
  case 'amend':
  case 'audit':
  ```

- [ ] Dispatcher compiles without errors

---

### 2. Manual Happy-Path Tests

**Test 1: index verb**
```javascript
omnitool({
  action: 'index',
  params: { scope: 'src' }
})
```
- [ ] Returns `{ success: true, data: {...}, metadata: {...} }`
- [ ] metadata has `tokensSaved` field
- [ ] Ledger entry created in BUDDY.md

**Test 2: fetch verb**
```javascript
omnitool({
  action: 'fetch',
  params: { path: '/tmp/test.txt' }
})
// First create the file:
// echo "line1\nline2\nline3" > /tmp/test.txt
```
- [ ] Returns `{ success: true, data: "line1\nline2\nline3" }`
- [ ] Ledger entry created

**Test 3: search verb**
```javascript
omnitool({
  action: 'search',
  params: { pattern: 'TODO', scope: 'src' }
})
```
- [ ] Returns `{ success: true, data: { matches: [...], count: N } }`
- [ ] Ledger entry created

**Test 4: draft verb (wip mirror)**
```javascript
omnitool({
  action: 'draft',
  params: {
    path: 'src/new-feature.ts',
    content: 'console.log("new feature");'
  }
})
```
- [ ] Returns `{ success: true, ledgerRef: "wip/primary/..." }`
- [ ] File created at `wip/primary/src/new-feature.ts` (NOT `src/`)
- [ ] Ledger entry has `mirror: true`

**Test 5: draft create-only gate**
```javascript
omnitool({
  action: 'draft',
  params: {
    path: 'src/new-feature.ts',
    content: 'overwrite'
  }
})
```
- [ ] Returns `{ success: false, error: "already exists" }`
- [ ] No file overwritten
- [ ] No ledger entry

**Test 6: amend verb**
```javascript
omnitool({
  action: 'amend',
  params: {
    path: 'src/new-feature.ts',
    oldText: 'console.log("new feature");',
    newText: 'console.log("updated feature");'
  }
})
```
- [ ] Returns `{ success: true, ledgerRef: "wip/primary/..." }`
- [ ] File content changed at `wip/primary/src/new-feature.ts`
- [ ] Ledger entry records change

**Test 7: amend uniqueness gate**
```javascript
// File has: "foo\nbar\nfoo"
omnitool({
  action: 'amend',
  params: {
    path: 'src/test.ts',
    oldText: 'foo',
    newText: 'baz'
  }
})
```
- [ ] Returns `{ success: false, error: "match count is 2" }`
- [ ] File NOT modified
- [ ] No ledger entry

**Test 8: note verb**
```javascript
omnitool({
  action: 'note',
  params: {
    type: 'finding',
    content: { fact: 'Authentication works', confidence: 'high' }
  }
})
```
- [ ] Returns `{ success: true, ledgerRef: "wip/primary/BUDDY.md#..." }`
- [ ] Ledger entry created with type-safe structure

**Test 9: audit verb**
```javascript
omnitool({
  action: 'audit',
  params: { target: 'wip/primary/src/new-feature.ts' }
})
```
- [ ] Returns `{ success: true, data: { passed: true, proof: [...] } }`
- [ ] Proof array has file size, line count, etc.

---

### 3. Security Gates Verification

**Test 10: Illegal action blocked**
```javascript
omnitool({
  action: 'shell',
  params: { command: 'rm -rf /' }
})
```
- [ ] Fails with error (action not recognized)
- [ ] No execution

**Test 11: Direct ctx_read blocked**
```javascript
omnitool({
  action: 'ctx_read',
  params: { path: 'src/secret.ts' }
})
```
- [ ] Fails with error
- [ ] Canonical paths cannot be accessed directly

**Test 12: wip/ mirror enforced**
```javascript
// Canonical path must route to wip/primary/
omnitool({
  action: 'draft',
  params: {
    path: '.pi/extensions/new-ext.ts',
    content: 'export {};'
  }
})
```
- [ ] File created at `wip/primary/.pi/extensions/new-ext.ts`
- [ ] NOT at `.pi/extensions/new-ext.ts`
- [ ] Ledger shows `mirror: true`

---

### 4. Ledger Integrity

- [ ] BUDDY.md file exists
  ```bash
  ls -la wip/primary/BUDDY.md
  ```

- [ ] Ledger entries are append-only (no rewrites)
  ```bash
  grep "^\[DRAFT\]" wip/primary/BUDDY.md | wc -l
  # Should match number of draft calls
  ```

- [ ] Ledger entries have unique IDs
  ```bash
  grep "^\[" wip/primary/BUDDY.md | awk '{print $2}' | sort | uniq -d
  # Should return nothing (no duplicates)
  ```

- [ ] Ledger entries are readable markdown
  ```bash
  cat wip/primary/BUDDY.md | grep -A 5 "\[DRAFT\]"
  # Should have readable structure
  ```

---

### 5. Tool Call Logging

- [ ] `.pi/logs/tool_call.json` captures all actions
  ```bash
  grep '"action": "draft"' .pi/logs/tool_call.json | wc -l
  # Should match number of draft calls
  ```

- [ ] Log entries have correct structure
  ```json
  {
    "timestamp": "2026-06-21T...",
    "action": "draft",
    "params": { "path": "...", "content": "..." },
    "status": "success",
    "result": { "success": true, "ledgerRef": "..." }
  }
  ```

- [ ] Failures logged with errors
  ```bash
  grep '"status": "error"' .pi/logs/tool_call.json
  # Should have entries for failed operations
  ```

---

### 6. Full-Cycle Integration Test

Execute this sequence:

```javascript
// 1. Query knowledge
const k = await omnitool({
  action: 'knowledge',
  params: { query: 'current architecture' }
});
console.log(`Knowledge found:`, k.data.facts.length);

// 2. Record finding
const n = await omnitool({
  action: 'note',
  params: {
    type: 'finding',
    content: { fact: 'Architecture follows MVC', confidence: 'high' }
  }
});
console.log(`Ledger entry:`, n.ledgerRef);

// 3. Create implementation file
const d = await omnitool({
  action: 'draft',
  params: {
    path: 'src/new-controller.ts',
    content: '// MVC controller'
  }
});
console.log(`Draft created:`, d.ledgerRef);

// 4. Amend implementation
const a = await omnitool({
  action: 'amend',
  params: {
    path: 'src/new-controller.ts',
    oldText: '// MVC controller',
    newText: 'export class NewController { }'
  }
});
console.log(`Amendment recorded:`, a.ledgerRef);

// 5. Audit correctness
const au = await omnitool({
  action: 'audit',
  params: { target: 'wip/primary/src/new-controller.ts' }
});
console.log(`Audit passed:`, au.data.passed);
```

**Verification**:
- [ ] All 5 operations return `success: true`
- [ ] All 4 write ops (2-5) have `ledgerRef`
- [ ] BUDDY.md has 4 entries (1 finding, 1 draft, 1 amend, nothing for audit)
- [ ] tool_call.json has 5 entries
- [ ] All timestamps in sequence
- [ ] File exists at correct wip/ path

---

### 7. Edge Case Testing

**Test 13: Empty parameters**
```javascript
omnitool({ action: 'fetch', params: {} })
```
- [ ] Fails gracefully with error message
- [ ] Logged in tool_call.json

**Test 14: Invalid path (outside project)**
```javascript
omnitool({
  action: 'draft',
  params: { path: '../../../../../../etc/passwd', content: 'x' }
})
```
- [ ] Fails gracefully
- [ ] File NOT created outside wip/

**Test 15: Large file fetch**
```javascript
omnitool({
  action: 'fetch',
  params: { path: 'large-file.txt', limit: 10 }
})
```
- [ ] Truncation flag set to true
- [ ] Returns exactly 10 lines
- [ ] Metadata shows truncation

---

### 8. Performance & Resource Checks

- [ ] Token savings tracked
  ```bash
  grep "tokensSaved" .pi/logs/tool_call.json | head -5
  # Should have non-zero values for index/search/knowledge
  ```

- [ ] No memory leaks (spot check)
  ```bash
  # Run 10 drafts in sequence; no performance degradation
  for i in {1..10}; do
    omnitool({ action: 'draft', params: { path: "wip/test-$i.txt", content: "x" } })
  done
  ```
- [ ] All complete in < 1s total

- [ ] Ledger file doesn't bloat unexpectedly
  ```bash
  wc -l wip/primary/BUDDY.md
  # Should be ~4 lines per entry (header + 3 fields)
  ```

---

## Rollback Verification

- [ ] Removed Librarian integration from omnitool
- [ ] Old omnitool actions still work
- [ ] Cleaned wip/ directory
- [ ] No orphaned files

```bash
rm -rf wip/primary
rm -f .pi/logs/tool_call.json
# Reset .pi/extensions/omnitool/index.ts to pre-integration state
npm run test:ext:omnitool
# Old tests still pass
```

- [ ] All tests pass after rollback

---

## Sign-Off

- [ ] **Integrator**: [Name] - Verified all checks
- [ ] **Reviewer**: [Name] - Approved for go-live
- [ ] **Date**: YYYY-MM-DD
- [ ] **Version**: v1.0 (First integration)

---

## Notes

- [ ] Document any deviations from this checklist
- [ ] Record any issues found + resolutions
- [ ] Update this checklist if new tests added

---

**Status**: Ready for execution after wiring complete.
