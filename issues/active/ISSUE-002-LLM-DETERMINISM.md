# ISSUE-002-LLM-DETERMINISM

## Status: PENDING
**Priority**: MEDIUM
**Category**: Quality / Reliability

## Description
The `SkepticAuditor` and `Negotiator` rely on `LLMService` via the `runBuddy` (Pi CLI) wrapper. Currently, there is no explicit control over the LLM temperature. For safety-critical auditing, `temp=0` is required to ensure deterministic, pedantic, and consistent adversarial reviews.

## Acceptance Criteria
- [ ] Verify if `pi` CLI supports a `--temperature` or `--temp` flag.
- [ ] If supported: Update `runBuddy` in `helpers/extensions/pi-buddies/runner.ts` to accept and pass the temperature parameter.
- [ ] If not supported: Implement "Soft Temp" mandates in the `SKEPTIC` and `NEGOTIATOR` system prompts.
- [ ] Validate that the Auditor produces consistent results for the same proof across multiple runs.

## Risks
- **False Positives**: High temperature may cause the Auditor to be randomly lenient or overly aggressive.
- **Inconsistency**: Different sessions might resolve the same block differently.
