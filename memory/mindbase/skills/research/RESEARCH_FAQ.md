# Research Skills: FAQ & Troubleshooting

---

## Skill Selection FAQs

### Q: "Is machine learning a 'known' or 'bleeding-edge' domain?"
**A**: Depends on specificity.
- **Known**: "What is gradient descent?" → research-known (canonical algorithm since 1986)
- **Bleeding-Edge**: "Do modern LLMs truly reason or memorize?" → research-bleedingedge (active research frontier)

**Rule**: If the field has an official definition in a textbook or spec, use research-known. If researchers are still debating the answer, use research-bleedingedge.

---

### Q: "Should I use research-known for AWS SDK v3?"
**A**: Yes. AWS SDK is stable, versioned, and has canonical documentation at `docs.aws.amazon.com/sdk-for-javascript/`.

- Claim: "AWS SDK v3 uses promises for async operations"
- Source: Official AWS docs + npm package
- Status: CANONICAL

But if you research: "What's the optimal pattern for SDK v3 error retry across regions?", that might be bleeding-edge (no consensus; architectural choice).

---

### Q: "Is current market sentiment about crypto 'known' or 'bleeding-edge'?"
**A**: Neither. Sentiment is **not a research question**; it's opinion.

**Reframe as**:
- **Known**: "What is the Bitcoin whitepaper consensus mechanism?" → research-known
- **Bleeding-Edge**: "Can PoS achieve finality guarantees equivalent to PoW?" → research-bleedingedge (active research)

Sentiment ≠ evidence. Don't use these skills for subjective assessments.

---

## Source Credibility FAQs

### Q: "Is an OpenAI blog post about GPT-4 Tier-1?"
**A**: **Tier-2b** (High trustworthiness, but corporate incentive noted).

- **Tier-1**: Peer-reviewed paper + open community commentary
- **Tier-2b**: Company technical report (official, but marketing interest)
- **Gap**: Company researchers typically don't lie, but may emphasize favorable aspects

**Example**:
```
FINDING: GPT-4 achieves X% accuracy on benchmark Y

SOURCE: OpenAI Blog Post "GPT-4 Technical Report"
TIER: Tier-2b (Company technical report)
CREDIBILITY NOTE: OpenAI has incentive to highlight strengths. 
Benchmark Y should be independently verified or cited in peer-reviewed publications.
```

---

### Q: "Is a StackOverflow answer by the library creator Tier-1?"
**A**: **Tier-2** (trusted person, but not peer-reviewed).

Stack Overflow answers, even by creators, are not peer-reviewed. However:
- Creator is knowledgeable (reduces false claims)
- Community can downvote/comment (built-in error correction)
- Linking to official docs (if present) elevates it to Tier-2

**For research-known**: Only use if StackOverflow answer links to official documentation. Quote the docs, not the answer.

```
❌ "StackOverflow answer by framework creator says..."
✅ "Official docs (linked in StackOverflow) say..., confirmed by answer from framework creator"
```

---

### Q: "Can I cite an LLM-generated summary of a paper?"
**A**: **No**. That's Tier-5 (worse than forum post).

LLM summaries can:
- Hallucinate details
- Misinterpret nuance
- Invert findings

**Rule**: Read the original paper. Quote directly. No intermediaries.

---

### Q: "My 2 sources are the same author. Does that count as 2 independent sources?"
**A**: **No**. Same author = same bias, same error patterns.

**For research-bleedingedge PRELIMINARY status**: Need 2 sources from **different authors/organizations**.

```
❌ PRELIMINARY: Source 1 (Author A, Paper 1), Source 2 (Author A, Paper 2)
✅ PRELIMINARY: Source 1 (Author A), Source 2 (Author B)
```

---

## Scope & Applicability FAQs

### Q: "I found a finding about React. It says React 16. I use React 18. Should I use it?"
**A**: **Check the scope first**. If the finding applies to React 16 only, create a new finding for React 18 behavior.

```
FINDING (React 16): "State updates are not batched in event handlers"
SCOPE: React 16

FINDING (React 18): "State updates are automatically batched in all handlers"
SCOPE: React 18+
CONFLICT: React 18 changed this. Old finding is DEPRECATED.
```

**In your task**: Link both findings and note the version difference.

---

### Q: "I have a finding: 'Python is fast.' Is scope missing?"
**A**: Yes. Extremely vague. **Reframe**:

```
❌ CLAIM: "Python is fast"

✅ CLAIM: "CPython 3.11+ with type hints (PEP 591) is 50-100x faster than untyped for numeric workloads"
  SCOPE: CPython implementation, numerical computation (NumPy, SciPy)
  DOES NOT APPLY: I/O-bound tasks, PyPy or Jython, Rust-heavy libraries
```

Vague findings are useless. **Scope is mandatory**.

---

## Reasoning Chain FAQs

### Q: "My reasoning chain has quotes from 2 sources. Is that enough?"
**A**: **Depends on the gap between quotes**.

**Tight Chain** (good):
```
Quote A: "Tool X does behavior Y"
Quote B: "Behavior Y implies property Z"
Conclusion: "Tool X has property Z"
```

**Loose Chain** (bad):
```
Quote A: "Machine learning exists"
Quote B: "Neural networks are used"
Conclusion: "Transformers are the future"
→ Gap: Missing link between "neural networks" and "transformers are future"
```

**Fix**: Either find a quote bridging the gap, or weaken conclusion to "Neural networks are widely used; transformers are one type."

---

### Q: "One quote says X. Another says Y. How do I reason together?"
**A**: **Document the conflict**. Don't force agreement.

```
FINDING: "Are LLMs memorizing or reasoning?"

SOURCE 1: "Probing studies show X% of benchmark accuracy comes from memorization"
SOURCE 2: "Mechanistic analysis reveals compositional reasoning in attention heads"

REASONING:
These aren't contradictory if:
- Memorization + Reasoning both occur
- Different sub-tasks use different mechanisms
- Benchmark complexity determines ratio

STATUS: CONFLICTED (not yet resolved)
REVISIT: When new interpretability papers provide clearer taxonomy
```

---

## Revisit & Maintenance FAQs

### Q: "My finding is 6 months old. Should I re-validate?"
**A**: **Only if revisit trigger is in the past**.

```
FIND-20260101-001:
  Revisit Date: 2026-04-01 (past!)
  Trigger: "When OpenAI releases new model"
  
→ If OpenAI released model, revisit NOW.
→ If no trigger event, finding still valid; no revisit needed.
```

**Rule**: Revisit date + trigger must happen together. Date without trigger = lazy.

---

### Q: "A new paper contradicts my finding. What do I do?"
**A**: **Don't delete**. Create a conflict record.

```
FIND-20260614-LLM-001 (Original): "Transformers necessary for LLMs"
FIND-20261201-LLM-002 (New): "Mamba shows alternatives work"

IN FIND-20260614-LLM-001, add:
  CONFLICTS:
    - FIND-20261201-LLM-002
    - Status: REFINED (not wrong, but incomplete)
    - Link: See new finding for updated view

IN FIND-20261201-LLM-002, add:
  PREDECESSOR: FIND-20260614-LLM-001
  NOTE: Prior finding claimed necessity; we clarify sufficiency vs. necessity distinction
```

Both findings coexist. Users see the full evolution.

---

## URL & Archive FAQs

### Q: "I have a Springer paywalled paper link. Is that OK?"
**A**: **Only if you provide archive.org backup**.

```
URL: https://link.springer.com/article/10.1007/s12345
ARCHIVE: https://web.archive.org/web/20260614/https://link.springer.com/...

If archive is dead, add institutional access note:
ACCESSIBILITY: Available via IEEE Xplore or author's personal site
AUTHOR_REPO: https://github.com/author/paper
```

---

### Q: "The official docs updated and old URL is 404. What do I do?"
**A**: **Archive + redirect**.

```
ORIGINAL URL: https://docs.python.org/3.8/library/asyncio.html
UPDATED URL: https://docs.python.org/3.11/library/asyncio.html
ARCHIVE: https://web.archive.org/web/20260614/https://docs.python.org/3.8/...

NOTE: Python 3.8 docs have been removed. Asyncio semantics changed in 3.10+.
UPDATE: Revisit finding to confirm if changes apply.
```

---

### Q: "Can I link to a local file instead of a URL?"
**A**: **No**. Local files aren't accessible to other researchers or future-you.

```
❌ "See /Users/john/Desktop/paper.pdf"
✅ "See arXiv:2312.00752 (https://arxiv.org/abs/2312.00752)"
✅ "Author's GitHub repo: https://github.com/author/mamba"
```

---

## Validation & Automation FAQs

### Q: "Validation says 'Ephemeral URL detected' for a Reddit link to a paper. Is that OK?"
**A**: **No**. Extract the paper reference from Reddit and link to the paper directly.

```
❌ FINDING SOURCE: https://reddit.com/r/MachineLearning/comments/xyz (links to Mamba paper)
✅ FINDING SOURCE: https://arxiv.org/abs/2312.00752 (direct paper link)
```

Use reddit as *discovery*, not *source*.

---

### Q: "Validation fails: 'Related finding not found: FIND-XYZ.' What's wrong?"
**A**: The finding you're linking to doesn't exist yet.

Options:
1. **Create it**: If FIND-XYZ should exist, create it first
2. **Remove reference**: If FIND-XYZ isn't actually needed, remove it
3. **Fix typo**: Check `related_findings` field for spelling errors

```bash
# Find all finding IDs in knowledgebase
grep -r "^id:" memory/knowledgebase/research/ | grep FIND-
```

---

### Q: "Can I run validation without automation scripts?"
**A**: **Manually** using checklist from RESEARCH_QUICK_REF.md.

But for consistency, set up scripts:
```bash
npm install --save-dev node-yaml
# Then scripts will parse YAML correctly
```

---

## Token Efficiency FAQs

### Q: "How do I minimize token cost for research-known lookups?"
**A**: **Skip reasoning; go straight to source**.

```
FAST (research-known):
1. Search for RFC number / official docs
2. Extract 1-2 quotes
3. Find 1 confirmation source
4. Archive finding
Time: 15 min | Tokens: ~500-800

SLOW (over-thinking):
1. Read 5 sources (academic papers, blog posts, tutorials)
2. Synthesize reasoning chain
3. Worry about edge cases
Time: 1.5 hours | Tokens: ~5k+
```

For research-known, **once you find the canonical source, stop**. Don't over-research.

---

### Q: "How do I minimize token cost for research-bleedingedge?"
**A**: **Use browser-tools + courage to declare findings early**.

```
EFFICIENT:
1. Find 2 arXiv papers on topic
2. Extract relevant sections (not full paper)
3. Compare quotes; build reasoning
4. Mark PRELIMINARY (not VALIDATED yet)
5. Set revisit date for confirmation
Time: 1.5 hours | Tokens: ~2k

INEFFICIENT:
1. Read full 10 papers cover-to-cover
2. Try to reach 100% consensus
3. Over-synthesize reasoning
4. Delay archival waiting for "perfection"
Time: 5+ hours | Tokens: ~10k+
```

**Philosophy**: Research is iterative. PRELIMINARY findings are fine. Update when new evidence arrives.

---

## Conflict Resolution FAQs

### Q: "Two Tier-1 sources directly contradict each other. What's my confidence now?"
**A**: **Mark as CONFLICTED**. Confidence drops to LOW unless you can explain delta.

```
FINDING: "Do RNNs have quadratic memory usage?"

SOURCE A (Hochreiter 1997): "RNNs have quadratic memory with sequence length"
SOURCE B (RWKV 2024): "Linear RNNs achieve linear memory and competitive performance"

CONFLICT TYPE: Different RNN architectures, not contradiction
DELTA: Source A discusses vanilla RNNs; Source B discusses selective state spaces
RESOLUTION: Both true in their context; finding needs scope clarification

NEW FINDING: "Vanilla RNNs have quadratic memory; Selective State Space RNNs (S4, Mamba) have linear memory"
```

---

### Q: "My finding contradicts the team's assumption. Should I hide it?"
**A**: **Absolutely not**. Archive it. Escalate in session memory.

```
ctx_session(action="finding", value="[CONFLICT] Finding contradicts team assumption about [topic]. 
Source: [URL]. Recommend team discussion before decision. FIND-ID: [ID]")
```

Contradictions are features, not bugs. They force clarification.

---

## Scope & Version FAQs

### Q: "I have a finding about 'Caching.' How specific should scope be?"
**A**: **Extremely specific**.

```
❌ "Caching improves performance"
❌ "HTTP caching works"
✅ "HTTP 1.1 GET responses are cached by default per RFC 7231; max-age directive controls TTL"
✅ "Browser caches reduce latency for repeat requests; conditional requests (304) save bandwidth"
✅ "Redis caching at application layer reduces DB query latency for read-heavy workloads"
```

Each finding is **specific to one mechanism, one domain, one scope**. If you need 3 findings, create 3 findings.

---

### Q: "How do I handle 'it depends' findings?"
**A**: **Explicitly list the variables**.

```
FINDING: "Does synchronous or asynchronous I/O perform better?"

DEPENDS ON:
1. **I/O type**: Network (async better), Disk (less clear), CPU-bound (sync fine)
2. **Concurrency level**: Single request (sync fine), 1000+ concurrent (async better)
3. **Framework**: Node.js (async native), Python (thread pool can async-ify)
4. **Latency tolerance**: High-latency ops (async), low-latency (maybe sync)

SCOPE: Web servers handling 1000+ concurrent HTTP requests
FINDING: "Asynchronous I/O (async/await, promises) prevents thread saturation and achieves higher throughput"
CAVEAT: If request count < 100, synchronous is simpler with similar performance
```

Acknowledge dependencies. Don't pretend findings are universal.

---

## Cross-Domain Linking FAQs

### Q: "I'm researching 'ML in production.' Should I link to algorithm findings and systems findings?"
**A**: **Yes, via related_findings**. But keep findings independent.

```
FINDING: "FastAPI + async is good for serving ML models"
DOMAIN: known (frameworks) + systems

RELATED:
- FIND-async-001: "Async/await semantics in Python"
- FIND-ml-002: "Model serving requirements"

Each finding can stand alone. Related fields create a knowledge graph.
```

---

## Researcher Credibility FAQs

### Q: "I discovered something by accident. Is it a valid finding?"
**A**: **Yes, if supported by evidence**.

The path doesn't matter. What matters:
1. Can you quote a source?
2. Can you trace the logic?
3. Is the scope clear?

```
FINDING: "Discovered by accident: HTTP caching prevents redundant API calls"
SOURCE: RFC 7231 + real-world observation
STATUS: CANONICAL

Serendipity is fine. Evidence matters.
```

---

## Emergency / Escalation FAQs

### Q: "I found conflicting findings that could impact a critical decision. What now?"
**A**: **Immediately escalate**. Create an issue.

```bash
# Create issue file
cat > issues/active/RESEARCH-CONFLICT-001.md << 'EOF'
# CONFLICT: Critical Research Finding Discrepancy

**Finding 1**: FIND-XXXX-001 (Status: VALIDATED)
**Finding 2**: FIND-YYYY-002 (Status: PRELIMINARY)

**Impact**: Decision on [critical project] depends on which is correct
**Severity**: HIGH

**Recommendation**: Halt decision until conflict resolved (1-2 weeks)
**Owner**: [Human review required]
EOF
```

---

### Q: "A finding is outdated and I can't spend time updating it. Should I delete it?"
**A**: **Mark as DEPRECATED with link to newer finding**.

```yaml
status: "DEPRECATED"
superseded_by: "FIND-20261201-001"
note: "This finding is superseded by newer research. See FIND-20261201-001."
```

Never delete. Archive with context.

---

## Final Gotchas

### ⚠️ Gotcha 1: "Recent" ≠ "Correct"
A 2024 paper is newer than a 2000 paper, but not necessarily more correct. Prefer foundational + recent.

### ⚠️ Gotcha 2: Consensus ≠ Truth
If 10 blog posts agree, that's consensus, not evidence. One peer-reviewed paper > 100 blog posts.

### ⚠️ Gotcha 3: Credentials ≠ Infallibility
PhD author can be wrong. Check the evidence, not the pedigree.

### ⚠️ Gotcha 4: Reproducibility ≠ Validity
If results are reproducible but methodology flawed, findings are still flawed. Prefer peer-review over reproducibility alone.

### ⚠️ Gotcha 5: Quoting ≠ Understanding
If you quote something and can't explain it in your own words, you don't understand it. Re-read.

---

## Contact & Escalation

**Questions about skill definitions?** → Create issue in `issues/backlog/RESEARCH-*.md`  
**Found a contradiction?** → Create issue in `issues/active/RESEARCH-CONFLICT-*.md`  
**Need to revisit urgently?** → Use `ctx_session(action="task")` for immediate reminder  

---

**Last Updated**: 2026-06-14  
**Next Review**: 2026-09-14 (quarterly)
