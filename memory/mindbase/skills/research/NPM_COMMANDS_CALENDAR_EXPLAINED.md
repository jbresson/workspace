# NPM Commands & Calendar System

---

## npm run kb:validate

**What it does**: Validates all findings against rigor standards.

**Checks** (automatic):
- YAML front matter valid (--- ... ---)
- Required fields present
- Domain-specific fields correct
- Status valid for domain
- URLs permanent (rejects reddit, twitter, medium, youtube)
- Source count sufficient (2+ for PRELIMINARY, 3+ for VALIDATED)
- Revisit date set
- Related findings exist
- Evidence quotes present

**Usage**: `npm run kb:validate`

**Output**: Pass/fail report with stats by domain and status

**Exit codes**:
- 0 = all pass ✅
- 1 = errors found ❌ (fix required before proceeding)

**When to run**: Before committing findings, weekly maintenance

---

## npm run kb:rebuild

**What it does**: Auto-generates all indices from findings.

**Generates** (3 outputs):

1. **_manifest.md** (global index)
   - Location: `memory/knowledgebase/research/_manifest.md`
   - Shows: All findings across all domains
   - Grouped by: Domain + status
   - Includes: Status distribution graph

2. **[domain]/_index.md** (per-domain index)
   - Location: `memory/knowledgebase/research/[domain]/[subdomain]/_index.md`
   - Shows: All findings within one domain
   - Grouped by: Topic (via tags)
   - Includes: Maturity assessment + consensus level

3. **_revisit-schedule.md** (action calendar)
   - Location: `memory/knowledgebase/research/_revisit-schedule.md`
   - Shows: All findings needing revisit
   - Grouped by: Month (YYYY-MM)
   - Includes: Days remaining, urgency flag if < 7 days, trigger text

**Usage**: `npm run kb:rebuild`

**When to run**: After creating/modifying findings

---

## How the Calendar Works

**Input**: YAML front matter in each finding

```yaml
revisit_date: 2026-09-14
revisit_trigger: "Check for new SOTA models"
```

**Processing**:
1. Read all FIND-*.md files
2. Extract revisit_date + revisit_trigger
3. Skip findings where revisit_date == "Never"
4. Sort by date ascending
5. Group by month (YYYY-MM)
6. Calculate days remaining from today
7. Flag if days < 7 (⚠️ URGENT)

**Output**: Markdown calendar showing what to review and when

**Automation**:
- Revisit dates auto-calculated (no manual arithmetic)
- Calendar regenerated on each rebuild
- Days remaining always current
- Urgency flag auto-triggered

---

## Workflow

**Creating a finding**:
```bash
# 1. Write finding with revisit fields
cat > memory/knowledgebase/research/[domain]/[subdomain]/FIND-YYYYMMDD-NNN.md
# Include: revisit_date, revisit_trigger in YAML

# 2. Validate
npm run kb:validate

# 3. Rebuild
npm run kb:rebuild

# 4. Check calendar
cat memory/knowledgebase/research/_revisit-schedule.md
```

**When revisit date arrives**:
```bash
# 1. Read trigger (what to check for)
# 2. Search (30 min to 2 hours depending on status)
# 3. Decide: Event happened? YES/NO
# 4. Update finding if YES, extend date if NO
# 5. npm run kb:rebuild
```

---

## Time Estimates

| Task | Time |
|------|------|
| HYPOTHESIS revisit | 30 minutes |
| PRELIMINARY revisit | 1 hour |
| VALIDATED revisit | 1-2 hours |
| Validation check | 1 minute |
| Index rebuild | 1 minute |

---

## Example Calendar Output

```
# Research Findings Revisit Schedule

Auto-Generated: 2026-06-15T10:30:00Z
Findings Needing Revisit: 8

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
- **FIND-003** | Mamba vs attention scaling
  - Revisit: 2026-08-01 (18 days)
  - Trigger: Conference follow-up papers
```

---

Version: 1.0 (Human-Optimized)
