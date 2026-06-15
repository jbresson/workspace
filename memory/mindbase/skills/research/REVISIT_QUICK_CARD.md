# Revisit Quick Card

**One page. When creating findings, use this.**

---

## Decision Tree

Q1: What domain?
- LLM, Quantum, Biotech, Materials, Climate → Q2
- HTTP, OAuth, Algorithms, Python, Physics → revisit: Never

Q2: What status?
- HYPOTHESIS (1 source) → Q3a
- PRELIMINARY (2+ sources) → Q3b
- VALIDATED (3+ sources) → Q3c

Q3a: HYPOTHESIS - How volatile?
- Ultra (LLM, Quantum) → 1 month
- High (Biotech) → 2 months
- Slow (Physics) → 3 months

Q3b: PRELIMINARY - How volatile?
- Ultra → 3 months
- High → 4 months
- Slow → 6 months

Q3c: VALIDATED - How volatile?
- Ultra → 6 months
- High → 9 months
- Slow → 12 months

---

## Quick Table

| Domain | HYPOTHESIS | PRELIMINARY | VALIDATED |
|--------|-----------|------------|-----------|
| LLM | 1mo | 3mo | 6mo |
| Quantum | 1mo | 3mo | 6mo |
| Biotech | 2mo | 4mo | 9mo |
| Physics | 3mo | 6mo | 12mo |
| HTTP/OAuth | Never | Never | Never |

---

## Trigger Templates

Copy-paste and fill [brackets]:

HYPOTHESIS:
```
Find 2nd independent source on [topic]
```

PRELIMINARY:
```
Find 3rd source confirming [claim] OR detect [specific contradiction]
```

VALIDATED:
```
Check for [new paradigm] OR [major contradiction from lab X]
```

KNOWN:
```
Only if [spec/version] changes
```

---

## YAML Template

```yaml
---
id: FIND-YYYYMMDD-NNN
title: [Your claim]
domain: bleeding-edge  # or known
sub_domain: [llm|quantum|standards|http...]
claim: [One sentence]
status: HYPOTHESIS     # or PRELIMINARY, VALIDATED, CANONICAL
date_created: YYYY-MM-DD
revisit_date: YYYY-MM-DD  # or Never
revisit_trigger: [Your trigger]
---

# Your finding content...
```

---

## Date Calculator

From today (2026-06-14):

| Add | Result |
|-----|--------|
| 1 month | 2026-07-14 |
| 2 months | 2026-08-14 |
| 3 months | 2026-09-14 |
| 4 months | 2026-10-14 |
| 6 months | 2026-12-14 |
| 9 months | 2027-03-14 |
| 12 months | 2027-06-14 |

(Use your current date, not 2026-06-14)

---

## Common Pitfalls

❌ revisit_date: "2030" for HYPOTHESIS → Use 1-3 months
❌ No revisit_trigger → Add specific event
❌ Never set for HYPOTHESIS → Use 1-3 months
❌ Vague trigger → Write "When [specific event]..."
❌ Red flag: HYPOTHESIS after 2 months still no 2nd source → Extend to 3mo, then reassess

---

## Workflow

1. Read: RESEARCH_QUICK_REF.md
2. Use: This card for decision tree
3. Calculate: Date from table
4. Write: Trigger text
5. Add to YAML: revisit_date + trigger
6. Run: npm run kb:validate
7. Run: npm run kb:rebuild

---

**Keep nearby. Reference often.**

Version: 1.0
