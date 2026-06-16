---
name: debug
description: AI-specific debugging methodology: scientific loop, bias mitigation, verification gates
---
# AI Adaptations for Debugging

This document adapts traditional debugging methodologies for use by AI agents, focusing on systematic diagnosis and overcoming cognitive biases. 

**When to apply:** During the **Do (Cycling)** phase when bugs surface, or during an **Investigate** action when runtime behavior needs deeper analysis.

## 1. The Scientific Debugging Loop (Zeller)
AI agents must not "guess-and-check." Use a systematic search:

- **Requirement**: State the hypothesis explicitly before any code change.
- **Methodology**:
    1. **Observe**: Capture failure (logs, test output).
    2. **Hypothesize**: Propose a root cause.
    3. **Predict**: "If X is true, then Y should happen."
    4. **Experiment**: Modify code/env to test the prediction.
    5. **Verify**: Confirm if the experiment matched the prediction.

## 2. Overcoming Confirmation Bias
Agents are prone to finding what they expect. 

- **Human Intervention Required when**:
    - Agent claims root cause based on "lack of logs" (Absence $\neq$ Proof).
    - Agent proposes a fix that "should work" without a passing test.
    - Agent is stuck in a loop of 3+ unsuccessful attempts at the same bug.
- **Verification Gate**: Every "Confirmed" finding must have "Before" and "After" evidence (logs/screenshots).

## 3. Self-Refinement Loop
Before finalizing a fix, critique the solution:
1. Propose fix.
2. Ask: "What side effects does this create?"
3. Ask: "Am I fixing the root cause or masking a symptom?"
4. Adjust based on critique.

## 4. Surprise Analysis & Assumption Proofing
When a result contradicts the mental model, pause and re-baseline:
1. **Gap Analysis**: Document `Expected` vs `Observed`.
2. **Assumption Inventory**: List every assumption supporting the failed expectation (e.g., "Assumed variable X was set").
3. **Direct Proofs**: Systematically verify each assumption via test or log.
4. **Log Results**: Record these proofs before the next hypothesis.

## 5. Minimal Reproduction (Delta Debugging)
Reduce noise to isolate signal:
1. **Simplify Input**: Find the smallest input that triggers failure.
2. **Bisection**: Use `git bisect` to find the introducing commit.
3. **Isolate Environment**: Strip layers until failure disappears.
