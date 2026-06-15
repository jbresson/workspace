---
# Research Skills: Unified Framework
*Comparative Analysis + Joint Requirements*

## Skill Differentiation Matrix

| Dimension | research-bleedingedge | research-known | 
|-----------|-------------|--------|
| **Domain Type** | Rapidly evolving (LLMs, quantum, biotech, materials) | Well-established, canonical (algorithms, APIs, physics, standards) |
| **Truth Lifecycle** | Weeks-months | Stable; decades or more |
| **Primary Artifact** | Hypothesis + Evidence chain + Reasoning | Fact + Reference links |
| **Reasoning Requirement** | **MANDATORY** ("Why do I believe this?") | Optional ("It's documented") |
| **Personal Hypotheses** | **Central** (testable working ideas) | **Not Applicable** (canonical logic already established) |
| **Minimum Sources** | 2 independent Tier-1+ for VALIDATED; 1 for HYPOTHESIS | 1 canonical + 1 confirmation |
| **Quote Necessity** | **Mandatory + exact** (proves understanding) | Recommended but not enforced if official spec is trivial |
| **Revisit Trigger** | Built-in (when competing research emerges) | Only if fact changes (e.g., API deprecated) |
| **Validation Gate** | High friction; reasoning chain must be watertight | Lower friction; official source suffices |
| **Token Efficiency** | Higher cost (research, reasoning, cross-referencing) | Lower cost (lookup + confirmation) |
| **Anti-Pattern Risk** | Citation without understanding; forum-post authority | Outdated reference; wrong version specificity |

---

## Joint Requirements (BOTH Skills)

### 1. **URL Permanence Mandate**
**Rule**: Every link must be archivable and retrievable ≥2 years from now.
- ✅ arXiv (persistent, DOI), GitHub commits, RFC (stable URLs), DOI links
- ✅ archive.org snapshots (if original dies)
- ✅ Official documentation dated/versioned (python.org/3.11/, react.dev/reference/)
- ❌ Unversioned blog links (disappear, change)
- ❌ Reddit, Twitter links (ephemeral)
- ❌ Paywalled articles without DOI or archive.org backup

**Implementation**: When saving findings to `memory/knowledgebase/research/`, include:
```markdown
## Finding: [Name]
**Canonical Source**: [Title]  
**URL**: [Permanent link] | [archive.org backup if applicable]  
**Accessed**: [YYYY-MM-DD]  
**Revisit**: [YYYY-MM-DD or "Never" for immutable facts]
```

---

### 2. **Trustworthiness Assessment**
**Rule**: Before citing, categorize source credibility.

**Credibility Checklist** (applies to both skills):
- [ ] Author/org identifiable? (Name, affiliation, contact)
- [ ] Conflict of interest disclosed or evident? (e.g., company marketing paper)
- [ ] Methodology transparent? (How was claim derived/tested?)
- [ ] Peer review or editorial oversight? (Journal, publisher, standards org)
- [ ] Reproducible? (Code, data, full derivation provided?)
- [ ] Date of publication & last update?
- [ ] Is this the original source or a secondary summary?

**Tier Assignment Decision**:
- Tier-1 (Canonical): Official spec, peer-reviewed journal, RFC, framework docs
- Tier-2 (Trusted): Author's own blog with reproducible evidence, company research reports
- Tier-3 (Secondary): Established textbooks, tutorials, expert blogs
- Tier-4+ (Tertiary): StackOverflow, Medium blogs, tutorials without author credibility

**Note for `research-known`**: Most findings will be Tier-1/2 by definition.  
**Note for `research-bleedingedge`**: Tier-1 is preferred; Tier-2 acceptable if reproducible.

---

### 3. **Conflict Resolution Protocol**
**Rule**: If two sources disagree, both claims must be preserved with conflict tags.

**Workflow**:
1. **Log Both Claims** — Don't suppress minority evidence.
2. **Credibility Delta** — Which source has higher tier? Why?
3. **Context Analysis** — Do they apply to different scopes? (e.g., different model sizes, versions, hardware)
4. **Revisit Trigger** — When will we know which is correct?

**Session Memory Tag**:
```
[CONFLICT] [Domain] Claim A: [Source A, Tier X]. 
Claim B: [Source B, Tier Y]. Delta: A favored because [reason].
Revisit: [trigger + date]
```

**Example**:
```
[CONFLICT] [LLM] Scaling laws plateau at 10T tokens (Meta paper 2023, Tier 2b).
vs. Continue to 100T+ tokens (OpenAI internal, Tier 2b, not public).
Delta: Meta paper is public + peer commentary; OpenAI is anecdotal.
Status: Treat as COMPETING HYPOTHESES. Revisit Q2 2025 when next major model papers published.
```

---

### 4. **Scope & Version Specificity**
**Rule**: ALWAYS state scope. Vague facts are not findings.

**Format**:
```
FINDING: [Claim in specific context]

SCOPE:
  Applies to: [Specific version, domain, hardware, etc.]
  Does NOT apply to: [Common false extensions]
  Special cases: [Context-dependent behavior]
```

**Examples**:
```
✅ "Python 3.8+ `async/await` requires explicit await for coroutine execution."
❌ "Async is async."

✅ "React 18 batches state updates by default; React 16 does not."
❌ "React batches state updates."

✅ "PostgreSQL 12+ VACUUM (without FULL) can run concurrently; earlier versions cannot."
❌ "VACUUM can run concurrently."

✅ "OAuth 2.0 (RFC 6749) requires HTTPS for authorization endpoint; localhost:8080 is exempt during development (RFC 8252 Section 8.5)."
❌ "OAuth2 requires HTTPS."
```

---

### 5. **Anti-Forum-Post Rule**
**Rule**: A single forum post, Reddit thread, or unvetted blog post is NEVER sufficient evidence.

**What this means**:
- If a Reddit user quotes a paper, trace to the original paper. Use the paper, not the Reddit summary.
- If a HN discussion links to a blog post, read the blog. If the blog cites a paper, read the paper.
- If a Stack Overflow answer has citations, verify those citations independently.

**Consequence**: If only a forum post exists (no traceable primary), mark finding as **UNVERIFIED** and escalate.

---

### 6. **Reasoning Chain (Transparency Requirement)**
**Rule**: For both skills, be able to articulate "Why do I believe this?"

**Minimal Chain** (research-known):
```
FINDING: HTTP GET must not have request body.

REASONING:
  1. RFC 7231 section 4.3.1 specifies this.
  2. MDN reiterates RFC without deviation.
  3. Therefore: RFC + independent confirmation = canonical.
```

**Complex Chain** (research-bleedingedge):
```
FINDING: Transformers are sufficient but not necessary for LLMs.

REASONING:
  1. Attention mechanism [quote A] can represent arbitrary mappings.
  2. Mamba model [quote B] achieves similar perplexity with linear complexity.
  3. If linear complexity matches attention perplexity → simpler ops work.
  4. Therefore: Attention is sufficient (works), but not necessary (alternatives exist).

CAVEATS:
  - Sufficient ≠ optimal for all tasks
  - Not necessary ≠ never use it
  - Window closed if new benchmark favors attention
```

**Anti-Pattern**:
```
❌ REASONING: "Everyone says so."
❌ REASONING: "I believe it's true."
❌ REASONING: "Logically, it must be."

✅ REASONING: (Quote chain showing how A + B → conclusion)
```

---

### 7. **Metadata & Archival**
**Rule**: Every finding saved to memory must include lifecycle metadata.

**Required Metadata** (applies to both):
```yaml
finding_id: "FIND-YYYYMMDD-NN"  # Unique identifier for this finding
claim: "[Succinct statement]"
domain: "[research-bleedingedge | research-known]"
sub_domain: "[LLM | Quantum | HTTP | OAuth | ...]"
tier: "[Tier-1 | Tier-2 | ...]"  # Credibility
status: "[HYPOTHESIS | VALIDATED | CANONICAL | DEPRECATED | CONFLICTED]"
confidence: "[HIGH | MEDIUM | LOW]"  # Your confidence; not source credibility
sources:
  - url: "[permanent link]"
    title: "[Source Title]"
    date_published: "[YYYY-MM-DD]"
    date_accessed: "[YYYY-MM-DD]"
    author: "[Author/Org]"
    tier: "[Tier-1 | Tier-2 | ...]"
    quote: "[Exact excerpt supporting claim]"
    quote_ref: "[page / section / timestamp]"
revisit_trigger: "[Event/date that invalidates or updates this]"
revisit_date: "[YYYY-MM-DD or 'Never']"
conflicts:
  - competing_claim: "[Alternative claim]"
    source: "[URL]"
    delta: "[Why we favor our claim]"
related_findings:
  - "[FIND-YYYYMMDD-MM]"  # Link to related findings
created_session: "[Session ID if applicable]"
```

**Archival Location**: `memory/knowledgebase/research/[domain]/[sub_domain]/FIND-YYYYMMDD-NN.md`

---

### 8. **Revisit Cadence**
**Rule**: Every finding includes a revisit date.

**For research-bleedingedge**:
- HYPOTHESIS: Revisit every 3-6 months (rapid change)
- PRELIMINARY: Revisit when peer review completes
- VALIDATED: Revisit annually or when competing work emerges
- SUPERSEDED: Archive; link to newer finding

**For research-known**:
- CANONICAL: Revisit only if API/spec changes (rare) or fact proven wrong
- DEPRECATED: Immediately note when replacement published
- SCOPE-LIMITED: Revisit when scope changes (e.g., new Python version)

**Implementation**: Use `ctx_session(action="task", ...)` to create auto-reminders:
```
Revisit {finding_id} on {revisit_date}: {trigger_reason}
```

---

## When to Use Each Skill

### Use research-bleedingedge When:
- Question involves emerging/rapidly-changing field
- No canonical answer exists yet
- Working with preprints, early-stage company research, or latest benchmarks
- Personal hypothesis testing is the goal (e.g., "Does this architecture generalize?")
- Multiple competing theories exist; you're mapping the landscape

**Examples**:
- "What's the latest on efficient LLM inference?" → bleeding-edge
- "How do quantum error correction codes compare in 2025?" → bleeding-edge
- "Do LLMs truly reason or just pattern-match?" → bleeding-edge (testable hypothesis)

### Use research-known When:
- Question has a canonical/official answer
- Seeking to verify a well-established fact
- Need to confirm behavior of stable API/framework/algorithm
- No active research frontier exists; field is settled
- Speed is priority (lookup, not investigation)

**Examples**:
- "What does HTTP RFC 7231 say about GET request bodies?" → known
- "How does quicksort's worst-case complexity work?" → known
- "What's the PostgreSQL VACUUM syntax?" → known
- "What does SOLID principles mean?" → known

### Hybrid Approach:
```
Q: "Is distributed consensus solved?"
A (Part 1 - known): Raft, Paxos algorithms are canonical [research-known].
A (Part 2 - bleeding-edge): Emerging BFT variants for high-throughput chains [research-bleedingedge].
Combine findings: Consensus is "solved" classically; new research optimizes for blockchain.
```

---

## Pitfalls & How to Avoid Them

| Pitfall | Symptom | Prevention |
|---------|---------|-----------|
| Citation Illusion | "I found a paper; I understand it" | Quote the paper. If you can't find exact quote, you don't understand. |
| Version Blindness | Claim applied to old version; reader uses new version | Always state version/scope. Grandfather deprecated findings. |
| Single-Source Trap | "One Tier-1 source is enough" (research-bleedingedge) | Enforce minimum 2 sources for VALIDATED status. 1 source = HYPOTHESIS. |
| Link Rot | URL valid today; dead in 6 months | Use DOI, archive.org, official docs with version numbers. Test links annually. |
| Forum Post Authority | "HN discussion upvoted X times means it's true" | Trace to primary source. HN is conversation, not evidence. |
| Scope Creep | "OAuth2 requires HTTPS" (missing exception for localhost) | List applies-to + does-NOT-apply-to for every finding. |
| Revisit Neglect | Finding marked HYPOTHESIS; never revisited | Automated reminders. Set revisit date on creation. |
| Credibility Conflation | "I trust this author; I trust this claim" | Assess each claim independently. Author credibility ≠ claim credibility. |

---

## Session Memory Integration
When documenting research findings in cross-session memory:

```
[FINDING-RESEARCH-BLEEDINGEDGE] [LLM] [VALIDATED]
Claim: Transformers ~sufficient but not necessary.
Sources: Mamba 2312.00752 + Phuong 2209.14339
Revisit: Q2 2025 when new SOTA benchmarks published.
Link: {Memtable stored at FIND-20260614-001}

[FINDING-RESEARCH-KNOWN] [HTTP] [CANONICAL]
Claim: RFC 7231 s4.3.1 forbids GET request body.
Sources: RFC 7231 + MDN
Revisit: Never (unless HTTP/3 changes this)
Link: {Memtable stored at FIND-20260614-002}
```

---

## Tooling & Workflow Integration

### Phase 0: Skill Selection
```
Q: "Is this a known or bleeding-edge question?"
  → Known facts → research-known
  → Emerging domain → research-bleedingedge
```

### Phase 1: Research Strategy
```
research-known:
  1. Identify canonical source (RFC, official docs, textbook)
  2. Confirm with 1 independent source
  3. Extract and verify quote
  4. Archive to memory

research-bleedingedge:
  1. Form testable hypothesis
  2. Search for primary sources (papers, author blogs, preprints)
  3. Extract and compare quotes across sources
  4. Build reasoning chain
  5. Mark status (HYPOTHESIS, PRELIMINARY, VALIDATED)
  6. Set revisit trigger
  7. Archive to memory
```

### Phase 2: Tool Selection
- **brave-search**: Find papers (arXiv, scholar.google), official docs (with site: filters)
- **browser-tools**: Access paywalled content, extract text from PDFs
- **ctx_semantic_search**: Query existing findings (have we researched this before?)
- **ctx_session**: Store findings + revisit triggers

### Phase 3: Validation
- **Checklist**: Run through rigor gates (URLs, sources, scope, reasoning)
- **Conflict Check**: Is this consistent with prior findings in memory?
- **Peer Review**: Could another researcher reproduce this finding?

---

## Examples: Full Workflow

### Example 1: research-known (Fast Path)
```
Q: "Does React 18 batch state updates by default?"

Strategy:
  1. Official source: react.dev/reference/react (React 18 docs)
  2. Quote: "React 18 enables Automatic Batching for all updates."
  3. Confirm: React blog post (https://react.dev/blog/2022/03/29/react-v18/)
  4. Status: CANONICAL

Time: ~5 minutes
Archive:
  - FIND-20260614-003.md
  - Status: CANONICAL
  - Revisit: Never (unless React 19 changes batching)
```

### Example 2: research-bleedingedge (Investigation Path)
```
Q: "Do LLMs truly reason or just memorize?"

Hypothesis: "Memorization explains >50% of benchmark performance; reasoning < 50%."

Strategy:
  1. Search arXiv for: "memorization LLM benchmark"
  2. Find: Kandpal et al. 2023 "Dedup" study (arXiv:2310.06995)
     Quote: "Models trained on dedup data lose X% accuracy on benchmarks"
  3. Find: Tirumala et al. "Memorization Patterns in Transfer Learning" 
     Quote: "Mechanistic analysis shows [specific mechanism]"
  4. Build reasoning: Quote A (data dedup loss) + Quote B (mechanism) → hypothesis strength

Status Options:
  - If sources agree: PRELIMINARY (2 papers found, not yet replicated)
  - If they conflict: Mark both with credibility delta
  - If 3+ independent sources agree: VALIDATED

Time: ~1-2 hours (deep reading)
Archive:
  - FIND-20260614-004.md
  - Status: PRELIMINARY (seeking 3rd independent confirmation)
  - Revisit: Q3 2025 (when new mechanistic interpretability papers emerge)
```

---

## Continuous Improvement
These skill definitions are themselves subject to revision:

**Triggers for Skill Update**:
- New domain emerges (e.g., neuromorphic computing)
- Tier system contradicted by practice (e.g., better sources discovered)
- Researchers report findings outside current template
- Tools become available that change feasibility

**Review Cycle**: Quarterly (every 3 months) or when contradiction found.

---

**Author**: Skill Definition System  
**Version**: 1.0  
**Date**: 2026-06-14  
**Next Review**: 2026-09-14
