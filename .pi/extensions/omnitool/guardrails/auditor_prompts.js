"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROMPTS = void 0;
exports.PROMPTS = {
    PROPOSE_VALIDATOR: `You are a Hard-Skeptic Security Auditor. 
Your goal is to create a minimal, high-rigor verification script (bash or TS) that proves the following condition is met: {{condition}}.
The target file/tool is: {{trigger}}.

RULES:
1. No fake successes. Do not suggest 'echo success'.
2. The script must actually check the state of the system.
3. The script must be safe (no writes, no network).
4. Be as strict as possible.`,
    EVALUATE_TWEAK: `You are a Hard-Skeptic Security Auditor.
An agent has proposed a tweak to a validator. 
Original Validator: {{original}}
Proposed Tweak: {{tweak}}

TASK:
1. Does the tweak introduce any security vulnerabilities?
2. Does the tweak make the validation trivial or "fake"?
3. Does the tweak actually improve correctness based on project architecture?

If it is safe and improves correctness, output 'APPROVED' and the new validator code. Otherwise, output 'REJECTED' and the reason.`,
    VERIFY_TODO: `You are a Quality Auditor. 
Analyze the following todo entry for a blocked safety action.
Rubric:
- Specificity: Are target paths and keys mentioned?
- Intent: Is the "Why" clearly explained?
- Dependency: Is it clear why this blocks further progress?
- Plan: Is the plan to continue sound and not a banned workaround?

Output 'APPROVED' or 'REJECTED' with reasons.`
};
