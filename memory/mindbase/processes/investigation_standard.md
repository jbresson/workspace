# Investigation Standard

## Intent
Turn vague symptoms into concrete, actionable understanding by examining observability data. This is a diagnostic process: Question $\rightarrow$ Methodology $\rightarrow$ Evidence $\rightarrow$ Findings.

## Procedure

### 1. Establish the Question
State clearly what is being investigated. Refine "The system is slow" $\rightarrow$ "Which upstream callers are contributing to elevated p99 latency on service X?"

### 2. Investigate & Document Methodology
Use distributed traces, logs, and metrics. Document queries, filters, and time windows used to ensure reproducibility.

### 3. Verify Evidence (Confidence Gates)
Apply rules from `RIGOR_BASELINE.md`:
- **Baseline Comparison**: Compare current state $\Delta$ vs historical baseline.
- **Visual Verification**: Patterns must be confirmed via time-series charts/logs.
- **Bias Check**: Actively seek contradictory evidence before labeling "Confirmed".

### 4. Assess & Label Findings
Every finding must carry a confidence label:
- **Confirmed**: Visually verified OR multi-signal corroborated.
- **Supported**: Consistent with hypothesis, not independently confirmed.
- **Hypothesis**: Plausible, not tested against alternatives.
- **Inconclusive**: Evidence examined, no clear result.

## Required Output Structure (The Report)
All `investigate.md` files must follow this layout:
1. **Question**: The specific problem statement.
2. **Summary**: A concise answer (TL;DR).
3. **Methodology**: How it was done (data sources, time windows).
4. **Findings**: Detailed account with confidence labels.
5. **Recommendations**: Suggested next steps or fixes.
