# Research Knowledgebase Organization & Tracking

## Directory Structure

```
memory/knowledgebase/
├── research/                          # All research findings
│   ├── _manifest.md                   # Index of all findings (auto-updated)
│   ├── _revisit-schedule.md           # Upcoming revisit dates (auto-tracked)
│   ├── bleeding-edge/                 # Rapidly evolving domains
│   │   ├── llm/                       # Large Language Models
│   │   │   ├── _index.md              # Domain index
│   │   │   ├── FIND-20260614-001.md   # Individual findings
│   │   │   ├── FIND-20260614-004.md
│   │   │   └── [...]
│   │   ├── quantum-computing/
│   │   │   ├── _index.md
│   │   │   ├── FIND-20260614-002.md
│   │   │   └── [...]
│   │   ├── biotech/                   # CRISPR, protein folding, synthetic bio
│   │   │   ├── _index.md
│   │   │   └── [...]
│   │   ├── materials/                 # Graphene, perovskite, etc.
│   │   │   ├── _index.md
│   │   │   └── [...]
│   │   ├── climate-modeling/
│   │   │   ├── _index.md
│   │   │   └── [...]
│   │   └── distributed-systems/       # New consensus, scaling
│   │       ├── _index.md
│   │       └── [...]
│   │
│   └── known/                         # Established, canonical knowledge
│       ├── algorithms/                # Classical algorithms, data structures
│       │   ├── _index.md
│       │   ├── FIND-sorting.md        # Quicksort, mergesort, etc.
│       │   ├── FIND-search.md         # Binary search, graph algorithms
│       │   └── [...]
│       ├── standards/                 # RFC, HTTP, OAuth, SQL
│       │   ├── _index.md
│       │   ├── FIND-http.md           # HTTP methods, status codes
│       │   ├── FIND-oauth.md          # OAuth2, OpenID
│       │   ├── FIND-sql.md            # SQL fundamentals
│       │   └── [...]
│       ├── frameworks/                # React, Node.js, PostgreSQL, Kubernetes
│       │   ├── _index.md
│       │   ├── FIND-react.md          # React v18, hooks, batching
│       │   ├── FIND-nodejs.md         # Node.js async, eventloop
│       │   ├── FIND-postgresql.md     # PostgreSQL operations, syntax
│       │   └── [...]
│       ├── languages/                 # Python, JavaScript, Go, Rust
│       │   ├── _index.md
│       │   ├── FIND-python.md         # Python 3.11+, stdlib
│       │   ├── FIND-javascript.md     # JS ES2023, async
│       │   └── [...]
│       ├── physics/                   # Classical mechanics, thermodynamics, EM
│       │   ├── _index.md
│       │   └── [...]
│       ├── math/                      # Linear algebra, calculus, probability
│       │   ├── _index.md
│       │   └── [...]
│       ├── design-patterns/           # GoF patterns, architectural patterns
│       │   ├── _index.md
│       │   └── [...]
│       └── security/                  # OWASP, crypto, authentication
│           ├── _index.md
│           └── [...]
│
└── [other categories: decisions/, projects/, etc.]
```

---

## Finding File Format (Standard)

Every finding is a standalone `.md` file with this structure:

```markdown
---
# Finding Metadata (YAML Front Matter)
id: "FIND-20260614-001"
title: "Transformers sufficient but not necessary for language modeling"
domain: "bleeding-edge"
sub_domain: "llm"
category: "architecture"
claim: "Attention mechanisms enable but don't require transformer architecture for LLM performance"
status: "VALIDATED"
confidence: "HIGH"
date_created: "2026-06-14"
date_modified: "2026-06-14"
tags: ["attention", "architecture", "scaling", "mechanistic-interpretability"]
related_findings: ["FIND-20260614-003", "FIND-20260614-007"]
---

# [Title]

## Claim
[One-sentence declarative statement]

## Hypothesis
[Testable working hypothesis driving the research; omit for research-known]

## Reasoning Chain
1. [First logical premise with source reference]
2. [Second logical premise]
3. [Conclusion from conjunction]

## Evidence

### Source 1: [Paper/RFC/Spec Title]
- **Type**: Peer-reviewed paper | Preprint | Official spec | Technical report
- **Authors/Org**: [Name(s)]
- **Date Published**: 2024-12-15
- **Date Accessed**: 2026-06-14
- **Tier**: Tier-1 / Tier-2 / Tier-3
- **URL**: [Permanent link with archive.org backup if needed]
- **DOI**: [If applicable]

**Quote 1** (Supporting premise A):
> "[Exact excerpt from source]"
> — Section/Page reference

**Quote 2** (Supporting premise B):
> "[Another excerpt]"
> — Section/Page reference

### Source 2: [Second Independent Source]
[Same format as Source 1]

### Source 3 (if applicable for VALIDATED status)
[Same format]

## Limitations & Scope

### Applies To
- [Specific domain: LLM training, transformer architectures]
- [Specific scale: Model size >1B parameters]
- [Specific context: English language, dense text]

### Does NOT Apply To
- [Common false extensions]
- [Exceptions to the rule]
- [Different contexts that contradict claim]

### Unknowns / Open Questions
- [What we can't yet verify]
- [Competing hypotheses not yet resolved]
- [Edge cases not tested]

## Conflicts with Prior Findings
- [Link to FIND-*.md if contradicts prior work]
- [Credibility delta: why we favor this version]
- [Status: SUPERSEDED / CONFLICTED / REFINED]

## Revisit Plan

**Trigger Events** (when to revisit):
- [Specific new research expected (e.g., "When OpenAI publishes next reasoning model")]
- [Competing hypothesis to monitor (e.g., "Mechanistic interpretability finds counterexample")]
- [Threshold event (e.g., "If model >100B params contradicts scaling law")]

**Revisit Date**: 2026-09-14 (3 months)

**Revisit Owner**: [If applicable; self if blank]

## Status Timeline
- **HYPOTHESIS** (2026-06-14): Initial formulation; 1 source found
- **PRELIMINARY** (2026-06-15): 2 independent sources converge
- **VALIDATED** (2026-06-20): 3+ sources + reasoning chain solid
- [Future entries as status changes]

## Related Findings
- FIND-20260614-003: "Mamba architecture scaling" (supports this finding)
- FIND-20260614-007: "RNN theoretical capacity vs transformers" (provides counterpoint)

## Personal Hypothesis Maturity (Bleeding-Edge Only)
- **Confidence**: HIGH (95%+) | MEDIUM (70-95%) | LOW (<70%)
- **Conviction Delta from Prior**: [Did this strengthen/weaken a prior belief?]
- **False Win Risk**: [Assumption that could break if wrong]

## Notes for Future Researchers
[Insights, blind spots, or experimental directions for next investigator]

## Session Context
- **Researched in Session**: [Session ID]
- **Tool Used**: brave-search, browser-tools, ctx_semantic_search
- **Time Spent**: ~1.5 hours
- **Researcher Notes**: [Anything useful for the next person reviewing this]

---

## Provenance
- **Source File**: memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-001.md
- **Archive Link**: [archive.org snapshot if applicable]
- **Revision**: 1.0
```

---

## Domain Index Files (_index.md)

Each domain folder contains a `_index.md` summarizing all findings in that domain:

```markdown
# LLM Research Findings Index

**Last Updated**: 2026-06-14
**Total Findings**: 7
**Status Breakdown**: 2 VALIDATED, 3 PRELIMINARY, 2 HYPOTHESIS

## Quick Reference (By Topic)

### Architecture & Design
| Finding | Status | Date | Revisit |
|---------|--------|------|---------|
| FIND-20260614-001 | Transformers sufficient but not necessary | VALIDATED | 2026-09-14 |
| FIND-20260614-003 | Mamba scaling vs attention | PRELIMINARY | 2026-08-01 |
| FIND-20260614-007 | Vision Transformer scaling | HYPOTHESIS | 2026-07-15 |

### Scaling Laws & Performance
| Finding | Status | Date | Revisit |
|---------|--------|------|---------|
| FIND-20260614-002 | Chinchilla laws apply beyond 10T tokens | PRELIMINARY | 2026-09-01 |
| FIND-20260614-004 | Memorization >50% of benchmark perf | PRELIMINARY | 2026-08-15 |

### Emergent Capabilities
| Finding | Status | Date | Revisit |
|---------|--------|------|---------|
| FIND-20260614-005 | Reasoning vs pattern-matching | HYPOTHESIS | 2026-07-30 |
| FIND-20260614-006 | In-context learning mechanism | VALIDATED | 2026-12-14 |

## Key Conflicts
- FIND-20260614-002 vs FIND-20260614-004: Scaling saturation [Investigate delta]

## Recommended Reading Order
1. **Foundations**: FIND-20260614-001, FIND-20260614-006
2. **Current Frontier**: FIND-20260614-002, FIND-20260614-004
3. **Emerging**: FIND-20260614-005

## Domain Status Assessment
- **Maturity**: Rapidly evolving (expect updates every 2-4 weeks)
- **Consensus**: Weak (many competing hypotheses)
- **Recommendation**: Revisit all findings Q3 2026; major update expected after LLaMA3 release
```

---

## Master Manifest (_manifest.md)

Central index across ALL findings:

```markdown
# All Research Findings Manifest

**Generated**: 2026-06-14 14:22:00 UTC  
**Total Findings**: 24  
**Bleeding-Edge**: 15 | **Known**: 9

---

## By Domain

### 🔥 Bleeding-Edge (15 findings)

#### LLM (7)
| ID | Title | Status | Revisit | TTL |
|----|----|--------|---------|-----|
| FIND-20260614-001 | Transformers sufficient but not necessary | VALIDATED | 2026-09-14 | 92d |
| FIND-20260614-002 | Chinchilla laws saturation | PRELIMINARY | 2026-09-01 | 79d |
| FIND-20260614-003 | Mamba vs attention scaling | PRELIMINARY | 2026-08-01 | 48d |
| FIND-20260614-004 | Memorization in benchmarks | PRELIMINARY | 2026-08-15 | 62d |
| FIND-20260614-005 | Reasoning vs pattern-matching | HYPOTHESIS | 2026-07-30 | 46d |
| FIND-20260614-006 | In-context learning mechanism | VALIDATED | 2026-12-14 | 184d |
| FIND-20260614-008 | Instruction tuning saturation | HYPOTHESIS | 2026-07-15 | 31d |

#### Quantum Computing (4)
| ID | Title | Status | Revisit | TTL |
|----|----|--------|---------|-----|
| FIND-20260614-009 | Logical qubit overhead <1000 physical | HYPOTHESIS | 2026-08-01 | 48d |
| ... | ... | ... | ... | ... |

#### Biotech (2)
#### Materials (1)
#### Distributed Systems (1)

### 📚 Known / Established (9)

#### Algorithms (3)
| ID | Title | Status | Revisit | TTL |
|----|----|--------|---------|-----|
| FIND-http-001 | HTTP GET no request body (RFC 7231) | CANONICAL | Never | ∞ |
| FIND-algo-001 | Quicksort O(n²) worst case | CANONICAL | Never | ∞ |
| FIND-algo-002 | Binary search O(log n) | CANONICAL | Never | ∞ |

#### Standards (3)
#### Frameworks (2)
#### Languages (1)

---

## Status Distribution

```
HYPOTHESIS      ████ 6 (25%)
PRELIMINARY     ██████ 9 (38%)
VALIDATED       ███ 5 (21%)
CANONICAL       ██ 3 (13%)
DEPRECATED      • 0 (0%)
CONFLICTED      • 0 (0%)
```

---

## Urgent Revisits (Next 30 Days)

| ID | Domain | Revisit Date | Days Left | Trigger |
|----|--------|--------------|-----------|---------|
| FIND-20260614-008 | LLM | 2026-07-15 | **1 day** | Check LLaMA3 papers |
| FIND-20260614-005 | LLM | 2026-07-30 | **16 days** | Mechanistic interpretability updates |
| FIND-20260614-009 | Quantum | 2026-08-01 | **18 days** | Google Willow follow-ups |

---

## Recent Additions (Last 7 Days)
- FIND-20260614-001 through FIND-20260614-010 (all created this session)

---

## Search Index (By Tag)
- **#attention**: FIND-001, FIND-003, FIND-007
- **#scaling**: FIND-002, FIND-004, FIND-006
- **#architecture**: FIND-001, FIND-003
- **#mechanistic-interpretability**: FIND-004, FIND-005
- **#quantum-error-correction**: FIND-009, FIND-010
- **#oauth**: FIND-http-002
- **#database**: FIND-db-001, FIND-db-002

---

## Conflicts Requiring Resolution
- **FIND-002 vs FIND-004**: Scaling saturation timing diverges. [Investigate]
- **FIND-005 vs FIND-006**: Reasoning mechanism still unclear. [Both valid; awaiting theory]

---

## Maintenance Log
- **Last Auto-Update**: 2026-06-14 14:22:00 (cron: daily at 0600 UTC)
- **Last Human Review**: 2026-06-14 by John
- **Next Scheduled Review**: 2026-07-15 (revisit trigger for FIND-008)
```

---

## Revisit Schedule (_revisit-schedule.md)

Automated tracking of when findings need re-evaluation:

```markdown
# Research Findings Revisit Schedule

**Auto-Generated**: 2026-06-14 14:30:00 UTC  
**Next Automated Check**: 2026-06-15 06:00 UTC

---

## June 2026

### 2026-06-15 (TOMORROW)
- [Daily automated freshness check]

### 2026-06-20
- *No scheduled revisits*

---

## July 2026

### 2026-07-01
- *No scheduled revisits*

### 2026-07-15 ⚠️ URGENT
- **FIND-20260614-008** | Instruction tuning saturation (LLM)
  - Status: HYPOTHESIS
  - Trigger: Check for LLaMA3 instruction-tuning papers
  - Owner: Self
  - Link: memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-008.md

### 2026-07-30
- **FIND-20260614-005** | Reasoning vs pattern-matching (LLM)
  - Status: HYPOTHESIS
  - Trigger: Mechanistic interpretability community updates
  - Owner: Self
  - Link: memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-005.md

---

## August 2026

### 2026-08-01
- **FIND-20260614-003** | Mamba vs attention scaling (LLM)
  - Status: PRELIMINARY
  - Trigger: Conference paper submissions close; check for follow-ups
  - Link: memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-003.md

- **FIND-20260614-009** | Logical qubit overhead (Quantum)
  - Status: HYPOTHESIS
  - Trigger: Google Willow or IBM quantum updates expected
  - Link: memory/knowledgebase/research/bleeding-edge/quantum-computing/FIND-20260614-009.md

### 2026-08-15
- **FIND-20260614-004** | Memorization in benchmarks (LLM)
  - Status: PRELIMINARY
  - Trigger: New mechanistic interpretability results
  - Link: memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-004.md

---

## September 2026

### 2026-09-01
- **FIND-20260614-002** | Chinchilla laws saturation (LLM)
  - Status: PRELIMINARY
  - Trigger: OpenAI/Meta post post-training results
  - Link: memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-002.md

### 2026-09-14
- **FIND-20260614-001** | Transformers sufficient but not necessary (LLM)
  - Status: VALIDATED
  - Trigger: New architectural papers; check for counterexamples
  - Link: memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-001.md

---

## December 2026

### 2026-12-14
- **FIND-20260614-006** | In-context learning mechanism (LLM)
  - Status: VALIDATED
  - Trigger: Annual review; check for mechanistic breakthroughs
  - Link: memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-006.md

---

## Never Revisit (Canonical)

These findings are considered immutable unless standards change:
- FIND-http-001: HTTP RFC 7231 (never unless HTTP/3 breaks it)
- FIND-algo-001: Quicksort complexity (immutable mathematical fact)
- FIND-algo-002: Binary search complexity (immutable mathematical fact)

---

## How to Add a Revisit

**Via Session Memory**:
```
ctx_session(action="finding", value="[FIND-XXXX-YYY] Revisit date: 2026-08-15, Trigger: New paper on [topic]")
```

**Manual Edit**:
1. Create/update finding file with `revisit_date` and `revisit_trigger`
2. Run `npm run knowledgebase:update-revisit-schedule`
3. This manifest auto-updates

---

## Auto-Reminder Setup

**Recommended**: Set calendar reminders 1 week before each revisit date.

```bash
# Suggested cron job (runs daily at 0600 UTC)
0 6 * * * npm run knowledgebase:check-revisits

# Output alerts via ctx_session for urgent revisits (<7 days)
```

---

**Last Updated**: 2026-06-14 14:30:00 UTC  
**Maintainer**: Automated system + manual review  
**Next Auto-Run**: 2026-06-15 06:00 UTC
```

---

## Automation Scripts (Suggested)

Create these in project root as npm scripts in `package.json`:

```json
{
  "scripts": {
    "kb:index-rebuild": "node scripts/knowledgebase/rebuild-index.js",
    "kb:check-revisits": "node scripts/knowledgebase/check-revisits.js",
    "kb:validate-findings": "node scripts/knowledgebase/validate-findings.js",
    "kb:search": "node scripts/knowledgebase/search-findings.js",
    "kb:status": "node scripts/knowledgebase/status-report.js"
  }
}
```

---

## Linking Findings in Task Execution

When using research in a task:

```markdown
## Research Context (From Knowledgebase)

**Foundation Facts** (research-known):
- HTTP RFC 7231: GET requests must not have body [FIND-http-001]
- OAuth2 RFC 6749: HTTPS required for all endpoints [FIND-oauth-001]

**Frontier Hypotheses** (research-bleedingedge):
- Transformers ~sufficient but not necessary [FIND-20260614-001] (VALIDATED)
- Scaling laws plateau beyond 10T tokens [FIND-20260614-002] (PRELIMINARY)

**Revisit Triggers**:
- FIND-20260614-002: Check OpenAI post-training results by 2026-09-01

---

## Decision Record

Based on findings, we chose [X] over [Y] because:
- [Cite research finding]
- [Cite design constraint]
- [Fallback if finding invalidated: plan B]
```

---

## Cross-Session Memory Integration

When findings are validated across sessions:

```yaml
# In ctx_session memory
findings_created:
  - FIND-20260614-001 (VALIDATED)
  - FIND-20260614-002 (PRELIMINARY)

findings_revisited:
  - FIND-20260614-003: Status upgraded from HYPOTHESIS → PRELIMINARY

conflicts_found:
  - FIND-002 vs FIND-004: Escalate to human for clarification

next_revisit:
  - FIND-008: 2026-07-15 (LLaMA3 papers due)
```

---

**Version**: 1.0  
**Date**: 2026-06-14  
**Maintainer**: Automated system + manual review  
**Next Review**: 2026-07-15 (first urgent revisit trigger)
