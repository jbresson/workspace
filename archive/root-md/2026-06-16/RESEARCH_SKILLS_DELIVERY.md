# 🚀 Research Skills Delivery Package

**Date**: 2026-06-14  
**Status**: ✅ Complete & Production Ready  
**Total Volume**: ~140 KB documentation + 2 automation scripts

---

## 📦 What You Received

### Two Complementary Skills

#### 1. **research-bleedingedge**
Investigate rapidly-evolving domains (LLM, Quantum, Biotech, Materials, etc.)

- **Minimum Evidence**: 2+ independent Tier-1 sources (for PRELIMINARY status)
- **Reasoning Mandatory**: Articulate the logic connecting quotes to conclusion
- **Personal Hypotheses**: Central to investigation (testable predictions)
- **Revisit**: Every 3-6 months (domain changes rapidly)
- **Status**: HYPOTHESIS → PRELIMINARY → VALIDATED → SUPERSEDED

**File**: `memory/mindbase/skills/research-bleedingedge/SKILL.md`

---

#### 2. **research-known**
Look up established facts (HTTP, OAuth, Algorithms, Physics, etc.)

- **Minimum Evidence**: 1 canonical source + 1 confirmation
- **Scope Mandatory**: Version, platform, or context must be stated
- **Personal Hypotheses**: Not applicable (truth is canonical)
- **Revisit**: Only if specification changes
- **Status**: CANONICAL / VERIFIED / DEPRECATED

**File**: `memory/mindbase/skills/research-known/SKILL.md`

---

### Supporting Documentation (9 Files)

| File | Purpose | Read Time |
|------|---------|-----------|
| `RESEARCH_UNIFIED_FRAMEWORK.md` | Joint requirements, tier system, conflict resolution | 20 min |
| `RESEARCH_QUICK_REF.md` | One-page cheat sheet; skill picker; templates | 5 min |
| `RESEARCH_QUICKSTART.md` | Step-by-step implementation guide with templates | 20 min |
| `RESEARCH_FAQ.md` | 50+ FAQs, edge cases, troubleshooting | 30 min |
| `RESEARCH_IMPLEMENTATION_SUMMARY.md` | System overview and file directory | 10 min |
| `RESEARCH_MASTER_INDEX.md` | Navigation hub and reference guide | 5 min |
| `memory/knowledgebase/RESEARCH_ORGANIZATION.md` | KB structure, finding format, automation details | 15 min |
| `scripts/knowledgebase/validate-findings.js` | Validation automation (10.2 KB) | - |
| `scripts/knowledgebase/rebuild-index.js` | Index rebuild automation (9.7 KB) | - |

---

## 🎯 Core Features

### Unified Across Both Skills

✅ **URL Permanence Mandate**
- Only DOI, archive.org, or official docs
- Rejects ephemeral sources (Reddit, Twitter, Medium)

✅ **5-Tier Credibility System**
- Tier-1: Peer-reviewed, official specs, textbooks
- Tier-2: Company reports, author blogs
- Tier-3: Tutorials, university notes
- Tier-4: StackOverflow, guides
- Tier-5+: Do not use (forum posts, AI summaries)

✅ **Conflict Resolution**
- Preserve both sides of contradictions
- Document credibility delta
- Set revisit trigger for resolution

✅ **Scope & Version Specificity**
- Never vague ("Python is fast")
- Always specific ("Python 3.11 with type hints is 50-100x faster for numeric workloads")

✅ **Reasoning Chain Transparency**
- Articulate how evidence supports conclusion
- Distinguish sufficiency from necessity
- Identify logical gaps explicitly

✅ **YAML Metadata + Structured Finding Format**
- Front matter: id, title, domain, status, dates, tags
- Body: Claim, Reasoning, Evidence (with quotes), Limitations, Revisit Plan
- Cross-references: related findings, conflicts

✅ **Automated Validation**
- `npm run kb:validate` checks all findings
- Catches: missing fields, ephemeral URLs, orphaned references, status inconsistencies

✅ **Automated Indexing**
- `npm run kb:rebuild` generates:
  - `_manifest.md` (global index of all findings)
  - `[domain]/_index.md` (per-domain indices)
  - `_revisit-schedule.md` (calendar of upcoming revisits)

---

## 🗂️ Knowledge Base Organization

Findings stored in structured hierarchy:

```
memory/knowledgebase/research/
├── _manifest.md                    # Global index (auto-generated)
├── _revisit-schedule.md            # Calendar of revisits (auto-generated)
├── bleeding-edge/                  # Rapidly-evolving domains
│   ├── llm/                        # Large Language Models
│   ├── quantum-computing/          # Quantum
│   ├── biotech/                    # CRISPR, protein folding
│   ├── materials/                  # Graphene, perovskite
│   ├── climate-modeling/
│   └── distributed-systems/
└── known/                          # Established knowledge
    ├── algorithms/                 # Sorting, search, graphs
    ├── standards/                  # RFC, HTTP, OAuth, SQL
    ├── frameworks/                 # React, Node.js, PostgreSQL
    ├── languages/                  # Python, JavaScript, Go
    ├── physics/                    # Classical mechanics, thermo, EM
    ├── math/                       # Linear algebra, calculus
    ├── design-patterns/            # GoF patterns
    └── security/                   # OWASP, crypto, auth
```

Each finding: `FIND-YYYYMMDD-NNN.md` (e.g., `FIND-20260614-001.md`)

---

## ✅ Validation Checklist

Before archiving ANY finding, verify:

```
EVIDENCE
  ☐ URL permanent? (DOI, archive.org, official docs)
  ☐ Quote exact? (word-for-word, not paraphrased)
  ☐ Quote in source? (can you find it if you re-read?)

REASONING
  ☐ Reasoning chain solid? (premises → conclusion)
  ☐ Scope clear? (version, platform, context)
  ☐ Does NOT apply section included? (exceptions)

METADATA
  ☐ Status valid for domain?
  ☐ Source tier assigned?
  ☐ Revisit date + trigger set?
  ☐ Related findings exist?

AUTOMATION
  ☐ npm run kb:validate passes
  ☐ npm run kb:rebuild works
```

---

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Create directories
mkdir -p memory/knowledgebase/research/{bleeding-edge,known}/{llm,standards}

# 2. Copy template from RESEARCH_QUICKSTART.md into file
touch memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-001.md

# 3. Validate
npm run kb:validate

# 4. Rebuild indices
npm run kb:rebuild

# 5. View global index
cat memory/knowledgebase/research/_manifest.md
```

---

## 🎓 Key Differentiators

### research-known (Fast Lookups)
- **Time**: 15-30 min per finding
- **Evidence**: 1 canonical + 1 confirmation
- **Example**: "HTTP GET forbidden to have body" (RFC 7231)
- **Status**: CANONICAL / DEPRECATED

### research-bleedingedge (Deep Investigation)
- **Time**: 1-3 hours per finding (iterative)
- **Evidence**: 2+ independent sources (PRELIMINARY); 3+ (VALIDATED)
- **Example**: "Transformers sufficient but not necessary for LLMs"
- **Status**: HYPOTHESIS → PRELIMINARY → VALIDATED

---

## 📚 Recommended Reading Order

### First Time (1 hour)
1. `RESEARCH_IMPLEMENTATION_SUMMARY.md` (5 min) — Overview
2. `RESEARCH_QUICK_REF.md` (5 min) — Skill picker
3. `RESEARCH_QUICKSTART.md` (20 min) — Step-by-step
4. Create first finding (20 min) — Hands-on
5. `npm run kb:validate && npm run kb:rebuild` (5 min) — Verify

### Deep Dive (2 hours)
1. `research-bleedingedge/SKILL.md` (15 min)
2. `research-known/SKILL.md` (15 min)
3. `RESEARCH_UNIFIED_FRAMEWORK.md` (20 min)
4. `memory/knowledgebase/RESEARCH_ORGANIZATION.md` (15 min)
5. `RESEARCH_FAQ.md` (30 min) — Edge cases

### Reference (As Needed)
- `RESEARCH_FAQ.md` — Any question
- `RESEARCH_QUICK_REF.md` — One-pager reminder
- Scripts — Automation details

---

## 🔍 Tier System at a Glance

| Tier | Examples | Use For |
|------|----------|---------|
| **Tier-1** | Peer-reviewed journals, RFC, official docs, textbooks | Primary evidence (all findings) |
| **Tier-2** | Company research reports, author blogs, O'Reilly books | Confirmation or primary (with 2+ sources) |
| **Tier-3** | Tutorials, MIT OpenCourseWare, expert blogs | Confirmation only |
| **Tier-4** | High-voted StackOverflow, established guides | Confirmation only |
| **Tier-5+** | Reddit, Twitter, Medium, unvetted blogs, LLM summaries | ❌ Do not use |

---

## 💡 Philosophy

### Scientific Rigor Without Perfectionism
- PRELIMINARY findings are valid; VALIDATED can wait
- Iterate; update as evidence arrives
- No requirement for 100% certainty

### Transparency Over Certainty
- Reasoning must be articulated
- Conflicts preserved (both sides documented)
- Assumptions explicit
- Revisit triggers set proactively

### Automation Where Mechanical
- Validation scripts catch rigor violations
- Indices auto-generate from findings
- Revisit schedule auto-tracked
- Cross-references auto-validated

### Human Judgment Preserved
- Researchers choose status
- Conflicts analyzed by domain experts
- Escalation paths for hard cases
- No "approve/reject" gate; just validation

---

## 🆘 Support & Troubleshooting

| Question | Answer File |
|----------|------|
| "Which skill should I use?" | `RESEARCH_QUICK_REF.md` or `RESEARCH_FAQ.md` → "Skill Selection" |
| "How do I create a finding?" | `RESEARCH_QUICKSTART.md` (templates + step-by-step) |
| "What makes a good source?" | `RESEARCH_UNIFIED_FRAMEWORK.md` → Tier System |
| "How do I handle conflicts?" | `RESEARCH_FAQ.md` → "Conflict Resolution" |
| "Validation failed. Why?" | `RESEARCH_UNIFIED_FRAMEWORK.md` → Rigor Gates |
| "How do I set up automation?" | `memory/knowledgebase/RESEARCH_ORGANIZATION.md` → Automation section |
| "Can I use [source]?" | `RESEARCH_FAQ.md` → "Source Credibility FAQs" |

---

## 📋 Files Delivered

**Skill Definitions** (2 files, 24 KB):
- `research-bleedingedge/SKILL.md`
- `research-known/SKILL.md`

**Documentation** (7 files, 113 KB):
- `RESEARCH_UNIFIED_FRAMEWORK.md`
- `RESEARCH_QUICK_REF.md`
- `RESEARCH_QUICKSTART.md`
- `RESEARCH_FAQ.md`
- `RESEARCH_IMPLEMENTATION_SUMMARY.md`
- `RESEARCH_MASTER_INDEX.md`
- `memory/knowledgebase/RESEARCH_ORGANIZATION.md`

**Automation** (2 files, 20 KB):
- `scripts/knowledgebase/validate-findings.js`
- `scripts/knowledgebase/rebuild-index.js`

**Total**: ~140 KB documentation + scripts

---

## 🎯 Success Metrics

Your system is working when:

✅ research-known findings take 15-30 min (not more)  
✅ research-bleedingedge findings take 1-2 hours (iterative)  
✅ `npm run kb:validate` passes all findings  
✅ `npm run kb:rebuild` generates indices without error  
✅ Revisit schedule auto-updates  
✅ Findings persist across sessions  
✅ Cross-references work (no orphans)  
✅ Integration with task execution works  

---

## 🔗 Integration Points

### With Task Execution
- **Phase 0**: Define research needed
- **Phase 1**: Check knowledgebase for existing findings
- **Phase 2**: Use skills to fill research gaps
- **Phase 5**: Archive new findings to knowledgebase

### With Session Memory
```
ctx_session(action="finding", value="[BLEEDINGEDGE-VALIDATED] [LLM] Claim. Sources. FIND-ID")
```

### With Cross-Session Continuity
- Findings persist in knowledgebase
- Revisit schedule tracked automatically
- Indices auto-updated
- Session references findings

---

## ⚡ Key Gotchas (Avoid These)

❌ Using "recent" as "correct" (newer ≠ better; prefer foundational + recent)  
❌ Treating consensus as evidence (10 blogs ≠ 1 peer-reviewed paper)  
❌ Quoting without understanding (re-read; can you explain it?)  
❌ Version blindness (always specify scope)  
❌ Forum posts as primary sources (trace to primary source only)  
❌ Deleting outdated findings (mark DEPRECATED instead)  
❌ Vague claims ("X is good" instead of "X does Y in context Z")  

---

## 🚀 Next Steps

1. **Read** `RESEARCH_IMPLEMENTATION_SUMMARY.md` (5 min)
2. **Decide** which skill to use (known vs bleedingedge)
3. **Create** first finding using template from `RESEARCH_QUICKSTART.md`
4. **Validate** with `npm run kb:validate`
5. **Rebuild** with `npm run kb:rebuild`
6. **Integrate** findings into tasks

---

## ✨ Why This Works

### For research-known
- Fast lookups (canonical source + confirmation)
- Prevents vague claims
- Clear scope/version
- No over-thinking

### For research-bleedingedge
- Transparent reasoning chains
- Status tracking (HYPOTHESIS → VALIDATED)
- Automated revisit reminders
- Conflict preservation (both sides documented)

### Unified
- Permanent URLs (no link rot)
- Tier credibility system
- Automated validation + indexing
- Cross-session persistence
- Human judgment preserved (no gates)

---

## 📞 Contact & Escalation

**System Questions?** → Check `RESEARCH_FAQ.md`  
**Setup Issues?** → Check `RESEARCH_QUICKSTART.md` → Troubleshooting  
**Validation Errors?** → Check `RESEARCH_UNIFIED_FRAMEWORK.md` → Rigor Gates  
**Found Conflict?** → Create issue in `issues/active/RESEARCH-CONFLICT-*.md`  
**Need Urgent Update?** → Use `ctx_session(action="task")`  

---

## 🎉 Ready to Begin

All files are in place. All templates are provided. All automation is ready.

**Pick a claim. Pick a skill. Create your first finding.**

No more barriers. Just rigor + transparency.

---

**System Delivery Date**: 2026-06-14  
**Status**: ✅ Production Ready  
**Version**: 1.0  
**Maintainer**: Research Skill System

---

*Go build knowledge. Make it last.*
