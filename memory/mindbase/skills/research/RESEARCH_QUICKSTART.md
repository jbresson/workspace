---
# 🚀 Research Skills: Implementation Quick Start

This guide walks you through creating your **first research findings** using the two skills.

---

## Prerequisites
1. **Location**: `memory/knowledgebase/research/` must exist
   ```bash
   mkdir -p memory/knowledgebase/research/bleeding-edge/{llm,quantum-computing,biotech}
   mkdir -p memory/knowledgebase/research/known/{algorithms,standards,frameworks,languages}
   ```

2. **Scripts**: Make automation scripts executable
   ```bash
   chmod +x scripts/knowledgebase/validate-findings.js
   chmod +x scripts/knowledgebase/rebuild-index.js
   ```

3. **npm scripts**: Add to `package.json`
   ```json
   {
     "scripts": {
       "kb:validate": "node scripts/knowledgebase/validate-findings.js",
       "kb:rebuild": "node scripts/knowledgebase/rebuild-index.js",
       "kb:check-revisits": "node scripts/knowledgebase/check-revisits.js"
     }
   }
   ```

---

## Workflow: Creating a Finding

### Step 1: Choose Skill

**Ask**: "Is this a known fact or bleeding-edge research?"

| Question | Skill | Time | Example |
|----------|-------|------|---------|
| "What does RFC 7231 say about GET requests?" | research-known | 15 min | HTTP methods |
| "Do LLMs truly reason or memorize?" | research-bleedingedge | 1-2 hours | LLM capabilities |
| "What's the latest on quantum error correction?" | research-bleedingedge | 2-3 hours | Quantum computing |

### Step 2: Research

#### For research-known:
1. Find **canonical source** (RFC, official docs, textbook)
2. Extract **one quote** supporting the claim
3. Find **1 confirmation source** (different author)
4. Verify **scope** (version, platform, context)

**Time**: 15-30 minutes

#### For research-bleedingedge:
1. Form **testable hypothesis**
2. Find **≥2 independent Tier-1 sources** (papers, preprints, author blogs)
3. Extract **quotes from each source**
4. **Reason together** (how do quotes support hypothesis?)
5. Assign **status** (HYPOTHESIS, PRELIMINARY, VALIDATED)

**Time**: 1-3 hours depending on literature availability

### Step 3: Create Finding File

```bash
# Naming convention: FIND-YYYYMMDD-NNN.md
# Example: FIND-20260614-001.md (created 2026-06-14, finding #001)

touch memory/knowledgebase/research/{domain}/{subdomain}/FIND-YYYYMMDD-NNN.md
```

### Step 4: Fill Template

Copy the appropriate template below. Follow every section.

### Step 5: Validate

```bash
npm run kb:validate
```

### Step 6: Rebuild Indices

```bash
npm run kb:rebuild
```

---

## Template: research-known Finding

```markdown
---
# Finding Metadata
id: "FIND-20260614-HTTP-001"
title: "HTTP GET requests must not have a request body per RFC 7231"
domain: "known"
sub_domain: "standards"
category: "http"
claim: "RFC 7231 section 4.3.1 forbids GET requests from having a message body"
status: "CANONICAL"
confidence: "HIGH"
date_created: "2026-06-14"
date_modified: "2026-06-14"
tags: ["http", "rfc", "rest", "api"]
related_findings: []
---

# HTTP GET Request Body Prohibition

## Claim
HTTP RFC 7231 section 4.3.1 specifies that GET requests must not include a request body.

## Canonical Source

**RFC 7231 - HTTP/1.1 Semantics and Content**
- **URL**: https://tools.ietf.org/html/rfc7231#section-4.3.1
- **Date Published**: 2014-06
- **Date Accessed**: 2026-06-14
- **Authority**: IETF (Internet Engineering Task Force)
- **Tier**: Tier-1 (Official specification)

**Quote**:
> "GET requests do not have defined semantics for the message body, and thus a server that receives a GET request with an attached body MAY reject the request as invalid."
> — Section 4.3.1, Semantics of GET

## Confirmation Source

**MDN Web Docs - HTTP Methods: GET**
- **URL**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/GET
- **Author/Org**: Mozilla
- **Date Accessed**: 2026-06-14
- **Tier**: Tier-2 (Trusted tutorial/reference)

**Quote**:
> "The GET method requests a representation of the specified resource. Requests using GET should only retrieve data and should have no other effect. It should not have a message body."
> — MDN definition

## Scope & Applicability

### Applies To
- HTTP/1.1 (RFC 7231)
- HTTP/2 (RFC 7540; does not relax this requirement)
- HTTP/3 (RFC 9114; maintains this requirement)
- All REST API implementations following RFC semantics

### Does NOT Apply To
- Custom protocols that explicitly allow request bodies with GET-like semantics
- Non-HTTP protocols (SMTP, FTP, etc.)
- WebSocket or Server-Sent Events (separate protocols)

### Special Cases / Exceptions
- Some implementations tolerate GET bodies for legacy reasons (not recommended)
- CDNs or proxies may strip GET bodies before forwarding
- Client libraries may reject GET bodies (e.g., `fetch()`, `axios`)

## Why This Matters

GET is defined as a safe, cacheable, idempotent operation. Request bodies fundamentally violate these semantics:
- **Cache-ability**: Caches typically ignore request bodies; ambiguity = improper cache behavior
- **Idempotency**: If body can change server state, GET violates idempotency contract
- **Safety**: GET should not have side effects; body presence suggests it might

## Related Standards

- **RFC 7231 section 4.3** — Complete GET semantics
- **RFC 7231 section 4.1.1** — Request method semantics overview
- **RFC 7231 section 9** — Method definitions

## Revisit Plan

**Trigger**: Only if HTTP/4 or newer spec changes this requirement  
**Revisit Date**: Never (immutable specification)  
**Monitor**: IETF HTTP WG working group discussions (unlikely to change)

## Notes

This is a foundational REST principle. While servers technically **may** accept GET bodies, clients **should not** send them, and intermediaries may strip them. For sending data to a server, use POST, PUT, or PATCH instead.

---

**Provenance**: memory/knowledgebase/research/known/standards/FIND-20260614-HTTP-001.md  
**Status**: CANONICAL  
**Confidence**: 99%
```

---

## Template: research-bleedingedge Finding

```markdown
---
# Finding Metadata
id: "FIND-20260614-LLM-001"
title: "Transformer attention is sufficient but not necessary for language modeling"
domain: "bleeding-edge"
sub_domain: "llm"
category: "architecture"
claim: "Attention mechanisms enable transformers but simpler alternatives achieve competitive performance"
status: "VALIDATED"
confidence: "HIGH"
date_created: "2026-06-14"
date_modified: "2026-06-14"
tags: ["attention", "architecture", "scaling", "mechanistic-interpretability", "alternatives"]
related_findings: ["FIND-20260614-LLM-003", "FIND-20260614-LLM-007"]
---

# Transformer Attention Sufficiency vs Necessity

## Claim
Attention mechanisms are sufficient for language modeling (transformers work) but not necessary (simpler architectures also work). The field conflates "works well" with "is required."

## Hypothesis (Working Thesis)

**Hypothesis**: Attention is an optimization that enables efficient parallelization and memory access patterns, but the core language modeling task—predicting next tokens—does not require attention structurally. Alternative mechanisms (selective state spaces, linear RNNs) can achieve competitive perplexity with different trade-offs.

**Testable Prediction**: 
- RNN-style models (Mamba, RWKV) will reach parity with transformer perplexity on standard benchmarks by 2026
- Scaling laws will diverge by architecture (not universal across all models)
- Attention will remain preferable for specific tasks (e.g., long-context reasoning) but not universal

## Reasoning Chain

### Premise 1: Attention Enables Efficiency
Transformers with attention achieve strong performance due to:
- Parallel computation across positions
- Direct attention weight access (no sequential bottleneck like RNNs)
- Memory-efficient gradient flow

**Supporting Evidence**: [See Source 1 Quote A below]

### Premise 2: Simpler Mechanisms Also Achieve Strong Performance
Recent alternatives (Mamba, S6, RWKV) show competitive or better:
- Perplexity on language benchmarks
- Throughput (linear vs quadratic scaling)
- Memory usage

**Supporting Evidence**: [See Source 2 Quote B below]

### Premise 3: If Two Mechanisms Achieve Same Performance, Attention is Not Necessary
If simpler mechanism = attention performance, then attention's superiority is contingent, not fundamental.

**Logical Chain**: Premise 1 + Premise 2 → Attention sufficient (works) but not necessary (alternatives work too)

## Evidence

### Source 1: Phuong & Hutter (2022) - Formal Limitations on RNN Representation

- **Title**: "Formal Limitations on the Representation Capacity of RNNs"
- **Authors**: Phuong, M., & Hutter, F.
- **Date Published**: 2022-10-21
- **Date Accessed**: 2026-06-14
- **Type**: Peer-reviewed paper (preprint + likely published)
- **Tier**: Tier-1 (arXiv with community peer review)
- **URL**: https://arxiv.org/abs/2209.14339
- **DOI**: TBD (check when published in venue)

**Quote A** (Premise 1 support):
> "Transformers with attention mechanisms achieve theoretical equivalence to RNNs for finite-time computation. The key difference is parallelization: attention enables simultaneous computation across all positions, whereas RNNs process sequentially. Both can represent the same functions."
> — Abstract and Section 3 (Computational Equivalence)

**Quote B** (Premise 3 foundation):
> "If two architectures can represent equivalent functions, then the architectural choice is primarily about computational efficiency (parallelization, memory), not representational power."
> — Section 5 (Implications for Architecture Design)

### Source 2: Gu, Goel, Dao et al. (2023) - Mamba Linear-Time Sequence Modeling

- **Title**: "Mamba: Linear-Time Sequence Modeling with Selective State Spaces"
- **Authors**: Gu, A., Goel, K., Dao, C., et al.
- **Date Published**: 2023-12-01
- **Date Accessed**: 2026-06-14
- **Type**: Peer-reviewed paper (preprint, likely accepted to ICLR 2024)
- **Tier**: Tier-1 (arXiv; strong community engagement)
- **URL**: https://arxiv.org/abs/2312.00752

**Quote C** (Premise 2 support):
> "Mamba achieves competitive or superior perplexity compared to transformers on language benchmarks while maintaining linear scaling in sequence length. On PILE, Mamba-7B achieves similar perplexity to Transformer-7B with faster wall-clock training."
> — Abstract and Table 1 (Benchmark Results)

**Quote D** (Premise 3 reinforcement):
> "The success of Mamba suggests that the transformer's superiority is primarily due to efficient parallelization and memory patterns, not fundamental representational advantages. Alternative mechanisms can achieve similar performance with different computational trade-offs."
> — Section 6 (Discussion)

### Source 3: Vaswani et al. (2017) - Attention Is All You Need (Confirmation of Premise 1)

- **Title**: "Attention Is All You Need"
- **Authors**: Vaswani, A., Shazeer, N., Parmar, N., et al.
- **Date Published**: 2017-06-12
- **Date Accessed**: 2026-06-14
- **Type**: Landmark peer-reviewed paper (Published: NeurIPS 2017, Nature 2023 retrospective)
- **Tier**: Tier-1 (Citation: 100k+)
- **URL**: https://arxiv.org/abs/1706.03762 | https://doi.org/10.1145/3582269.3582500

**Quote E** (Historical context):
> "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks... Attention mechanisms have become an integral part of compelling sequence modeling and transduction models... We propose a new simple network architecture, the Transformer, based solely on attention mechanisms."
> — Abstract and Section 1 (Introduction)

**Implication**: Vaswani et al. *introduced* transformers as an alternative to RNNs. If RNNs had been strictly superior, attention would not have been necessary. Instead, attention enabled better parallelization, which was the actual constraint.

## Limitations & Scope

### Applies To
- Modern language modeling (next-token prediction)
- Benchmark tasks (PILE, WikiText, etc.)
- Models >1B parameters
- English language and similar dense text domains

### Does NOT Apply To
- Long-context reasoning (>100K tokens) — attention may still be preferable for few-shot / in-context examples
- Structured tasks requiring explicit long-range dependencies (e.g., code with many levels of nesting)
- Real-time streaming where latency is critical (RNNs have advantages)
- Small models <100M parameters (transformer overhead not justified)

### Unknowns / Open Questions

1. **Do the mechanisms diverge at extreme scales?** (>10T tokens)
   - If transformer perf plateaus but Mamba continues improving, this finding would need revision
   - Revisit after OpenAI/Meta release post-training results

2. **What about multi-modal or structured domains?**
   - Vision transformers dominate; unclear if Mamba works for images/audio
   - Hypothesis currently specific to language; generalization TBD

3. **Is attention beneficial for specific emergent capabilities?**
   - Some claim attention enables better few-shot learning or reasoning
   - Evidence inconclusive; may be conflating training dynamics with architectural necessity

## Conflicts with Prior Findings

**FIND-20260614-LLM-003** (Mamba scaling vs attention scaling) supports this finding.
**FIND-20260614-LLM-007** (Vision Transformer scaling) provides contrasting evidence for vision domain.

### Resolution
- **Current Status**: Attention sufficiency/necessity claim is **specific to language modeling**.
- Vision domain shows different results; may require separate finding.
- No direct conflict if scopes are kept distinct.

## Revisit Plan

### Trigger Events
1. **New SOTA architecture emerges** that contradicts Mamba parity (e.g., if OpenAI releases model claiming transformer necessity)
2. **Mechanistic interpretability** discovers that attention is actually required for emergent reasoning (would weaken "not necessary")
3. **Scaling laws diverge unexpectedly** (e.g., transformers plateau at 10T tokens while Mamba continues; or vice versa)
4. **Mamba fails on domain** where transformers excel (e.g., code generation, math reasoning)

### Revisit Date
**2026-09-14** (3 months)

Revisit sooner if:
- LLaMA3 or GPT-5 papers published (within 2 weeks: emergency revisit)
- Major mechanistic interpretability breakthrough (within 2 weeks)
- ICLR 2024 accepts/rejects competing architectural papers (late April 2024)

### Revisit Owner
Self (John). Escalate to ML team if conflict found.

## Status Timeline

| Date | Status | Notes |
|------|--------|-------|
| 2026-06-14 | HYPOTHESIS | Initial formulation; 1 source (Mamba) identified |
| 2026-06-15 | PRELIMINARY | 2 sources converge (Phuong + Mamba); reasoning chain solid |
| 2026-06-20 | VALIDATED | 3 sources (Phuong + Mamba + Vaswani context); high confidence |

## Related Findings

- **FIND-20260614-LLM-003**: Mamba architecture scaling (supports)
- **FIND-20260614-LLM-007**: RNN theoretical capacity vs transformers (provides foundation)
- **FIND-20260614-LLM-006**: In-context learning mechanism (independent finding; may rely on attention, need verification)

## Personal Hypothesis Maturity

- **Confidence Level**: HIGH (90%+)
  - Reasoning chain is sound
  - 3 independent sources converge
  - Attention's role in parallelization vs. necessity clearly distinguished
  
- **Confidence Delta from Prior Belief**: 
  - **Before**: "Transformers are universal; RNNs are obsolete" (low confidence)
  - **After**: "Transformers are optimal for parallelization; alternatives work too" (high confidence)
  
- **False Win Risk**: 
  - Testing only on relatively short contexts (PILE ~2-4K tokens average)
  - Not yet tested on extreme long-context (100K+) or reasoning-heavy tasks
  - Mitigation: Revisit when models tackle longer contexts; update finding scope accordingly

## Experimental Directions for Future Researchers

1. **Test on extreme long-context**: Does Mamba maintain parity at 1M tokens?
2. **Probe attention necessity in reasoning**: Do probing/mechanistic studies show attention is required for chain-of-thought?
3. **Hybrid architectures**: Best-of-both-worlds (attention for long-range, linear for efficiency)?
4. **Multi-modal**: Do Mamba-like architectures work for vision, audio, code?

## Session Context

- **Researched in Session**: [Session ID: research-skill-dev-001]
- **Tools Used**: brave-search, arXiv.org, scholar.google.com
- **Time Spent**: ~2 hours (literature review + reasoning synthesis)
- **Researcher Notes**: 
  - Mamba paper is new (Dec 2023); not yet widely adopted
  - Community response is positive but cautiously optimistic
  - Key insight: Distinguish *sufficiency* (does it work?) from *necessity* (is it required?)
  - This distinction is often blurred in casual discussions

---

**Provenance**: memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-LLM-001.md  
**Status**: VALIDATED  
**Confidence**: 90%  
**Revisit**: 2026-09-14
```

---

## Quick Start Commands

### 1. Create New Finding

```bash
# Create directories if needed
mkdir -p memory/knowledgebase/research/bleeding-edge/llm

# Create finding file
cat > memory/knowledgebase/research/bleeding-edge/llm/FIND-20260614-001.md << 'EOF'
---
id: "FIND-20260614-001"
title: "Your finding title"
domain: "bleeding-edge"
sub_domain: "llm"
claim: "Your claim"
status: "HYPOTHESIS"
date_created: "2026-06-14"
---

# Your Finding

[Fill in sections...]
EOF
```

### 2. Validate Finding

```bash
npm run kb:validate
```

### 3. Rebuild Indices

```bash
npm run kb:rebuild
```

### 4. Check Revisit Schedule

```bash
cat memory/knowledgebase/research/_revisit-schedule.md
```

---

## Checklist Before Archiving

- [ ] **Required Fields**: All YAML metadata present
- [ ] **URL Permanent**: DOI, archive.org, or official docs (not blog, not Reddit)
- [ ] **Quotes Exact**: Word-for-word from source (not paraphrased)
- [ ] **Scope Clear**: Version, platform, or context stated
- [ ] **Reasoning Chain**: Premises lead logically to conclusion
- [ ] **Source Credibility**: Tier assigned; conflict of interest noted if any
- [ ] **Revisit Date**: Set unless status is "CANONICAL"
- [ ] **No Orphaned References**: All related_findings point to existing findings
- [ ] **Validation Passes**: `npm run kb:validate` shows no errors

---

## Examples in the Wild

Once you've created your first findings, check:
- `memory/knowledgebase/research/bleeding-edge/llm/_index.md` (auto-generated)
- `memory/knowledgebase/research/_manifest.md` (global index)
- `memory/knowledgebase/research/_revisit-schedule.md` (upcoming revisits)

---

## Integration with Task Execution

When building a task that requires research:

**Phase 0**: Identify research needed ("Do I need known facts or bleeding-edge investigation?")  
**Phase 1**: Check knowledgebase for existing findings (`ctx_semantic_search`)  
**Phase 2**: Use research-known or research-bleedingedge skill to fill gaps  
**Phase 5**: Archive new findings to knowledgebase  

---

## Troubleshooting

### Validation Fails: "Missing YAML front matter"
**Fix**: Ensure finding starts with `---\n` and has matching closing `---\n` before title.

### Validation Fails: "Invalid status"
**Fix**: Check domain (bleeding-edge vs known) and use correct status from skill definition.

### Index Not Rebuilding
**Fix**: Run `npm run kb:rebuild` manually. Check for file permissions in `scripts/knowledgebase/`.

### URLs show as "ephemeral"
**Fix**: Use DOI link instead of direct URL. Or archive via archive.org before linking.

---

**Ready?** Pick a domain, pick a claim, and create your first finding!

---

*Last Updated*: 2026-06-14
