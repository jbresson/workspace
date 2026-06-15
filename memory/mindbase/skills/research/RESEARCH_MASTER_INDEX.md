# 🔬 Research Skills: Master Index

**Status**: ✅ Complete & Ready  
**Created**: 2026-06-14  
**Total Documentation**: 9 files, ~120 KB

---

## 🎯 Start Here

### For First-Time Users
1. Read: `RESEARCH_IMPLEMENTATION_SUMMARY.md` (5 min overview)
2. Decide: Which skill? `RESEARCH_QUICK_REF.md` (skill picker)
3. Build: First finding using `RESEARCH_QUICKSTART.md` (step-by-step)
4. Validate: `npm run kb:validate`
5. Index: `npm run kb:rebuild`

### For Reference
- **Quick answers**: `RESEARCH_FAQ.md` (50+ FAQs)
- **One-page cheat**: `RESEARCH_QUICK_REF.md`
- **Detailed rules**: `RESEARCH_UNIFIED_FRAMEWORK.md`

### For Setup
- **Directory structure**: `memory/knowledgebase/RESEARCH_ORGANIZATION.md`
- **Automation scripts**: `scripts/knowledgebase/{validate,rebuild}.js`

---

## 📚 Complete File Listing

### Skill Definitions
| File | Purpose | Read Time |
|------|---------|-----------|
| `research-bleedingedge/SKILL.md` | Rapidly-evolving domains (LLM, quantum, biotech) | 15 min |
| `research-known/SKILL.md` | Established knowledge (algorithms, standards, APIs) | 15 min |

### Frameworks & Standards
| File | Purpose | Read Time |
|------|---------|-----------|
| `RESEARCH_UNIFIED_FRAMEWORK.md` | Joint requirements, differentiation, tier system | 20 min |
| `RESEARCH_QUICK_REF.md` | One-page cheat sheet with templates | 5 min |
| `RESEARCH_QUICKSTART.md` | Complete step-by-step implementation guide | 20 min |
| `RESEARCH_FAQ.md` | 50+ FAQs, edge cases, troubleshooting | 30 min |
| `RESEARCH_IMPLEMENTATION_SUMMARY.md` | Overview of entire system | 10 min |
| `RESEARCH_MASTER_INDEX.md` | This file | 5 min |

### Knowledge Base Organization
| File | Purpose |
|------|---------|
| `memory/knowledgebase/RESEARCH_ORGANIZATION.md` | Directory structure, finding format, automation |

### Automation Scripts
| File | Purpose |
|------|---------|
| `scripts/knowledgebase/validate-findings.js` | Validates all findings against rigor standards |
| `scripts/knowledgebase/rebuild-index.js` | Auto-generates indices and revisit schedule |

---

## 🧭 Navigation by Use Case

### "I want to look up a known fact (HTTP, OAuth, Python)"
1. Use: **research-known skill**
2. Time: 15-30 min
3. Reference: `RESEARCH_QUICKSTART.md` → research-known template
4. Validate: `npm run kb:validate`
5. Archive: `memory/knowledgebase/research/known/{domain}/FIND-*.md`

### "I want to investigate a bleeding-edge topic (LLM, quantum, biotech)"
1. Use: **research-bleedingedge skill**
2. Time: 1-3 hours
3. Reference: `RESEARCH_QUICKSTART.md` → research-bleedingedge template
4. Validate: `npm run kb:validate`
5. Archive: `memory/knowledgebase/research/bleeding-edge/{domain}/FIND-*.md`

### "I found conflicting information"
1. Read: `RESEARCH_UNIFIED_FRAMEWORK.md` → Conflict Resolution Protocol
2. Read: `RESEARCH_FAQ.md` → Conflict Resolution FAQs
3. Create: Both findings with conflict tags
4. Escalate: Via `ctx_session(action="finding")`

### "I have a finding that's outdated"
1. Mark: `status: DEPRECATED`
2. Link: `superseded_by: "FIND-YYYY-MM-DD-NNN"`
3. Preserve: Don't delete; archive with context
4. Update: Re-run `npm run kb:rebuild`

### "I want to check upcoming revisits"
1. Run: `npm run kb:rebuild`
2. View: `cat memory/knowledgebase/research/_revisit-schedule.md`
3. Set reminder: 1 week before due date via `ctx_session`

### "I want to find related findings"
1. Check: Finding's `related_findings` field
2. Or: Search by tag in `_manifest.md`
3. Or: Use `ctx_semantic_search` in knowledgebase

---

## 🔍 How Each Skill Works

### research-known (Established Knowledge)

**When to use**: Canonical truth exists (RFC, official docs, textbook, physics laws)

**Minimum evidence**: 
- 1 canonical source (official spec/docs/textbook)
- 1 confirmation source (different author)

**Process** (15-30 min):
1. Find canonical source → quote it
2. Find confirmation source → quote it
3. State scope/version → note exceptions
4. Archive to knowledgebase

**Examples**:
- "HTTP GET must not have request body" (RFC 7231)
- "Quicksort has O(n²) worst case" (Knuth, CLRS)
- "OAuth2 requires HTTPS for auth endpoint" (RFC 6749)

---

### research-bleedingedge (Rapidly-Evolving Domains)

**When to use**: Active research frontier (LLM, quantum, biotech, materials)

**Status journey**:
- **HYPOTHESIS** (1 source) → Initial working idea
- **PRELIMINARY** (2+ sources) → Multiple independent researchers converge
- **VALIDATED** (3+ sources) → Strong consensus; reasoning chain solid
- **SUPERSEDED** (new finding better) → Archive with link to new finding

**Minimum evidence**:
- HYPOTHESIS: 1 Tier-1 source (paper, preprint, author blog)
- PRELIMINARY: 2 independent Tier-1 sources
- VALIDATED: 3+ independent Tier-1 sources + reasoning chain

**Process** (1-3 hours):
1. Form testable hypothesis
2. Search for independent sources (papers, preprints, author blogs)
3. Extract quotes from each
4. Reason together (A + B → Conclusion)
5. Assign status (HYPOTHESIS/PRELIMINARY/VALIDATED)
6. Set revisit date + trigger
7. Archive to knowledgebase

**Examples**:
- "Transformers sufficient but not necessary for LLMs" (Mamba + theory)
- "Logical qubits require <1000 physical qubits" (Google Willow)
- "Memorization explains >50% of benchmark performance" (interpretability)

---

## 🎓 Tier System (Credibility)

### Tier-1 (Canonical)
- Peer-reviewed journals (Nature, Science, JMLR, NeurIPS)
- Official specifications (RFC, W3C, ISO)
- Official documentation (python.org, react.dev, AWS docs)
- Textbooks (Knuth, CLRS, Shelah)

### Tier-2 (Trusted)
- Company technical reports (Meta AI, DeepMind, OpenAI)
- Author's own technical blog with reproducible evidence
- Established O'Reilly/Pragmatic Programmer books
- Standards organizations (IETF, W3C, IEEE)

### Tier-3 (Secondary)
- Tutorials by framework creators (Next.js, Flask)
- University lecture notes / MIT OpenCourseWare
- Trusted expert blogs (Dan Abramov on React)

### Tier-4 (Tertiary)
- Stack Overflow (high votes + author credibility)
- Established tutorials / guides

### Tier-5+ (Not Recommended)
- ❌ Reddit posts
- ❌ Twitter/X
- ❌ Medium blogs (unvetted)
- ❌ Quora
- ❌ YouTube tutorials
- ❌ LLM-generated summaries

---

## ✅ Validation Checklist

Before archiving ANY finding:

```
Domain & Status
  ☐ Domain correct? (bleeding-edge vs known)
  ☐ Status valid for domain? (no HYPOTHESIS for research-known)

Evidence
  ☐ URL permanent? (DOI, archive.org, or official docs; NOT reddit/medium)
  ☐ Quote exact? (word-for-word from source, NOT paraphrased)
  ☐ Quote in source? (can you find it if you re-read?)
  ☐ Minimum sources met? (research-known: 1+1; bleedingedge: 2+ for PRELIMINARY)

Reasoning
  ☐ Reasoning chain solid? (premises logically support conclusion)
  ☐ Scope clear? (version, platform, context stated)
  ☐ Does NOT apply section included? (exceptions noted)

Metadata
  ☐ Source tier assigned? (Tier-1, Tier-2, etc.)
  ☐ Revisit date set? (never for CANONICAL; always for bleeding-edge)
  ☐ Revisit trigger clear? (what event triggers update?)
  ☐ Related findings exist? (no orphaned references)

Validation
  ☐ npm run kb:validate passes? (no errors)
  ☐ npm run kb:rebuild works? (indices update)
```

---

## 🗂️ Knowledge Base Organization

```
memory/knowledgebase/research/
├── _manifest.md                    # Global index (all findings)
├── _revisit-schedule.md            # Calendar of upcoming revisits
├── bleeding-edge/
│   ├── llm/
│   │   ├── _index.md               # Domain index
│   │   ├── FIND-20260614-001.md    # Individual finding
│   │   ├── FIND-20260614-002.md
│   │   └── [...]
│   ├── quantum-computing/
│   ├── biotech/
│   ├── materials/
│   ├── climate-modeling/
│   └── distributed-systems/
└── known/
    ├── algorithms/
    │   ├── _index.md
    │   └── [findings]
    ├── standards/
    │   ├── http/
    │   ├── oauth/
    │   └── [...]
    ├── frameworks/
    │   ├── react/
    │   ├── nodejs/
    │   └── [...]
    ├── languages/
    │   ├── python/
    │   ├── javascript/
    │   └── [...]
    ├── physics/
    ├── math/
    ├── design-patterns/
    └── security/
```

---

## 🤖 Automation

### Validate Findings
```bash
npm run kb:validate
```
Checks:
- YAML front matter valid
- Required fields present
- URLs permanent (no ephemeral)
- Status consistency
- Cross-references valid

### Rebuild Indices
```bash
npm run kb:rebuild
```
Generates:
- `_manifest.md` (global index)
- `[domain]/_index.md` (per-domain)
- `_revisit-schedule.md` (calendar)

### Set Up npm Scripts
```json
{
  "scripts": {
    "kb:validate": "node scripts/knowledgebase/validate-findings.js",
    "kb:rebuild": "node scripts/knowledgebase/rebuild-index.js"
  }
}
```

---

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Create directories
mkdir -p memory/knowledgebase/research/bleeding-edge/llm
mkdir -p memory/knowledgebase/research/known/standards

# 2. Copy template from RESEARCH_QUICKSTART.md
# 3. Create your first finding
touch memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-001.md

# 4. Validate
npm run kb:validate

# 5. Rebuild indices
npm run kb:rebuild

# 6. View indices
cat memory/knowledgebase/research/_manifest.md
```

---

## 📖 Recommended Reading Order

### First Time (1 hour total)
1. **RESEARCH_IMPLEMENTATION_SUMMARY.md** (5 min) — Overview
2. **RESEARCH_QUICK_REF.md** (5 min) — Skill picker + templates
3. **RESEARCH_QUICKSTART.md** (20 min) — Step-by-step guide
4. **Create first finding** (20 min) — Hands-on
5. **Run validation** (5 min) — Verify

### Deep Dive (2 hours)
1. **RESEARCH_BLEEDINGEDGE/SKILL.md** (15 min) — Full definition
2. **RESEARCH_KNOWN/SKILL.md** (15 min) — Full definition
3. **RESEARCH_UNIFIED_FRAMEWORK.md** (20 min) — Joint standards
4. **RESEARCH_ORGANIZATION.md** (15 min) — KB structure
5. **RESEARCH_FAQ.md** (30 min) — Edge cases + troubleshooting

### Reference (As Needed)
- **RESEARCH_FAQ.md** — Any question you hit
- **RESEARCH_QUICK_REF.md** — One-pager reminder
- Scripts in `scripts/knowledgebase/` — Automation details

---

## 🎯 Success Metrics

Your implementation is successful when:

✅ **research-known findings**:
- 15-30 min per finding (not more)
- Canonical + confirmation source
- Clear scope/version
- Validation passes

✅ **research-bleedingedge findings**:
- 1-2 hours per finding (initial)
- 2+ independent sources (for PRELIMINARY)
- Reasoning chain + quotes
- Validation passes

✅ **Knowledge Base**:
- Auto-indexed via `npm run kb:rebuild`
- Revisit schedule auto-generated
- No orphaned references
- Cross-findings navigable

✅ **Integration**:
- Session memory links to findings
- Task execution consults KB
- Findings persist across sessions

---

## 💡 Key Principles

1. **Scientific Rigor Without Perfectionism**
   - PRELIMINARY is fine; VALIDATED can wait
   - Iterate; update findings as evidence changes

2. **Transparency Over Certainty**
   - Conflicts are features; preserve both sides
   - Reasoning must be articulated
   - Assumptions must be explicit

3. **Automation Where Mechanical**
   - Validation scripts catch errors
   - Indices auto-generate
   - Revisit calendar auto-tracked

4. **Human Judgment Preserved**
   - Researchers choose status
   - Conflicts resolved by analysis
   - Escalation paths available

---

## 🆘 Support

| Need | File |
|------|------|
| Quick answer | `RESEARCH_FAQ.md` |
| How-to guide | `RESEARCH_QUICKSTART.md` |
| One-page cheat | `RESEARCH_QUICK_REF.md` |
| Detailed rules | `RESEARCH_UNIFIED_FRAMEWORK.md` |
| Troubleshooting | `RESEARCH_FAQ.md` + `RESEARCH_QUICK_REF.md` |
| Validation error | `RESEARCH_UNIFIED_FRAMEWORK.md` (Rigor Gates) |
| Scale to team | Extend scripts + establish review process |

---

## 📋 Files in This System

| File | Size | Purpose |
|------|------|---------|
| `research-bleedingedge/SKILL.md` | 11.7 KB | Bleeding-edge skill definition |
| `research-known/SKILL.md` | 12.3 KB | Known facts skill definition |
| `RESEARCH_UNIFIED_FRAMEWORK.md` | 15.4 KB | Joint standards & tier system |
| `RESEARCH_QUICK_REF.md` | 6.7 KB | One-page cheat sheet |
| `RESEARCH_QUICKSTART.md` | 19.5 KB | Step-by-step guide |
| `RESEARCH_FAQ.md` | 16 KB | 50+ FAQs & troubleshooting |
| `RESEARCH_IMPLEMENTATION_SUMMARY.md` | 11.2 KB | System overview |
| `RESEARCH_MASTER_INDEX.md` | This file | Navigation & reference |
| `../knowledgebase/RESEARCH_ORGANIZATION.md` | 17.1 KB | KB structure & automation |
| `../../scripts/knowledgebase/validate-findings.js` | 10.2 KB | Validation script |
| `../../scripts/knowledgebase/rebuild-index.js` | 9.7 KB | Index rebuild script |
| **TOTAL** | **~140 KB** | Complete system |

---

## ✨ What Makes This Work

### For research-known
- Fast, canonical lookups (15-30 min)
- Clear scope/version
- Prevents vague claims

### For research-bleedingedge
- Transparent reasoning chains
- Status tracking (HYPOTHESIS → VALIDATED)
- Revisit automation
- Conflict preservation

### Unified Across Both
- Permanent URLs (DOI, archive.org)
- Tier credibility system
- Reasoning transparency
- Conflict resolution
- Automated validation

---

**Ready?** Pick a claim, pick a skill, create your first finding.

All the tools and templates are above. Go build.

---

*Last Updated*: 2026-06-14  
*Maintainer*: Research Skill System  
*Status*: ✅ Complete & Production Ready
