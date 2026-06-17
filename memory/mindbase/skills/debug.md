# Debugging Skills

## 1. The Scientific Loop (Zeller)
**When to apply**: During the Code phase when bugs surface, or during an Investigate action.
- **Observe**: Capture failure (logs, test output).
- **Hypothesize**: Propose a cause.
- **Predict**: "If hypothesis is true, then [Specific Result] will occur."
- **Experiment**: Targeted change to verify prediction.
- **Verify**: Compare actual result vs prediction.

## 2. Chain of Thought (CoT) Mental Trace
Use as a rubber-ducking tool for complex logic:
- Perform a text-based "dry run" of the code, line by line.
- Explicitly state what each variable holds at each step.
- **The Bug Location**: The $\Delta$ between the agent's mental model and actual logs.

## 3. Minimal Reproduction (Delta Debugging)
Reduce noise to isolate signal:
1. **Simplify Input**: Find the smallest input that triggers failure.
2. **Bisection**: Use `git bisect` or binary search to find the introducing commit/line.
3. **Isolate Environment**: Strip external dependencies until the failure disappears.

## 4. SRE Troubleshooting (Google)
1. **Stop the Bleeding**: Immediate mitigation (revert/flag) first.
2. **Reproduce**: Create a reliable, automated failing test.
3. **Examine & Diagnose**: Trace from edge to source.
4. **Negative Results**: Document what was checked and found *normal*.
