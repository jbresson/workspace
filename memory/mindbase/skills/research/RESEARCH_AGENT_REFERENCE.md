# Research Skills: Agent-Optimized Reference

**For agents executing research tasks. Minimal visual noise. Maximum info density.**

---

## research-bleedingedge

**Domain**: Rapidly-evolving (LLM, Quantum, Biotech, Materials)

**Requirements**:
- Minimum 2 independent Tier-1 sources for PRELIMINARY status
- Exact quotes (word-for-word) from each source
- Reasoning chain: how evidence supports conclusion
- Scope & version explicitly stated
- revisit_date + revisit_trigger set

**Status Flow**: HYPOTHESIS (1 source) → PRELIMINARY (2+ sources) → VALIDATED (3+ sources)

**Revisit**: 1-3 months (HYPOTHESIS), 3-6 months (PRELIMINARY), 6-12 months (VALIDATED)

**Template Fields**:
```yaml
id, title, domain, sub_domain, claim, status, confidence
hypothesis, reasoning_chain
date_created, revisit_date, revisit_trigger
sources (list with URL, tier, quote)
limitations, related_findings, tags
```

---

## research-known

**Domain**: Established (HTTP, OAuth, Algorithms, Physics, stdlib)

**Requirements**:
- 1 canonical source (RFC, official docs, textbook)
- 1 confirmation source (different author)
- Scope/version mandatory
- Never vague

**Status**: CANONICAL / VERIFIED / DEPRECATED / SCOPE-LIMITED

**Revisit**: Never (unless spec changes)

**Template Fields**:
```yaml
id, title, domain, sub_domain, claim, status
date_created
canonical_source (title, URL, quote)
confirmation_source (title, URL, quote)
scope_applies_to, scope_not_applies_to
```

---

## Tier System (Credibility)

| Tier | Sources | Use For |
|------|---------|---------|
| 1 | Peer-reviewed journals, RFC, official docs, textbooks | Primary evidence |
| 2 | Company reports, author blogs, O'Reilly books | Confirmation |
| 3 | Tutorials, MIT OpenCourseWare, expert blogs | Confirmation |
| 4 | StackOverflow, established guides | Confirmation only |
| 5+ | Reddit, Twitter, Medium, LLM summaries | ❌ Do not use |

---

## URL Requirements

**Permanent** (required):
- DOI (doi.org/...)
- arXiv (arxiv.org/abs/...)
- RFC (rfc-editor.org/...)
- GitHub commits (github.com/.../blob/[40-char-hash])
- Official docs (.org domains, python.org, react.dev)
- archive.org snapshots

**Ephemeral** (reject):
- reddit.com, twitter.com, medium.com, quora.com, youtube.com, dev.to, HackerNews

---

## Revisit Cadence by Domain & Status

**Ultra-Volatile (LLM, Quantum)**:
- HYPOTHESIS: 1 month | trigger: "Find 2nd source"
- PRELIMINARY: 3 months | trigger: "Find 3rd source"
- VALIDATED: 6 months | trigger: "Paradigm shift"

**High-Volatile (Biotech, Climate)**:
- HYPOTHESIS: 2 months | trigger: "Find 2nd source"
- PRELIMINARY: 4 months | trigger: "Find 3rd source"
- VALIDATED: 9 months | trigger: "Major contradiction"

**Slow-Moving (Physics, Math)**:
- HYPOTHESIS: 3 months | trigger: "Find 2nd source"
- PRELIMINARY: 6 months | trigger: "Find 3rd source"
- VALIDATED: 12 months | trigger: "Paradigm shift"

**Immutable (research-known)**:
- All: Never | trigger: "N/A"

---

## Validation: What Gets Checked

- YAML format valid (--- ... ---)
- Required fields present (id, title, domain, status, date_created)
- Domain-specific fields (hypothesis for bleeding-edge)
- Status valid for domain
- URLs permanent (not ephemeral)
- Source count sufficient (2+ for PRELIMINARY, 3+ for VALIDATED)
- Revisit date set
- Related findings exist
- Evidence quotes present

---

## NPM Commands

**kb:validate**: Check all findings (10+ rigor gates)
- Exit 0 = pass | Exit 1 = errors
- Run before committing findings

**kb:rebuild**: Auto-generate indices
- Outputs: _manifest.md, [domain]/_index.md, _revisit-schedule.md
- Run after creating/modifying findings

---

## Conflict Resolution

If sources contradict:
1. Preserve both sides (don't suppress)
2. Tag credibility delta (which tier favors which side)
3. Document context difference (if applicable)
4. Set revisit trigger (when will we know which is correct?)
5. Status: CONFLICTED (not VALIDATED)

---

## False Win Risks (Bleeding-Edge)

Ask: What assumption could break this finding?

Examples:
- "Testing only on local data, not production"
- "Assuming all clients respect new format"
- "No monitoring of latency impacts"

Mitigate: Document + test in production context.

---

**Format**: Lean. Dense. Actionable.**  
**Use**: When agent needs to research or validate findings.**  
**Time**: 2-5 minute read for reference.**

---

Version: 1.0 (Agent-Optimized)  
Tokens: ~1.2K
