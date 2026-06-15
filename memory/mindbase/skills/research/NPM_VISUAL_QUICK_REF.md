# NPM Commands & Calendar: Visual Quick Reference

## The Two Commands

**npm run kb:validate** — Rigor Gate Enforcement
- Scans ALL findings for errors
- Checks 10+ standards (YAML, fields, URLs, sources, etc.)
- Exit code 0 = pass, 1 = fail

**npm run kb:rebuild** — Auto-Generate Indices & Calendar
- Generates _manifest.md (global index)
- Generates [domain]/_index.md (per-domain indices)
- Generates _revisit-schedule.md (revisit calendar)

---

## Validation Script: What It Checks

```
EACH FINDING (FIND-*.md)
├── ✅ YAML front matter valid (--- ... ---)
├── ✅ Required fields present (id, title, domain, status, date_created)
├── ✅ Domain-specific fields
│   ├── If bleeding-edge: hypothesis, reasoning_chain
│   └── If known: sources defined
├── ✅ Status valid for domain
│   ├── Bleeding-edge: HYPOTHESIS, PRELIMINARY, VALIDATED, SUPERSEDED, CHALLENGED
│   └── Known: CANONICAL, VERIFIED, DEPRECATED, SCOPE-LIMITED
├── ✅ URLs permanent
│   ├── ✅ OK: DOI, archive.org, rfc-editor.org, github.com (commits), .org docs
│   └── ❌ NOT OK: reddit.com, twitter.com, medium.com, quora.com, youtube
├── ✅ Source count sufficient
│   ├── PRELIMINARY bleeding-edge: 2+ sources
│   └── VALIDATED bleeding-edge: 3+ sources
├── ✅ Revisit date set (if not "Never")
├── ✅ Related findings exist (cross-references valid)
└── ✅ Evidence quotes present (PRELIMINARY/VALIDATED findings)
```

**Output**: Pass/Fail report with stats by domain and status.

---

## Rebuild Script: 3 Outputs Generated

### Output 1: _manifest.md (Global Index)
**Location**: `memory/knowledgebase/research/_manifest.md`
**Purpose**: One-stop reference for ALL findings

Shows:
- All findings grouped by domain
- Status distribution (pie chart)
- Total count + breakdown (bleeding-edge vs known)

**Used for**: "Show me everything"

---

### Output 2: Domain Indices
**Location**: `memory/knowledgebase/research/[domain]/[subdomain]/_index.md`  
**Example**: `bleeding-edge/llm/_index.md`, `known/standards/_index.md`  
**Purpose**: Deep-dive for each domain

Shows:
- All findings within that domain
- Grouped by topic (via tags)
- Status breakdown + maturity assessment

**Used for**: "Show me all LLM findings" or "Show me all HTTP findings"

---

### Output 3: _revisit-schedule.md (Action Calendar)
**Location**: `memory/knowledgebase/research/_revisit-schedule.md`  
**Purpose**: Calendar of upcoming revisits + urgency tracking

Shows:
- Findings grouped by month (YYYY-MM)
- Days remaining calculated
- Urgency flag if < 7 days (⚠️ URGENT)
- Trigger reason for each

**Used for**: "What do I need to review and when?"

---

## How the Revisit Calendar Works

### The Data Flow

```
FINDING FILE
  └─ YAML front matter
      ├─ revisit_date: 2026-09-14
      └─ revisit_trigger: Check for new SOTA models

  ↓ (npm run kb:rebuild)

SCRIPT PROCESSING
  1. Read all FIND-*.md files
  2. Parse YAML for revisit_date + revisit_trigger
  3. Filter out findings where revisit_date == "Never"
  4. Group by month (YYYY-MM)
  5. Calculate days remaining from today
  6. Flag if days < 7 (⚠️ URGENT)

  ↓

_revisit-schedule.md OUTPUT
  ## 2026-09
  ### 2026-09-14
  - **FIND-20260614-001** | Transformers sufficient but not necessary
    - Revisit: 2026-09-14 (92 days)
    - Trigger: Check for new SOTA models
```

---

## Timeline Example

```
TODAY: 2026-06-14
  ├─ You create finding with revisit_date: 2026-09-14
  └─ npm run kb:rebuild

CALENDAR SHOWS (2026-06-14):
  ├─ 2026-09-14 (92 days away)

CALENDAR SHOWS (2026-09-07):
  ├─ 2026-09-14 (7 days away) ⚠️ URGENT

REVISIT DATE: 2026-09-14
  ├─ You read trigger: "Check for new SOTA models?"
  ├─ You search arXiv + check blogs
  ├─ If YES (new models): Update finding (mark SUPERSEDED)
  ├─ If NO (nothing new): Extend revisit_date to 2026-12-14
  └─ npm run kb:rebuild

CALENDAR UPDATES:
  ├─ Old entry removed (superseded)
  └─ New entry added (extended to 2026-12-14)
```

---

## What Gets Generated

### _manifest.md Example

```
# All Research Findings Manifest

**Total Findings**: 15
**Bleeding-Edge**: 10 | **Known**: 5

## Bleeding-Edge (10)

### llm (7 findings)
| ID | Title | Status | Revisit |
| FIND-001 | Transformers sufficient | VALIDATED | 2026-09-14 |
| FIND-002 | Chinchilla laws | PRELIMINARY | 2026-09-01 |
| FIND-008 | Instruction tuning | HYPOTHESIS | 2026-07-15 |

### quantum-computing (3 findings)
[Similar table]

## Status Distribution
VALIDATED    8 (53%)
PRELIMINARY  5 (33%)
CANONICAL    2 (13%)
```

---

### Domain Index Example (_index.md)

```
# LLM Research Findings

**Total**: 7 findings
**Status**: 2 VALIDATED, 3 PRELIMINARY, 2 HYPOTHESIS

## By Topic

### architecture
| ID | Title | Status | Revisit |
| FIND-001 | Transformers sufficient | VALIDATED | 2026-09-14 |
| FIND-003 | Mamba scaling | PRELIMINARY | 2026-08-01 |

### scaling
| FIND-002 | Chinchilla laws | PRELIMINARY | 2026-09-01 |
| FIND-004 | Memorization | PRELIMINARY | 2026-08-15 |

## Statistics
- Maturity: Rapidly evolving
- Consensus: 2/7 validated (29%)
```

---

### Revisit Calendar Example

```
# Research Findings Revisit Schedule

**Total Needing Revisit**: 8

## 2026-07

### 2026-07-15
- **FIND-008** | Instruction tuning saturation
  - Revisit: 2026-07-15 (1 day) ⚠️ URGENT
  - Trigger: Check for LLaMA3 papers

### 2026-07-30
- **FIND-005** | Reasoning vs pattern-matching
  - Revisit: 2026-07-30 (16 days)
  - Trigger: Mechanistic interpretability updates

## 2026-08

### 2026-08-01
- **FIND-003** | Mamba vs attention
  - Revisit: 2026-08-01 (18 days)
  - Trigger: Conference follow-up papers

### 2026-08-15
- **FIND-004** | Memorization in benchmarks
  - Revisit: 2026-08-15 (32 days)
  - Trigger: New mechanistic interpretability results

## 2026-09

### 2026-09-01
- **FIND-002** | Chinchilla laws saturation
  - Revisit: 2026-09-01 (79 days)
  - Trigger: OpenAI/Meta post-training results

### 2026-09-14
- **FIND-001** | Transformers sufficient but not necessary
  - Revisit: 2026-09-14 (92 days)
  - Trigger: Check for architectural counterexamples
```

---

## One-Minute Workflow

### Creating a Finding

```bash
# 1. Write finding with revisit fields
cat > memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-001.md
# (with YAML: id, title, status, revisit_date, revisit_trigger)

# 2. Validate
npm run kb:validate
# Output: ✅ All checks pass

# 3. Rebuild indices
npm run kb:rebuild
# Output: ✅ 3 files generated

# 4. Check calendar
cat memory/knowledgebase/research/_revisit-schedule.md
# Shows: 2026-09-14 (92 days away)
```

---

## When to Run

| Scenario | Run |
|----------|-----|
| Creating new finding | kb:validate → kb:rebuild |
| Modifying existing finding | kb:validate → kb:rebuild |
| Weekly maintenance | kb:validate → kb:rebuild |
| Checking what's due | (just read _revisit-schedule.md) |
| Setting up CI/CD | kb:validate (catches errors) |

---

## Key Points

✅ **Always validate first** (catches errors before indexing)  
✅ **Then rebuild** (regenerates all 3 outputs)  
✅ **Calendar auto-updates** (no manual calendar maintenance)  
✅ **Revisit dates control revisit schedule** (trigger + date in YAML)  
✅ **"Never" = immutable** (canonical/established facts)  
✅ **Exit code 0 = success** (code 1 = errors, requires fix)  

---

**Version**: 1.0  
**Date**: 2026-06-14
