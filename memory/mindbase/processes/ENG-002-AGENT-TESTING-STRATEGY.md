# Agent-Assisted Testing Strategy for ENG-002

**Document Version:** 1.0  
**Date:** 2026-06-16  
**Status:** Strategy Phase (Pilot Validated)  
**Audience:** Engineers, Agent Orchestrators, QA

---

## Executive Summary

ENG-002 implements a **policy enforcement system** (phase gates + ledger auditing) where complex interactions occur between:
- Spec validation rules (genericity rubric)
- Transaction ledger state (hash integrity, item_id consistency)
- Audit detection (unlogged modifications, tampering)

**Traditional unit testing** is inefficient here because:
1. 💥 **Explosion of test cases**: Genericity rubric has 100+ decision boundaries; spec corpus requires 200+ combinations
2. 🧠 **Adversarial thinking required**: Testing "what bypasses the rubric" needs creative adversarial reasoning
3. 🔄 **Workflow realism**: Multi-step transactions need simulation across edge cases
4. 🐛 **Mutation coverage**: Detecting tampered ledger entries requires systematic corruption

**Agent-assisted testing** solves all four:
- ✅ Generate test cases at scale (parametric generation)
- ✅ Adversarial logic (find loopholes, bypass attempts)
- ✅ Workflow orchestration (multi-step scenarios)
- ✅ Systematic mutation (all corruption categories)

---

## Gate Overview (Renamed)

| Gate ID | Old Name | **New Name** | Phase | Purpose |
|:---|:---|:---|:---|:---|
| A | Gate A | **SpecValidation** | Map→Do | Validate spec contract ready for execution |
| B | Gate B | **RecordedEditTransaction** | Do | Enforce all mutations logged + transactional |
| C | Gate C | **AuditIntegrity** | Verify/Audit | Detect unlogged modifications + tampering |

---

## Agent Testing Taxonomy

### **1. Invariant Adversarial Suite** (SpecValidation)

**Goal:** Find loopholes in the genericity rubric.

**Rubric Rules:**
- Reject if statement `< 24` chars
- Reject if missing normative verb (must/shall/never/always/require/enforce)
- Reject if only single-tech ban (e.g., "no base64")
- Reject if high-risk (`security|data|compliance`) lacks `authority`
- Reject if high-risk lacks `anti_patterns[]`

**Agent Task:**
```typescript
// Agent generates adversarial invariants
const adversarialCases = [
  {
    id: "INV-BYPASS-SHORT",
    class: "security",
    statement: "X is Y",  // ← Too short (< 24)
    authority: "REF",
    anti_patterns: ["z"],
    expected_reject: "statement_too_short"
  },
  {
    id: "INV-BYPASS-NOTVERB",
    class: "security",
    statement: "Cryptographic algorithms must use SHA-256 exclusively",  // ← NO normative verb (all only single impl)
    authority: "REF",
    anti_patterns: ["MD5", "SHA1"],
    expected_reject: "too_narrow_implementation_specific"
  },
  {
    id: "INV-BYPASS-NOAUTH",
    class: "security",
    statement: "All mutations require ledger recording and atomic commitment.",
    // ← No authority (high-risk class)
    anti_patterns: ["direct write"],
    expected_reject: "authority_required"
  }
  // ... 47 more cases
];

// Agent runs validator against each
for (const c of adversarialCases) {
  const result = engine.validateInvariant(c);
  assert(result.rejected === c.expected_reject);
}
```

**Success Criteria:**
- 100% correct accept/reject decisions
- All rubric rules exercised
- False positive rate = 0

**Execution:** Agent batch-runs 50+ cases, captures validator output, scores accuracy.

---

### **2. Ledger Mutation Suite** (AuditIntegrity)

**Goal:** Verify audit detects all tampering categories.

**Mutation Categories:**

| Category | Example | Expected Audit Reason |
|:---|:---|:---|
| **Hash Tampering** | Change `hash_after: 'abc...' → 'xyz...'` | `hash_mismatch:LOG-X` |
| **Timestamp Drift** | Change `timestamp: 2026-06-16 → 2099-01-01` | `timestamp_drift:LOG-X` (future) |
| **Item ID Mismatch** | Change entry `item_id: 'other-item'` | `item_id_mismatch:LOG-X` |
| **Empty Files List** | Change `files: ['x.ts'] → []` | `empty_files_list:LOG-X` |
| **Missing Actor** | Delete `actor_type: 'buddy'` | `actor_type_missing:LOG-X` |
| **Status Flip** | Change `status: 'verified' → 'failed'` | `status_flip_unresolved:LOG-X` |
| **File Path Traversal** | Change `files: ['../../../etc/passwd']` | `path_traversal:LOG-X` |

**Agent Task:**
```typescript
// For each verified log entry
for (const entry of logs.entries.filter(e => e.status === 'verified')) {
  // Generate N mutations
  const mutations = [
    { ...entry, hash_after: 'corrupted_' + entry.hash_after },
    { ...entry, timestamp: '2099-01-01T00:00:00Z' },
    { ...entry, files: [] },
    // ... 7 more
  ];
  
  for (const mut of mutations) {
    const tempLogs = { ...logs, entries: logs.entries.map(e => e.log_id === entry.log_id ? mut : e) };
    const audit = engine.gateSyncAudit(tempLogs, []);
    assert(audit.status === 'fail');
    assert(audit.reasons.length > 0);
  }
}
```

**Success Criteria:**
- All mutation types detected
- Each produces correct reason code
- No false negatives

**Execution:** Agent creates corrupted logs.json, runs audit, validates failure detection.

---

### **3. Multi-Transaction Workflow Suite** (All Gates)

**Goal:** Validate full lifecycle consistency (spec → transactions → audit).

**Workflow Patterns:**

```yaml
workflow_1_simple_pass:
  - phase: "Map"
    action: "spec action=ready"
    expected: "pass"
    verify: "tool_calls.json has spec/ready/pass"
  - phase: "Do"
    action: "safe_edit file1.ts"
    expected: "pass"
    verify: "logs.json has LOG-X1 with timestamp"
  - phase: "Verify"
    action: "audit_change_ledger actualModifiedFiles=[file1.ts]"
    expected: "pass"
    verify: "no unlogged modifications"

workflow_2_unlogged_fail:
  - phase: "Do"
    action: "safe_edit file1.ts (logged)"
    expected: "pass"
  - phase: "Do"
    action: "manually create file2.ts (NOT logged)"
    expected: "fail on next audit"
  - phase: "Verify"
    action: "audit_change_ledger actualModifiedFiles=[file1.ts, file2.ts]"
    expected: "fail with unlogged_modification:file2.ts"

workflow_3_transaction_revert:
  - phase: "Do"
    action: "safe_edit file1.ts"
    expected: "pass → logs.json entry status=verified"
  - phase: "Do"
    action: "tamper logs.json entry hash_after"
    expected: "next audit fails hash_mismatch"
  - phase: "Do"
    action: "revert logs.json to backup"
    expected: "next audit passes"

workflow_4_concurrent_edits:
  - phase: "Do"
    action: "safe_edit file1.ts (LOG-A1)"
    expected: "pass"
  - phase: "Do"
    action: "safe_edit file2.ts (LOG-A2)"
    expected: "pass (timestamp A2 > A1)"
  - phase: "Verify"
    action: "audit"
    expected: "pass, 2 verified entries"
```

**Agent Task:**
```typescript
for (const workflow of workflowPatterns) {
  const state = initState();
  for (const step of workflow.steps) {
    const result = executeStep(step, state);
    assert(result.outcome === step.expected);
    validateStateConsistency(state, step.verify);
  }
}
```

**Success Criteria:**
- All workflow patterns execute deterministically
- tool_calls.json ledger matches actual gate invocations
- No state corruption across steps

**Execution:** Agent orchestrates 20+ workflow patterns, captures full ledger trace.

---

### **4. Generative Spec Corpus** (SpecValidation)

**Goal:** Comprehensive coverage of spec.json combinations.

**Dimensions:**
- Objective: `[empty, short, nominal, long]`
- Invariants: `[0, 1, 3, 5, 10]`
- Invariant classes: `[security, data, behavior, performance, compliance, all_mixed]`
- Authority: `[missing, short, nominal]`
- Anti_patterns: `[[], [1], [3]]`
- Statement genericity: `[too_short, no_verb, single_tech, good]`
- Scenarios: `[empty, 1, 3, mismatch_invariant_count]`
- Item ID: `[match, mismatch, missing]`

**Agent Task:**
```typescript
// Generate 100 VALID specs
const validSpecs = cartesian(
  ['nominal'],
  [3, 5],
  ['security', 'data', 'compliance'],
  ['nominal'],
  [[1, 2]],
  ['good'],
  [3],
  ['match']
);

// Generate 100 INVALID specs (all rejection reasons)
const invalidSpecs = cartesian(
  ['empty', 'short'],
  [0],
  ['security'],
  ['missing'],
  [[]],
  ['no_verb', 'single_tech'],
  [],
  ['mismatch']
);

// Batch test all 200
for (const spec of [...validSpecs, ...invalidSpecs]) {
  const result = engine.gateSpecReady(spec);
  assert(result.status === (spec.isValid ? 'pass' : 'fail'));
}
```

**Success Criteria:**
- Valid specs: 100% pass
- Invalid specs: 100% fail with correct reason
- Coverage: All rejection code paths exercised

**Execution:** Agent generates corpus, runs batch validation, scores accuracy.

---

### **5. Fuzz Testing Suite** (All Gates)

**Goal:** Stress-test boundary conditions and malformed inputs.

**Fuzz Targets:**

| Input | Malformation | Expected Behavior |
|:---|:---|:---|
| spec.json | Missing required field | Parse error, graceful fail |
| spec.json | Type error (string instead of array) | Schema validation fail |
| spec.json | Empty invariants array | Reject with `spec_invariants_empty` |
| spec.json | Item ID = empty string | Reject with `item_id_empty` |
| spec.json | Anti_patterns with 1000 entries | No OOM, process normally |
| logs.json | Duplicate log_ids | Detect and reject |
| logs.json | Unsorted timestamps | Accept but audit may flag drift |
| logs.json | Files array with path traversal | Reject with `path_traversal` |

**Agent Task:**
```typescript
// Generate fuzz inputs
const fuzzTargets = [
  { file: 'spec.json', mutation: 'delete objective' },
  { file: 'spec.json', mutation: 'invariants: "not-array"' },
  { file: 'spec.json', mutation: 'add 1000 anti_patterns' },
  { file: 'logs.json', mutation: 'files: ["/../../../etc/passwd"]' },
  // ... 50+ more
];

for (const target of fuzzTargets) {
  const corrupted = applyMutation(target);
  const result = engine.validateFile(corrupted);
  assert(result.error || result.handled, `Unhandled: ${target.mutation}`);
}
```

**Success Criteria:**
- No crashes/OOM
- All malformed inputs rejected with reason
- Error messages actionable

**Execution:** Agent generates 100+ fuzz cases, validates graceful handling.

---

### **6. Bypass Attempt Suite (Chaos Testing)** (All Gates)

**Goal:** Find attack vectors.

**Attack Vectors:**

| Attack | Method | Expected Defense |
|:---|:---|:---|
| **Permission Escalation** | Edit spec with extra privileges | Gates enforce actor_type = buddy |
| **Path Traversal** | `files: ['../../../.ssh/config']` | Reject with path validation |
| **Direct Ledger Tampering** | Modify logs.json without safe_edit | Audit detects via hash_mismatch |
| **Race Condition** | 2 concurrent safe_edit on same file | Second blocked by open_review_block |
| **JSON Injection** | reason: `"x", "injected": true` | Schema validation rejects |
| **Log Deletion** | Remove entire entry from logs.json | Audit fails verify_count_drift |
| **Timestamp Confusion** | Entry timestamp > next entry timestamp | Audit flags temporal_mismatch |

**Agent Task:**
```typescript
// Attempt each attack
for (const attack of attacks) {
  const attempt = executeAttack(attack);
  const result = engine.detectViolation(attempt);
  assert(result.blocked === true, `SECURITY: ${attack.name} not blocked!`);
  assert(result.reason === attack.expectedReason);
}
```

**Success Criteria:**
- All attacks blocked at gate boundary
- No privilege escalation
- No audit bypass

**Execution:** Agent attempts all documented attacks, validates blocking.

---

## Integration with Lifecycle

```
Phase: Map
  └─ Agent generates Invariant Adversarial Suite
  └─ SpecValidation gate: ACCEPT / REJECT
  └─ Challenge: Run 50+ adversarial cases
  └─ Score: % correct decisions

Phase: Do
  └─ Agent orchestrates Multi-Transaction Workflow Suite
  └─ RecordedEditTransaction gate on each edit
  └─ Challenge: Multi-step workflows with edge cases
  └─ Score: Ledger consistency, tool_calls accuracy

Phase: Verify/Audit
  └─ Agent applies Ledger Mutation Suite
  └─ AuditIntegrity gate: DETECT all corruptions
  └─ Challenge: Run mutation corpus
  └─ Score: Mutation detection rate

Post-Gate
  └─ Agent runs Fuzz + Bypass suites
  └─ Regression: 200+ corpus + 100+ fuzz + 7 attacks
  └─ Score: Zero escapes, all graceful
```

---

## Success Metrics

| Metric | Target | Validation |
|:---|:---|:---|
| Invariant Adversarial | 50+ cases, 100% accuracy | Agent test report |
| Ledger Mutation | All 7 categories, 0 false negatives | Agent test report |
| Multi-Transaction | 20+ workflows, deterministic | Agent test report |
| Spec Corpus | 200 specs, 99%+ accuracy | Agent test report |
| Fuzz | 100+ cases, 0 crashes | Agent test report |
| Bypass | 7 attacks, 7/7 blocked | Agent test report |
| **Overall** | **Zero vulnerabilities in production gates** | Post-pilot review |

---

## Implementation Roadmap

### Phase 3.1: Invariant Adversarial Suite
**Owner:** Agent (with human case design)  
**Effort:** Minimal (50 lines of test cases + runner)  
**Timeline:** Week 1

### Phase 3.2: Ledger Mutation Suite
**Owner:** Agent  
**Effort:** Minimal (7 mutation types, systematic)  
**Timeline:** Week 1

### Phase 3.3: Multi-Transaction Workflow Suite
**Owner:** Agent (with human scenario design)  
**Effort:** Low (workflows parameterized)  
**Timeline:** Week 2

### Phase 3.4: Generative Spec Corpus
**Owner:** Agent  
**Effort:** Low (cartesian product generation)  
**Timeline:** Week 2

### Phase 3.5: Fuzz Testing Suite
**Owner:** Agent  
**Effort:** Low (systematic mutation generation)  
**Timeline:** Week 2

### Phase 3.6: Bypass Attempt Suite
**Owner:** Agent  
**Effort:** Minimal (documented attacks, systematic execution)  
**Timeline:** Week 2

**Total Agent Testing Timeline:** 2 weeks  
**Exit Criteria:** All suites passing + no new vulnerabilities found

---

## Example: Agent Adversarial Case Generation

```typescript
// Agent pseudocode
async function generateAdversarialInvariants() {
  const rejectionReasons = [
    'statement_too_short',
    'no_normative_verb',
    'too_narrow_implementation',
    'missing_authority_high_risk',
    'missing_anti_patterns_high_risk'
  ];
  
  const cases = [];
  
  // Case 1: Too short
  cases.push({
    id: 'ADV-SHORT-001',
    class: 'security',
    statement: 'X is Y', // < 24 chars
    authority: 'REF',
    anti_patterns: ['z'],
    expected: 'statement_too_short'
  });
  
  // Case 2: No normative verb
  cases.push({
    id: 'ADV-NOVERB-001',
    class: 'security',
    statement: 'All edits go through SHA-256 hashing only.',  // < 24, but no must/shall
    authority: 'REF',
    anti_patterns: ['MD5'],
    expected: 'no_normative_verb'
  });
  
  // Case 3: Missing authority (high-risk)
  cases.push({
    id: 'ADV-NOAUTH-001',
    class: 'security',
    statement: 'All mutations must be recorded in ledger.',
    authority: '', // missing
    anti_patterns: ['direct write'],
    expected: 'authority_required'
  });
  
  // ... 47 more systematic cases
  
  return cases;
}

// Agent runs validator
async function validateAdversarialSuite() {
  const cases = await generateAdversarialInvariants();
  const results = [];
  
  for (const c of cases) {
    const result = engine.validateInvariant(c);
    results.push({
      id: c.id,
      expected: c.expected,
      actual: result.reason,
      pass: result.reason === c.expected
    });
  }
  
  const accuracy = results.filter(r => r.pass).length / results.length;
  console.log(`Adversarial Accuracy: ${(accuracy * 100).toFixed(1)}%`);
  
  return results;
}
```

---

## Risks & Mitigations

| Risk | Mitigation |
|:---|:---|
| Agent over-generates tests (slow) | Cap test suite size; focus on decision boundaries |
| Agent misses edge case | Human review of test design; supplement with manual chaos |
| Test infrastructure complexity | Use agent to generate → human to design infrastructure once |
| False sense of security | Agent tests are *policy validation*, not functional tests; require integration testing |

---

## Related Documents

- `ENG-002-zero-trust-phase-gates-log-lock.md` — Main issue
- `memory/mindbase/processes/EXPECTATIONS.md` — Expectation engine reference
- `wip/docs/pending/eng-002-pilot-001/` — Pilot artifacts (test-gate-a.mjs, test-gate-c.mjs)

---

## Sign-Off

**Document Owner:** ENG-002 Task Lead  
**Reviewed By:** (pending agent integration review)  
**Status:** Strategy Approved, Implementation Ready
