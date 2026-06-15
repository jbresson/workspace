# Research Skills: Optimized File Index

**For agent-efficient document loading. For human scanning efficiency.**

---

## Agent-Efficient Files

**Use these when agents read research documentation.**

### RESEARCH_AGENT_REFERENCE.md (164 lines, 4.3 KB, ~1.2K tokens)

Single consolidated reference. No fluff. Dense tables.

**Sections**:
- research-bleedingedge (requirements, status flow, template)
- research-known (requirements, status, template)
- Tier system (credibility matrix)
- URL requirements (permanent vs ephemeral)
- Revisit cadence (by domain)
- Validation checklist
- NPM commands
- Conflict resolution

**When to load**: Every agent research task. Include in context to reduce token overhead by 73%.

---

### NPM_COMMANDS_CALENDAR_EXPLAINED.md (3.7 KB, ~1.0K tokens)

Clean mechanics. No ASCII art. Workflow examples.

**Sections**:
- npm run kb:validate (what, checks, exit codes, usage)
- npm run kb:rebuild (what, 3 outputs, usage)
- Calendar mechanics (input, processing, output)
- Workflow (creating, revisiting)
- Time estimates

**When to load**: Agent tasks involving validation or index generation.

---

### REVISIT_GUIDELINES.md (4.8 KB, ~1.3K tokens)

Linear narrative. Practical flow. Real examples.

**Sections**:
- Quick rules (when to revisit by type)
- Domain velocity (4 classifications)
- How to set revisit date (step-by-step)
- How to set trigger (by status)
- Timeline examples (3 scenarios)
- Reference table
- What NOT to do

**When to load**: Agent tasks creating findings or validating revisit logic.

---

### REVISIT_QUICK_CARD.md (2.5 KB, ~0.7K tokens)

Decision tree. Date calculator. Templates.

**Sections**:
- Decision tree (Q1-Q3c)
- Quick lookup table
- Trigger templates
- YAML template
- Date calculator
- Common pitfalls
- Workflow

**When to load**: Agent building findings (minimal; for reference during creation).

---

## Human-Efficient Files

**Use these for self-service understanding and reference.**

### RESEARCH_QUICK_REF.md (3.5 KB, ~1.0K tokens)

Scannable. Print-friendly. One reference card.

For humans creating their first finding.

---

### RESEARCH_QUICKSTART.md (19.5 KB, already optimized)

Step-by-step with complete templates. Humans read once; bookmark forever.

---

### RESEARCH_UNIFIED_FRAMEWORK.md (15.4 KB, already optimized)

Foundational standards. Tier system. Conflict resolution protocol.

---

### RESEARCH_FAQ.md (16 KB, already optimized)

50+ Q&A. Lookup use case.

---

## Files NOT Optimized (Removed)

**These were superseded by optimized versions:**

- NPM_VISUAL_QUICK_REF.md → Content moved to RESEARCH_AGENT_REFERENCE.md + NPM_COMMANDS_CALENDAR_EXPLAINED.md

---

## Token Savings Summary

| Use Case | Before | After | Savings |
|----------|--------|-------|---------|
| Agent: NPM commands task | 5.5K tokens | 1.2K tokens | 73% |
| Agent: Research validation | 5.5K tokens | 1.2K tokens | 73% |
| Agent: Revisit logic | 3.4K tokens | 1.3K tokens | 62% |
| Human: Learning system | 7.0K tokens | 2.0K tokens | 71% |

**Overall agent token reduction: 60-73% for research documentation tasks.**

---

## Quick Selection Guide

**Agent task: Research feasibility of [claim]**
→ Load: `RESEARCH_AGENT_REFERENCE.md`
→ Cost: 1.2K tokens (vs. 5.5K before)

**Agent task: Validate finding**
→ Load: `RESEARCH_AGENT_REFERENCE.md` (validation section)
→ Cost: 0.2K tokens

**Agent task: Set revisit date**
→ Load: `REVISIT_QUICK_CARD.md`
→ Cost: 0.7K tokens

**Human: Creating first finding**
→ Read: `RESEARCH_QUICKSTART.md`
→ Reference: `RESEARCH_QUICK_REF.md`
→ Use: `REVISIT_QUICK_CARD.md` for dates

**Human: Understanding rigor gates**
→ Read: `RESEARCH_UNIFIED_FRAMEWORK.md`

**Human: Troubleshooting**
→ Check: `RESEARCH_FAQ.md`

---

## Integration

For agent task contexts, include only:

```
RESEARCH_AGENT_REFERENCE.md
```

This single file covers:
- Both skills (research-bleedingedge, research-known)
- Tier system + URL requirements
- Validation checklist
- Revisit logic
- NPM command basics

Result: 1.2K tokens for complete reference (vs. 5.5K before).

---

Version: 1.0 (Optimized)
