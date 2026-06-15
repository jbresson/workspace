# Revisit Guidelines

**When to revisit findings and what dates to set.**

---

## Quick Rules

**research-bleedingedge**: ALWAYS revisit
- HYPOTHESIS (1 source) → 1-3 months
- PRELIMINARY (2+ sources) → 3-6 months  
- VALIDATED (3+ sources) → 6-12 months

**research-known**: NEVER revisit (unless spec changes)
- CANONICAL, VERIFIED, DEPRECATED → Never

---

## Domain Velocity Classification

Choose your domain type to determine revisit cadence:

**Ultra-Volatile** (papers weekly, SOTA monthly)
- LLM, Quantum Computing, AI Safety
- Use 1mo, 3mo, 6mo cadence

**High-Volatile** (papers bi-weekly, benchmarks quarterly)
- Biotech, Climate Modeling, Advanced Materials
- Use 2mo, 4mo, 9mo cadence

**Slow-Moving** (papers monthly, paradigms yearly)
- Physics, Mathematics, Design Patterns
- Use 3mo, 6mo, 12mo cadence

**Immutable** (never changes unless spec updates)
- HTTP (RFC), OAuth (RFC), Algorithms, Python stdlib
- Use "Never"

---

## How to Set Revisit Date

1. Identify domain velocity (above)
2. Identify status (HYPOTHESIS, PRELIMINARY, VALIDATED)
3. Look up date in your velocity tier
4. Add to YAML: `revisit_date: YYYY-MM-DD`

**Example**: LLM domain, PRELIMINARY status, ultra-volatile
- From today (2026-06-14) + 3 months = 2026-09-14

---

## How to Set Revisit Trigger

Triggers tell you what to check when the date arrives.

**HYPOTHESIS trigger**: Find 2nd independent source
- "When 2nd paper on [mechanism] published"
- "When competing model shows [property]"
- Search: arXiv, Google Scholar, author websites

**PRELIMINARY trigger**: Find 3rd source OR detect contradiction
- "When 3rd independent team publishes results"
- "If [major lab] releases contradicting model"
- "When new benchmark reveals performance gap"
- Search: arXiv, leaderboards, conference proceedings

**VALIDATED trigger**: Check for paradigm shift or community consensus change
- "If new architecture outperforms both current approaches"
- "When community consensus shifts to [direction]"
- "Annual review: check for major domain evolution"
- Search: SOTA trends, major research announcements

**CANONICAL trigger**: Only if spec/fact changes
- "Only if RFC updates this requirement"
- "Only if Python 3.13 changes async behavior"
- "Only if algorithm disproven mathematically"

---

## Timeline Examples

### Example 1: Finding Matures

Day 1: Create FIND-001
- Status: HYPOTHESIS (1 source from blog)
- revisit_date: 2026-07-14 (1 month)
- trigger: "Find 2nd independent mechanistic paper"

Day 45: Revisit triggered
- Found 2nd paper ✓
- Update status: PRELIMINARY
- New revisit_date: 2026-10-14 (3 months)
- Run: npm run kb:rebuild

Day 135: Revisit triggered
- Found 3rd paper ✓
- Update status: VALIDATED
- New revisit_date: 2026-12-14 (6 months)
- Run: npm run kb:rebuild

Day 405: Revisit triggered
- No contradictions found
- Keep status: VALIDATED
- Extend revisit_date: 2027-06-14 (annual)
- Run: npm run kb:rebuild

### Example 2: Finding Contradicted

Day 90: Revisit triggered for FIND-002
- New research contradicts claim
- Update status: REFINED (narrower scope)
- Update claim: "X applies only to [specific context]"
- New revisit_date: 2026-12-14
- Run: npm run kb:rebuild

### Example 3: Finding Superseded

Day 180: Revisit triggered for FIND-003
- New finding subsumes old one
- Update status: SUPERSEDED
- Add: superseded_by: "FIND-20261231-004"
- revisit_date: "Never"
- Run: npm run kb:rebuild

---

## Revisit Cadence Reference Table

| Domain | HYPOTHESIS | PRELIMINARY | VALIDATED |
|--------|-----------|------------|-----------|
| LLM | 1mo | 3mo | 6mo |
| Quantum | 1mo | 3mo | 6mo |
| Biotech | 2mo | 4mo | 9mo |
| Climate | 2mo | 4mo | 9mo |
| Physics | 3mo | 6mo | 12mo |
| Math | 3mo | 6mo | 12mo |
| HTTP | Never | Never | Never |
| Algorithms | Never | Never | Never |

---

## What NOT to Do

❌ Set revisit_date: "2030" for HYPOTHESIS
→ Info becomes stale; you'll forget context
→ Use 1-3 months max

❌ Leave revisit_trigger empty
→ Won't know what to check
→ Write specific event: "When [X] happens..."

❌ Set revisit_date: "Never" for HYPOTHESIS/PRELIMINARY
→ Speculative findings need validation
→ Use 1-6 months based on table

❌ Set revisit_date: "1 week" for VALIDATED
→ Nothing changes that fast
→ Use 6-12 months

❌ Write vague trigger: "Re-read and think"
→ Not actionable
→ Write: "Check arXiv for..." or "If [metric] changes..."

---

## Integration with Automation

When you set revisit_date + trigger in YAML:

```yaml
revisit_date: 2026-09-14
revisit_trigger: "Check for new SOTA models"
```

Running `npm run kb:rebuild` generates `_revisit-schedule.md`:

```
## 2026-09

### 2026-09-14
- **FIND-001** | Your claim
  - Revisit: 2026-09-14 (92 days)
  - Trigger: Check for new SOTA models
```

Script auto-calculates:
- Days remaining from today
- Urgency flag if < 7 days (⚠️ URGENT)
- Groups by month for easy scanning

---

Version: 1.0 (Human-Optimized)
