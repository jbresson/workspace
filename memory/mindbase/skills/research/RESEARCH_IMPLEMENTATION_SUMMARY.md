# Research Skills: Complete Implementation Summary

**Date**: 2026-06-14  
**Status**: Ready for Use  
**Token Budget Spent**: ~150k

---

## What You Now Have

### 1. Two Complementary Skills

#### **research-bleedingedge** 
(Rapidly-evolving domains: LLM, Quantum, Biotech, Materials, Distributed Systems)

- Mandatory: Hypothesis + reasoning chain + 2+ independent sources (for VALIDATED)
- Quotes required: Exact text proving understanding
- Personal hypotheses central to investigation
- Revisit every 3-6 months (domain changes rapidly)
- Status tracking: HYPOTHESIS → PRELIMINARY → VALIDATED → SUPERSEDED

**File**: `memory/mindbase/skills/research-bleedingedge/SKILL.md` (11.7 KB)

#### **research-known**
(Established domains: Algorithms, APIs, Standards, Physics, Math, Patterns)

- Mandatory: 1 canonical source + 1 confirmation source
- Scope & version specificity required
- Personal hypotheses N/A (canonical truth exists)
- Fast fact-verification (15-30 min)
- Status tracking: CANONICAL / VERIFIED / DEPRECATED

**File**: `memory/mindbase/skills/research-known/SKILL.md` (12.3 KB)

---

### 2. Unified Framework

**File**: `memory/mindbase/skills/RESEARCH_UNIFIED_FRAMEWORK.md` (15.4 KB)

Core requirements applying to BOTH skills:
- ✅ URL Permanence Mandate (DOI, archive.org, official docs)
- ✅ Trustworthiness Assessment (5-tier credibility ranking)
- ✅ Conflict Resolution Protocol (preserve both sides)
- ✅ Scope & Version Specificity (mandatory, never vague)
- ✅ Anti-Forum-Post Rule (trace to primary sources)
- ✅ Reasoning Chain Transparency (articulate the logic)
- ✅ Metadata & Archival Standards (YAML + structured fields)
- ✅ Revisit Cadence & Automation (date + trigger + reminders)

---

### 3. Knowledge Base Organization

**File**: `memory/knowledgebase/RESEARCH_ORGANIZATION.md` (17.1 KB)

**Structure**:
```
memory/knowledgebase/research/
├── _manifest.md               # Global index (auto-generated)
├── _revisit-schedule.md       # Upcoming revisits (auto-tracked)
├── bleeding-edge/
│   ├── llm/
│   │   ├── _index.md
│   │   ├── FIND-20260614-001.md
│   │   └── [...]
│   ├── quantum-computing/
│   ├── biotech/
│   ├── materials/
│   └── [...]
└── known/
    ├── algorithms/
    ├── standards/
    ├── frameworks/
    ├── languages/
    └── [...]
```

**Metadata per Finding**:
```yaml
id: FIND-YYYYMMDD-NNN
title: [Claim]
domain: bleeding-edge | known
sub_domain: [Category]
status: HYPOTHESIS | PRELIMINARY | VALIDATED | CANONICAL | DEPRECATED
confidence: HIGH | MEDIUM | LOW
revisit_date: YYYY-MM-DD | Never
revisit_trigger: [Event that changes this]
```

---

### 4. Automation Scripts

Two executable Node.js scripts for maintenance:

#### `scripts/knowledgebase/validate-findings.js` (10.2 KB)
Validates all findings against rigor standards:
- Required fields present?
- URLs permanent (DOI, archive.org, official)?
- Quotes match sources?
- Status consistency?
- Revisit dates set?
- No orphaned references?

```bash
npm run kb:validate
```

#### `scripts/knowledgebase/rebuild-index.js` (9.7 KB)
Auto-regenerates all indices:
- `_manifest.md` (global index)
- `[domain]/_index.md` (per-domain indices)
- `_revisit-schedule.md` (upcoming revisit calendar)

```bash
npm run kb:rebuild
```

**Setup**: Add to `package.json`:
```json
{
  "scripts": {
    "kb:validate": "node scripts/knowledgebase/validate-findings.js",
    "kb:rebuild": "node scripts/knowledgebase/rebuild-index.js"
  }
}
```

---

### 5. Quick References & Templates

#### `memory/mindbase/skills/RESEARCH_QUICK_REF.md` (6.7 KB)
- One-minute skill picker
- Key differences table
- Universal checklist
- Tier lookup
- Anti-pattern detector
- Example templates

#### `memory/mindbase/skills/RESEARCH_QUICKSTART.md` (19.5 KB)
- Prerequisites setup
- Step-by-step workflow
- Complete templates for both skills
- Quick-start commands
- Integration with task execution

#### `memory/mindbase/skills/RESEARCH_FAQ.md` (16 KB)
- Skill selection FAQs (30+)
- Source credibility edge cases
- Scope & version handling
- Reasoning chain validation
- URL & archive management
- Validation automation
- Token efficiency tips
- Conflict resolution procedures
- Escalation guidelines

---

## Quick Start (5 Minutes)

### 1. Create Directories
```bash
mkdir -p memory/knowledgebase/research/bleeding-edge/{llm,quantum-computing}
mkdir -p memory/knowledgebase/research/known/{algorithms,standards,frameworks}
```

### 2. Create First Finding
```bash
# Copy template from RESEARCH_QUICKSTART.md
# Fill in your first finding
cat > memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-001.md << 'EOF'
---
id: "FIND-20260614-001"
title: "Your claim"
domain: "bleeding-edge"
sub_domain: "llm"
status: "HYPOTHESIS"
date_created: "2026-06-14"
---
# Your Finding
[Fill in sections...]
EOF
```

### 3. Validate
```bash
npm run kb:validate
```

### 4. Rebuild Indices
```bash
npm run kb:rebuild
```

### 5. Check Index
```bash
cat memory/knowledgebase/research/_manifest.md
cat memory/knowledgebase/research/_revisit-schedule.md
```

---

## Key Differentiators

| Aspect | research-bleedingedge | research-known |
|--------|---|---|
| **Time per finding** | 1-3 hours | 15-30 min |
| **Minimum sources** | 2 (for PRELIMINARY) | 1 canonical + 1 confirm |
| **Reasoning required** | YES (mandatory) | Optional |
| **Quotes required** | YES (exact) | Recommended |
| **Revisit frequency** | 3-6 months | Only if changed |
| **Status lifecycle** | HYPOTHESIS → PRELIMINARY → VALIDATED | CANONICAL / DEPRECATED |
| **Domain examples** | LLM, Quantum, Biotech | HTTP, OAuth, Algorithms |

---

## Mandatory Checklist Before Archiving ANY Finding

- [ ] Domain correct? (bleeding-edge vs known)
- [ ] Status valid for domain? (no HYPOTHESIS for research-known)
- [ ] URL permanent? (DOI, archive.org, or official docs)
- [ ] Quote exact? (word-for-word from source, not paraphrased)
- [ ] Scope clear? (version, platform, context stated)
- [ ] Reasoning chain solid? (premises logically support conclusion)
- [ ] Source tier assigned? (Tier-1, Tier-2, etc.)
- [ ] Revisit date set? (never for CANONICAL, always for bleeding-edge HYPOTHESIS+)
- [ ] No orphaned references? (all related_findings exist)
- [ ] Validation passes? (`npm run kb:validate` shows no errors)

---

## Integration Points

### With Task Execution
**Phase 0** (Crystallization): Define research needed  
**Phase 1** (Ignition): Check knowledgebase for existing findings  
**Phase 2** (Cycling): Use skills to fill research gaps  
**Phase 5** (Cool-Down): Archive new findings to knowledgebase  

### With Session Memory
```
ctx_session(action="finding", value="[BLEEDINGEDGE-VALIDATED] [LLM] Transformers sufficient but not necessary. Mamba parity confirmed. FIND-001")
```

### With Cross-Session Continuity
- Findings persist in knowledgebase across sessions
- Revisit schedule triggers automated reminders
- Indices auto-update as findings are added/modified

---

## Files Created

| File | Size | Purpose |
|------|------|---------|
| `memory/mindbase/skills/research-bleedingedge/SKILL.md` | 11.7 KB | Skill definition for bleeding-edge research |
| `memory/mindbase/skills/research-known/SKILL.md` | 12.3 KB | Skill definition for established knowledge |
| `memory/mindbase/skills/RESEARCH_UNIFIED_FRAMEWORK.md` | 15.4 KB | Joint requirements, differentiation matrix |
| `memory/mindbase/skills/RESEARCH_QUICK_REF.md` | 6.7 KB | One-page cheat sheet |
| `memory/mindbase/skills/RESEARCH_QUICKSTART.md` | 19.5 KB | Step-by-step implementation guide |
| `memory/mindbase/skills/RESEARCH_FAQ.md` | 16 KB | 50+ FAQs and troubleshooting |
| `memory/knowledgebase/RESEARCH_ORGANIZATION.md` | 17.1 KB | Knowledge base structure & automation |
| `scripts/knowledgebase/validate-findings.js` | 10.2 KB | Validation automation |
| `scripts/knowledgebase/rebuild-index.js` | 9.7 KB | Index rebuild automation |
| **TOTAL** | **~118 KB** | Complete research skill system |

---

## Advanced Features

### 1. Conflict Tracking
```yaml
conflicts:
  - competing_claim: "Alternative view of same claim"
    source: "URL"
    delta: "Why we favor our version"
    status: "CONFLICTED | REFINED | SUPERSEDED"
```

### 2. Revisit Automation
```bash
# Generates calendar of upcoming revisits
npm run kb:rebuild
cat memory/knowledgebase/research/_revisit-schedule.md
```

### 3. Cross-Finding Navigation
```yaml
related_findings: ["FIND-001", "FIND-003", "FIND-007"]
# Auto-linked in indices
```

### 4. Tag-Based Search
```yaml
tags: ["attention", "architecture", "scaling"]
# Enables semantic navigation via _manifest.md
```

---

## Extensibility

### Adding New Domains
1. Create subdirectory: `memory/knowledgebase/research/{domain}/{sub_domain}/`
2. Run `npm run kb:rebuild` (auto-detects new directories)
3. Index auto-generates with findings

### Adding New Automation
Scripts are modular:
- Create `scripts/knowledgebase/check-revisits.js` (check upcoming deadlines)
- Create `scripts/knowledgebase/search-findings.js` (semantic search)
- Register in `package.json` scripts

### Integrating with Tools
- `brave-search`: Find papers/docs
- `browser-tools`: Extract text from PDFs
- `ctx_semantic_search`: Query knowledgebase
- `ctx_session`: Store findings across sessions

---

## Success Criteria

Your research skill implementation is **successful** when:

✅ **research-known findings**:
- Take 15-30 min per finding
- Link to canonical source
- Include 1+ confirmation source
- Have clear scope/version

✅ **research-bleedingedge findings**:
- Take 1-2 hours per finding (initial)
- Include 2+ independent Tier-1 sources
- Have reasoning chain connecting quotes
- Have revisit date + trigger

✅ **Knowledge Base**:
- Findings auto-indexed via `npm run kb:rebuild`
- Validation passes: `npm run kb:validate`
- Revisit schedule auto-generated
- No orphaned references

✅ **Integration**:
- Session memory links to findings
- Task execution consults knowledgebase
- Findings persist across sessions
- Cross-references maintained

---

## Next Steps

1. **Set up directories** (5 min)
2. **Create first finding** (30-120 min depending on skill)
3. **Run validation** (1 min)
4. **Rebuild indices** (1 min)
5. **Integrate with tasks** (as needed)
6. **Set up revisit reminders** (via `ctx_session`)

---

## Philosophy

These skills encode **scientific rigor without perfectionism**.

- ✅ PRELIMINARY is fine; VALIDATED can wait
- ✅ Conflicts are features; preserve both sides
- ✅ Fast lookup (research-known) vs Deep investigation (research-bleedingedge)
- ✅ Automate what's mechanical; preserve human judgment
- ✅ Iterate; update findings as evidence changes

Research is never complete. These tools help you **navigate uncertainty transparently**.

---

## Support

- **Questions?** → See `RESEARCH_FAQ.md`
- **Stuck?** → See `RESEARCH_QUICKSTART.md`
- **Validation errors?** → Re-read `RESEARCH_UNIFIED_FRAMEWORK.md` (rigor gates)
- **Scaling to team?** → Extend validation scripts + establish review process

---

**Ready?** Start with one finding. You've got everything.

**Questions?** All covered in RESEARCH_FAQ.md.

**Need help?** RESEARCH_QUICKSTART.md walks you through every step.

---

*Last Updated*: 2026-06-14  
*Maintainer*: Research Skill System  
*Version*: 1.0
