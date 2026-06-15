# Research Skills: Quick Reference

**Print this page. Use for creating findings.**

---

## Skill Picker (1 minute)

Q: Is this a known/established fact?
- HTTP RFC, OAuth spec, Algorithm complexity, Python stdlib → **research-known**
- LLM architecture, Quantum error correction, New discovery → **research-bleedingedge**

---

## Tier System (Credibility)

| Tier | Sources | Use |
|------|---------|-----|
| 1 | Peer-reviewed journals, RFC, official docs | Primary |
| 2 | Company research, author blogs, O'Reilly | Confirmation |
| 3 | Tutorials, MIT OpenCourseWare, expert blogs | Confirmation |
| 4 | StackOverflow (high votes), guides | Confirmation |
| 5+ | Reddit, Twitter, Medium, AI summaries | ❌ Don't use |

**URLs**: DOI / arXiv / RFC / GitHub commits / official docs ONLY. Never Reddit/Twitter/Medium.

---

## research-known (Fast)

Time: 15-30 min per finding

Requirements:
- 1 canonical source (RFC, official docs, textbook)
- 1 confirmation source (different author)
- Scope/version stated
- Status: CANONICAL or VERIFIED

Revisit: Never

Template:
```yaml
id, title, domain, sub_domain, claim, status
canonical_source (URL + quote)
confirmation_source (URL + quote)
scope_applies_to, scope_not_applies
```

---

## research-bleedingedge (Deep)

Time: 1-3 hours per finding

Requirements:
- Minimum sources: 2 for PRELIMINARY, 3 for VALIDATED
- Exact quotes from each source
- Reasoning chain (how evidence supports claim)
- Scope explicitly stated
- Status: HYPOTHESIS → PRELIMINARY → VALIDATED

Revisit: Always (1-12 months)

Template:
```yaml
id, title, domain, sub_domain, claim, status
hypothesis, reasoning_chain
date_created, revisit_date, revisit_trigger
sources[] (URL, tier, exact quote)
limitations, related_findings
```

---

## Revisit Dates (Quick Table)

| Domain | HYPOTHESIS | PRELIMINARY | VALIDATED |
|--------|-----------|------------|-----------|
| LLM / Quantum | 1mo | 3mo | 6mo |
| Biotech / Climate | 2mo | 4mo | 9mo |
| Physics / Math | 3mo | 6mo | 12mo |
| Known (HTTP, etc) | Never | Never | Never |

---

## Revisit Triggers

**HYPOTHESIS**: "Find 2nd independent source on [topic]"

**PRELIMINARY**: "Find 3rd source OR detect contradiction from [event]"

**VALIDATED**: "Check for paradigm shift OR major contradiction"

**KNOWN**: "N/A (only if spec changes)"

---

## Validation Checklist

Before running npm validate:

- YAML format valid (--- ... ---)
- id field (FIND-YYYYMMDD-NNN)
- title, domain, sub_domain, claim, status, date_created
- Bleeding-edge only: hypothesis, reasoning_chain
- URLs permanent (no reddit/twitter/medium)
- Quotes exact (word-for-word)
- Sources listed (count meets minimum)
- revisit_date + revisit_trigger set
- related_findings point to existing findings

---

## NPM Commands

```bash
npm run kb:validate    # Check all findings (10+ gates)
npm run kb:rebuild     # Generate indices + calendar
```

Always run in order: validate → rebuild

---

## Conflict Resolution

If sources contradict:
1. Create both findings (don't suppress)
2. Tag credibility delta (which source favored)
3. Set revisit trigger (when will we know?)
4. Status: CONFLICTED (not VALIDATED)

---

## Common Mistakes

❌ No revisit_trigger  
→ Won't know what to check

❌ Revisit never set for HYPOTHESIS  
→ Speculative findings must validate

❌ Vague trigger: "Re-read later"  
→ Write specific: "When [event] happens..."

❌ URL from Reddit/Medium as primary  
→ Trace to original source only

❌ Paraphrased quotes  
→ Use exact text, word-for-word

---

**Print. Use. Done.**

Version: 1.0
