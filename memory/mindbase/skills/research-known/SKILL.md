---
name: research-known
description: >
  Research well-established, "known" domains (classical algorithms, standard APIs, mature frameworks, physics fundamentals, etc.).
  Finding/determination requires only: reference link + confirmation from ≥2 independent trustworthy sources.
  No personal hypotheses. No reasoning chains required (logic is canonical). Fast fact-verification.
---

# Research: Known (Established Knowledge)
Fast fact-verification for mature, canonically-documented domains.

## Core Principle
**Established domains have canonical truth.** Forum post ≠ source. Wikipedia ≠ primary source. But for "known," one good link + spot-check suffices.

Every finding must answer:
1. **What is the claim?** — Specific, verifiable fact or behavior.
2. **Is it in the canonical reference?** — Official documentation, RFC, mathematical handbook, etc.
3. **Is it confirmed elsewhere?** — ≥1 independent source (textbook, standards org, trusted library).
4. **Reference URLs** — Links to authoritative sources.

## Applicable Domains
- **Classical Algorithms** — Dijkstra, quicksort, hash tables, etc.
- **Standard Data Structures** — Balancing BSTs, heaps, linked lists
- **Mature APIs & Frameworks** — Node.js, React, PostgreSQL, AWS SDK (stable versions)
- **Physics Fundamentals** — Newton's laws, thermodynamics, electromagnetism
- **Mathematics** — Linear algebra, calculus, probability basics
- **Standards & Specs** — HTTP, TCP/IP, JSON, OAuth2, SQL
- **Programming Languages** — Python 3.11 stdlib, JavaScript ES2023, Go 1.21 spec
- **Design Patterns** — MVC, Observer, Factory, Singleton (GoF canon)
- **Best Practices** — SOLID principles, REST conventions, security baselines

## Finding Template
```
FINDING: [Claim]

CANONICAL SOURCE:
  Title: [Official Name]
  Link: [URL to primary reference]
  
  Excerpt: "[Relevant quote or specification]"
           — Section/Page reference

CONFIRMATION:
  Source: [2nd source, e.g., trusted textbook, standard library, tutorial]
  Link: [URL]
  Note: "[Brief note on how it confirms the canonical reference]"

APPLICABILITY:
  Applies to: [Specific scope, e.g., Python 3.8+, Node.js async/await, HTTP/1.1]
  Does NOT apply to: [What this does not cover]

QUICK REFERENCE:
  [Condensed fact for session memory or knowledge base]

STATUS: [CANONICAL / VERIFIED / DEPRECATED]
```

## Rigor Gates (Non-Negotiable)
1. **Canonical First** — If an official spec/documentation exists, use it. Don't research what RFC says by reading blogs.
2. **At Least One Confirmation** — Canonical + ≥1 independent source (different author, organization, or reference).
3. **Link Permanence** — Prefer DOI, archive.org, official GitHub repos, RFC sites. Avoid unversioned blog links.
4. **Scope Clarity** — "Python async is X" is vague. "Python 3.8+ async/await with asyncio is X" is clear.
5. **Version Specificity** — For APIs/frameworks, state version: React 18, Go 1.21, PostgreSQL 15, etc.

## Source Hierarchy (High → Low Credibility)
| Tier | Source Type | Trustworthiness | When to Use |
|------|------|---|---|
| **Tier 1** | Official spec/RFC/documentation (Python docs, HTTP RFC, PostgreSQL manual, React.dev) | 99%+ | Primary source. Always start here. |
| **Tier 1b** | Published textbook by recognized author (Knuth's TAOCP, Cormen et al. Algorithms) | 95%+ | Canonical reference for algorithms, math. |
| **Tier 2** | O'Reilly, Pragmatic Programmer, or publisher-vetted technical books | 90%+ | Confirmation source. |
| **Tier 2b** | Established standards org (IETF, ISO, W3C, ECMA, IEEE) | 95%+ | Authority on specs. |
| **Tier 3** | Trusted tutorial/guide by framework creators (Next.js guide, Flask tutorial) | 85%+ | Often mirrors official docs; good for examples. |
| **Tier 4** | University lecture notes or MIT OpenCourseWare | 80%+ | Algorithms, math, CS fundamentals. |
| **Tier 5** | Established blog by recognized expert (Dan Abramov on React, Guido van Rossum on Python) | 75%+ | Trusted but less authoritative than spec. |
| **Tier 6** | StackOverflow answer with high votes + official confirmation elsewhere | 60%+ | Use only as confirmation, not primary. |

**Do NOT use**: Reddit posts, Medium blogs without author credibility, Quora, unverified YouTube tutorials, or AI-generated summaries as primary sources.

## Investigation Workflow

### Phase 1: Define Claim
1. **Specific Fact** — Not "Python is good" but "Python 3.8+ uses PEP 3155 for inner function naming."
2. **Scope** — "This applies to Python 3.8+, not earlier."
3. **Query** — "Is this true? Where is this documented?"

### Phase 2: Find Canonical Source
1. **Search official documentation** — docs.python.org, RFC, official GitHub pages
2. **Locate exact section** — Quote the official reference
3. **Verify currency** — Is this version still current, or deprecated?

### Phase 3: Confirm Independently
1. **Find 2nd source** — Different author/org that confirms canonical
2. **Cross-check** — Do both sources agree? Any discrepancies?
3. **Note differences** — If sources conflict (rare for established domains), flag it

### Phase 4: Validation Gate
- [ ] Canonical source found and quoted?
- [ ] URL is permanent and linkable?
- [ ] ≥1 independent confirmation source?
- [ ] Scope/version clearly stated?
- [ ] No conflicting information (or conflict noted)?

## Output Format for Findings
**In written work or session memory**, findings are tagged:
- `[CANONICAL]` — From official spec/docs, confirmed elsewhere
- `[VERIFIED]` — ≥2 independent reputable sources agree
- `[DEPRECATED]` — True for old version; replaced in current version
- `[SCOPE-LIMITED]` — True for specific context (e.g., "Python 3.8 only")

## Examples

### Example 1: CANONICAL Finding
```
FINDING: HTTP GET requests must not have a request body per RFC.

CANONICAL SOURCE:
  Title: RFC 7231 (HTTP/1.1 Semantics and Content)
  Link: https://tools.ietf.org/html/rfc7231#section-4.3.1
  
  Excerpt: "GET requests do not have defined semantics for the message body,
            and thus a server that receives a GET request with an attached body
            may reject the request as invalid."
            — Section 4.3.1, GET

CONFIRMATION:
  Source: MDN Web Docs - HTTP (Mozilla)
  Link: https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/GET
  Note: "The GET method requests a representation of the specified resource. Requests using GET should only retrieve data and should have no other effect. It should not have a message body."

APPLICABILITY:
  Applies to: HTTP/1.1 and HTTP/2 (RFC 7540 does not relax this)
  Does NOT apply to: Custom protocols, gRPC (separate spec)

QUICK REFERENCE:
  GET requests per RFC 7231 section 4.3.1 must not include a request body. Servers may reject violating requests.

STATUS: CANONICAL
```

### Example 2: VERIFIED Finding (Multiple Sources)
```
FINDING: QuickSort has O(n²) worst-case time complexity on sorted input.

CANONICAL SOURCE:
  Title: "The Art of Computer Programming: Volume 3 - Sorting and Searching" by Donald Knuth
  Link: https://en.wikipedia.org/wiki/The_Art_of_Computer_Programming (reference; see Knuth Vol 3, Section 5.2.2)
  
  Excerpt: "The worst case occurs when the pivot consistently divides the list into subsets of sizes 1 and n−1,
            yielding a recurrence T(n) = T(n−1) + O(n), which solves to O(n²)."
            — Section 5.2.2 (Quicksort)

CONFIRMATION:
  Source: "Introduction to Algorithms" (CLRS) - MIT Press
  Link: https://mitpress.mit.edu/9780262033848/introduction-to-algorithms/ (textbook reference; widely cited)
  Note: "The worst-case time complexity of quicksort is Θ(n²), which occurs when the pivot is consistently the minimum or maximum element."

APPLICABILITY:
  Applies to: Classic quicksort with random/unlucky pivot selection
  Does NOT apply to: Quicksort with median-of-three pivot selection (rarely but still possible O(n²)), introsort (hybrid; switches to heapsort if recursion depth exceeds limit)

QUICK REFERENCE:
  Quicksort worst-case: O(n²). Triggered by sorted or reverse-sorted input with bad pivot selection. Median-of-three or introsort mitigate.

STATUS: CANONICAL (Knuth + CLRS agreement)
```

### Example 3: VERIFIED Finding (Standards + Implementation)
```
FINDING: OAuth 2.0 Authorization Code flow requires HTTPS per RFC 6749.

CANONICAL SOURCE:
  Title: RFC 6749 - OAuth 2.0 Authorization Framework
  Link: https://tools.ietf.org/html/rfc6749#section-3.1
  
  Excerpt: "The client MUST use TLS as defined in [RFC2818] when making requests to the authorization server.
            The exact method for configuring TLS in HTTP clients is implementation-dependent."
            — Section 3.1 (Authorization Endpoint)

CONFIRMATION:
  Source: OWASP OAuth 2.0 Security Cheat Sheet
  Link: https://cheatsheetseries.owasp.org/cheatsheets/OAuth_2.0_Security_Cheat_Sheet.html
  Note: "All endpoints must enforce HTTPS. Non-TLS connections allow interception of tokens and authorization codes."

APPLICABILITY:
  Applies to: OAuth 2.0 (RFC 6749 and 6750)
  Does NOT apply to: localhost:8080 during development (RFC 8252 Section 8.5 permits for native apps during local dev, but production must use HTTPS)

QUICK REFERENCE:
  OAuth 2.0 (RFC 6749) mandates HTTPS for all authorization and token endpoints. Exception: localhost during development (RFC 8252).

STATUS: CANONICAL (RFC 6749 + RFC 8252 + OWASP confirmation)
```

## Session Memory Tags
Use these in `ctx_session(action="finding", value="...")` calls:
```
[KNOWN-CANONICAL] [Algorithm] QuickSort worst-case O(n²) on sorted input. [Knuth Vol 3 + CLRS]

[KNOWN-VERIFIED] [HTTP] GET requests must not have request body per RFC 7231 section 4.3.1. [RFC + MDN]

[KNOWN-DEPRECATED] [Python] String formatting with % operator is deprecated in favor of str.format() (Python 3+). [PEP 3101]

[KNOWN-SCOPE-LIMITED] [PostgreSQL] VACUUM FULL requires exclusive table lock; use VACUUM (without FULL) for online maintenance in PostgreSQL 12+. [PostgreSQL 12 docs]
```

## Anti-Patterns (What NOT to Do)

❌ "Everyone says REST APIs should be stateless"  
✅ "REST architectural constraint #5 (Stateless) per Fielding's dissertation (2000) + RFC 7231."

❌ "I found a StackOverflow answer that explains this"  
✅ "StackOverflow answer [X upvotes]. Primary source is [official docs link]."

❌ "This blog post summarizes the algorithm"  
✅ "Algorithm defined in Knuth Vol 3 section X. Confirmed in CLRS chapter Y."

❌ "Linus Torvalds said this on Twitter"  
✅ "Kernel code shows this behavior. See Linux kernel source [link to GitHub] or man page [link]."

❌ "Let me check Medium"  
✅ "Official documentation: [link]. Trusted reference: [textbook/RFC]."

## Integration with Task Execution
For fact-checking or verification tasks:
- **Phase 0**: Crystallization — Define what "known fact" means (scope + version)
- **Phase 1**: Map canonical sources (RFC, official docs, textbook)
- **Phase 2**: Confirm with independent source
- **Phase 3**: Resolve any conflicts (rare; mark scope)
- **Phase 4**: Verify all claims have primary + secondary sources
- **Phase 5**: Archive fact to knowledge base (memory/knowledgebase/)
- **Phase 6**: Retrospective (time spent per fact, bottlenecks in finding sources)

## Tools & Extensions
- **brave-search** — Find official documentation, textbooks, RFC links with domain filters (site:github.com, site:ietf.org, site:python.org)
- **browser-tools** — Access paywalled textbooks (if available), GitHub raw links, official API pages
- **ctx_semantic_search** — Search local knowledge base for related facts (have we fact-checked this before?)

## Common Reference Collections
**Always keep bookmarked:**
- RFC Editor: https://www.rfc-editor.org/
- Python Official Docs: https://docs.python.org/3/
- JavaScript MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/
- W3C Standards: https://www.w3.org/
- NIST Cybersecurity Framework: https://csrc.nist.gov/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- React Official Docs: https://react.dev/
- Kubernetes Documentation: https://kubernetes.io/docs/
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/

---

**Revision**: 2026-06-14  
**Author**: Research Skill Definition  
**Next Review Trigger**: New "known" domains added, or canonical source for existing fact changes
