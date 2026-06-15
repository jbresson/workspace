---
name: research-bleedingedge
description: >
  Research active frontiers (LLMs, quantum physics, advanced materials, etc.) where knowledge is rapidly evolving. 
  Every finding requires: (1) scientific reasoning chain, (2) supporting direct quote from primary source, 
  (3) persistent URL to source document. Rejects forum posts, unverified blogs, or secondary summaries without traceable primary evidence.
  High rigor, hypothesis-driven investigation, no assumptions beyond testable working hypotheses.
---

# Research: Bleeding Edge
Investigation of rapidly-evolving domains where ground truth is shifting (weeks to months).

## Core Principle
**In bleeding-edge domains, citation ≠ verification.** Forum post ≠ evidence. Conjecture ≠ finding.

Every finding must answer:
1. **Chain of Reasoning** — Why do I believe this? What logic connects evidence to conclusion?
2. **Primary Quote** — What exact text from a credible source supports this?
3. **Source URL** — Permanent link to the document. Traceable, archivable, reviewable.
4. **Source Credibility Assessment** — Is this from: academic peer review? Technical spec? Author's own research blog? Company technical report? Preprint (arXiv)? Timestamp when to revisit.

## Applicable Domains
- **AI/LLMs**: Model architectures, training techniques, emergent capabilities, inference optimization
- **Quantum Computing**: Error correction, qubit stability, gate fidelity, NISQ algorithms
- **Biotechnology**: CRISPR variants, protein folding methods, synthetic biology
- **Advanced Materials**: Graphene, perovskite, computational discovery methods
- **Climate Modeling**: New parameterizations, feedback mechanisms, prediction techniques
- **Distributed Systems**: Consensus algorithms, scaling solutions, novel architectures

## Finding Template
```
FINDING: [Declarative claim]

HYPOTHESIS:
  Working hypothesis driving the research.

REASONING:
  1. [First logical step] → 
  2. [Second step] → 
  3. [Conclusion]

EVIDENCE:
  Source: [Author/Org]
  Title: [Document Title]
  Date: [YYYY-MM-DD or "In Review"]
  URL: [Persistent URL]
  
  Quote: "[Exact excerpt supporting step N]"
           — Pg/Section reference
  
  Quote: "[Second excerpt if needed]"
           — Pg/Section reference

LIMITATIONS:
  - This finding is [preprint / in review / not yet replicated]
  - Applies only to [specific context]
  - Unknown/open: [What we can't yet verify]

REVISIT TRIGGER:
  - [Specific event that would invalidate this finding]
  - [Competing research to monitor]
  - Next check: [Date in months/years]

STATUS: [HYPOTHESIS / VALIDATED / CHALLENGED / SUPERSEDED]
```

## Rigor Gates (Non-Negotiable)
1. **No Single Source**: Finding grounded on 1 paper → Mark as HYPOTHESIS, not finding. Seek 2+ independent confirmations or trace quoted work back to original.
2. **Quote Requirement**: Paraphrase is not evidence. Include exact excerpt. If document doesn't contain quote, re-read or retract.
3. **URL Permanence**: arXiv, DOI, GitHub commits, official blog dates — acceptable. Reddit thread link → Not acceptable. Use archive.org if original dies.
4. **Reasoning Transparency**: If you can't articulate why the quote supports the claim, you don't understand it yet.
5. **Conflict Documentation**: If two sources conflict, both must be presented with credibility tags + revisit date.

## Source Hierarchy (High → Low Credibility)
| Tier | Source Type | Trustworthiness | Rigor Required |
|------|------|---|---|
| **Tier 1** | Peer-reviewed journal (Nature, Science, JMLR, arXiv w/ community commentary) | 95%+ | Quote + reasoning only |
| **Tier 2** | Author's own technical blog/preprint w/ reproducible evidence (code, data) | 80%+ | Quote + reasoning + look for independent verification |
| **Tier 2b** | Company technical report (Meta AI, DeepMind, OpenAI, Anthropic research) | 75%+ | Quote + reasoning + note corporate incentives |
| **Tier 3** | Industry benchmark/conference talk (NeurIPS, ICML presentations) | 70%+ | Quote + reasoning + verify against published paper if exists |
| **Tier 4** | Technical blog by recognized expert (not peer-reviewed) | 50%+ | Quote + reasoning + seek 2nd source before committing |
| **Tier 5** | Forum post, HN comment, Reddit, unverified blog | <30% | Do not use unless quoting the original paper they reference |

## Investigation Workflow

### Phase 1: Hypothesis Formation
1. **Pose Working Question** — "Do LLMs exhibit reasoning or pattern matching?" or "What's the current SOTA in quantum error correction?"
2. **Articulate Initial Hypothesis** — Testable prediction. E.g., "Hypothesize: LLMs use memorization for > 70% of benchmark performance."
3. **Search Strategy** — Identify: Academic papers (arXiv, Google Scholar), author blogs, company research, benchmark databases.

### Phase 2: Evidence Gathering
1. **Read Primary Sources** — Prioritize papers, not summaries.
2. **Extract Quotes** — Copy exact text supporting each sub-claim. Note page/section.
3. **Log Conflicts** — If sources disagree, note both with credibility tags.
4. **Assess Freshness** — When was this published? Is competing research more recent?

### Phase 3: Reasoning Construction
1. **Connect Dots** — How does Quote A + Quote B → Conclusion?
2. **Identify Gaps** — What assumptions bridge the quotes?
3. **Stress Test** — Can this conclusion be falsified? What would disprove it?

### Phase 4: Validation Gate
- [ ] ≥2 independent sources confirm?
- [ ] Quote exists in source document?
- [ ] URL is persistent (DOI, arXiv, GitHub, archive.org)?
- [ ] Reasoning chain articulated in plain language?
- [ ] Conflicts (if any) documented with credibility delta?
- [ ] Revisit trigger defined?

## Output Format for Findings
**In written work or session memory**, findings are tagged:
- `[HYPOTHESIS]` — Working idea, not yet cross-verified
- `[VALIDATED]` — 2+ independent sources + quotes + reasoning chain
- `[PRELIMINARY]` — 1 Tier-1 source; seeking confirmation
- `[CHALLENGED]` — Conflicting evidence; both sides logged
- `[SUPERSEDED]` — Newer research contradicts; archive with link to newer finding

## Examples

### Example 1: VALIDATED Finding
```
FINDING: Transformer attention is sufficient but not necessary for language modeling.

HYPOTHESIS:
  Working hypothesis: Attention mechanisms are overemphasized; models could achieve similar performance with simpler operations.

REASONING:
  1. Vision Transformer [quote] shows attention scales to large models.
  2. Mamba paper [quote] demonstrates RNN-style models match transformer throughput.
  3. If simpler ops match transformer perf → attention is sufficient, not necessary.

EVIDENCE:
  Source: Phuong & Hutter
  Title: "Formal Limitations on the Representation Capacity of RNNs"
  Date: 2022-10
  URL: https://arxiv.org/abs/2209.14339
  
  Quote: "RNNs and Transformers are theoretically equivalent for finite-time computation."
         — Abstract + Section 3

  Source: Gu, Goel, Dao, et al.
  Title: "Mamba: Linear-Time Sequence Modeling with Selective State Spaces"
  Date: 2023-12
  URL: https://arxiv.org/abs/2312.00752
  
  Quote: "Mamba (S6) achieves competitive perplexity on language benchmarks while maintaining linear scaling in sequence length."
         — Abstract + Table 1

LIMITATIONS:
  - Finding compares theoretical capacity, not practical training efficiency
  - "Sufficient" does not mean "optimal" for specific tasks (e.g., long-context reasoning)
  - RNNs are harder to parallelize during training; transformers win on wall-clock time

REVISIT TRIGGER:
  - New architectural paradigm outperforms both transformers + selective RNNs
  - Theoretical proof showing attention is necessary for some capability
  - Next check: Q2 2025

STATUS: VALIDATED
```

### Example 2: HYPOTHESIS (Single Source)
```
FINDING: Scaling laws break down at certain model sizes.

HYPOTHESIS:
  Working hypothesis: Beyond 10^13 parameters, data scaling follows a different curve than predicted by Chinchilla/Kaplan laws.

REASONING:
  1. Chinchilla law predicts FLOPs vs loss curve [quote].
  2. Recent LLaMA2 400B data [quote] suggests saturation.
  3. If saturation observed → laws may be architecture-dependent.

EVIDENCE:
  Source: Meta AI
  Title: "Llama 2: Open Foundation and Fine-Tuned Chat Models"
  Date: 2023-07
  URL: https://arxiv.org/abs/2307.09288
  
  Quote: "Training compute is evenly split between model and data. We train on 2T tokens."
         — Section 3, Scaling

LIMITATIONS:
  - Single source; needs independent reproduction or theory
  - Llama2 is one model family; may not generalize
  - No conflicting evidence yet; keeping HYPOTHESIS status

REVISIT TRIGGER:
  - Anthropic or OpenAI publish scaling results >300B that confirm/deny
  - Theoretical paper derives updated scaling law
  - Next check: Q1 2025

STATUS: HYPOTHESIS (Seeking confirmation from independent teams)
```

## Session Memory Tags
Use these in `ctx_session(action="finding", value="...")` calls:
```
[BLEEDING-EDGE-VALIDATED] [LLM] Transformers ~sufficient but not necessary for language modeling. 
  Mamba, RNNs match perf on long-context. [Mamba paper 2312.00752 + Phuong 2209.14339]

[BLEEDING-EDGE-HYPOTHESIS] [Quantum] Logical qubits require >1000 physical qubits for error suppression.
  Based on Google's Willow preprint. Needs independent confirmation. [arXiv:2412.04087]

[BLEEDING-EDGE-CONFLICT] [Biotech] CRISPR off-target rates: Study A says <1%, Study B (2024) says 3-5%.
  Credibility delta unclear; depends on cell type. [Link1] vs [Link2]
```

## Anti-Patterns (What NOT to Do)

❌ "I read that LLMs are all memorization"  
✅ "Hypothesis: memorization explains >50% of performance. Evidence: cite specific paper with %."

❌ "Company X says this is SOTA"  
✅ "Company X published results [quote] on benchmark Y. Note: corporate incentive for favorable reporting."

❌ "This blog post summarizes the paper"  
✅ "Read the paper directly. If blog post adds insight, trace back to original claim."

❌ "Two sources agree so it's true"  
✅ "Two sources agree [+ quote + reasoning]. Still marked PRELIMINARY until Tier-1 peer review publishes."

❌ "The latest preprint on arXiv"  
✅ "arXiv preprint [link], not yet peer-reviewed. Status: HYPOTHESIS. Revisit when review completes."

## Integration with Task Execution
For multi-phase investigation (research project, literature review):
- **Phase 0**: Crystallization — Define research question + success criteria (what counts as "answer"?)
- **Phase 1**: Hypothesis formation + source strategy
- **Phase 2**: Evidence gathering + quote extraction (use brave-search skill to accelerate)
- **Phase 3**: Reasoning chain construction + conflict resolution
- **Phase 4**: Convergence proof (all ACs met with findings in VALIDATED or PRELIMINARY status)
- **Phase 5**: Consolidate findings to knowledge base (memory/knowledgebase/research/)
- **Phase 6**: Retrospective (what did we learn about the domain evolution?)

## Tools & Extensions
- **brave-search** — Find papers, preprints, author blogs with freshness filters
- **browser-tools** — Access paywalled papers (if institutional access), arxiv.org, github.com
- **ctx_semantic_search** — Search local knowledge base for related findings (is this hypothesis tested before?)

## Cross-Domain Rules
**AI/LLMs**: Weight recent papers (last 12mo) heavily. Preprints count as "in review" until published.  
**Quantum**: Weight experimental results (IBM, Google, IonQ) over theory papers.  
**Materials**: Weight peer-reviewed journal > company press releases.

---

**Revision**: 2026-06-14  
**Author**: Research Skill Definition  
**Next Review Trigger**: New domains added, or tier system contradicted by field practice
