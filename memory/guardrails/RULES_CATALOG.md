# 📜 Guardrail Rules Catalog

## Overview
This catalog serves as the canonical record of the Cognitive Guardrail System's active constraints. Rules are instantiated in `.pi/extensions/guardrails/expectations.jsonl`.

## Rule Definitions

| ID | Name | Trigger | Condition | Validation | Scope | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RULE-1** | Memory Integrity Lock | `/memory` | SESSION_ID + Rationale + Shelf-life | MANUAL | GLOBAL | KB Poisoning |
| **RULE-2** | Registry Protection | `expectations.jsonl` | Prior state hash + Reason | CONSTRAINED_CMD | GLOBAL | Self-Unblocking |
| **RULE-3** | .pi Lockdown | `.pi/` | No destructive ops (delete/move/chmod) | CONSTRAINED_CMD | GLOBAL | Audit Vaporization |
| **RULE-4** | todo.md Append-Only | `todo.md` | No deletions or rewrites | CONSTRAINED_CMD | GLOBAL | Task Erasure |
| **RULE-5** | Session Immutability | `ctx_session` | No `reset`; `cleanup` requires snapshot | MANUAL | GLOBAL | Decision Wiping |
| **RULE-6** | Privilege Escalation | `shell` | Block: sudo, su, chmod, rm -rf /, eval, exec | CONSTRAINED_CMD | GLOBAL | Root Access |
| **RULE-7** | Forbidden Paths | `forbidden_paths` | Block: ~/.ssh, ~/.aws, /etc/passwd, etc. | CONSTRAINED_CMD | GLOBAL | Credential Theft |
| **RULE-8** | Meta-Expectation | `meta_expectation` | Blocked actions $\rightarrow$ Issue in `.pi/issues/active/` | MANUAL | GLOBAL | Silent Escalation |
| **RULE-9** | Tool Abuse Detection | `tool_abuse` | No shell I/O on `.pi/` or `/memory` | CONSTRAINED_CMD | SESSION | Automated Corruption |
| **RULE-10**| Audit Immutability | `audit_logs` | Append-only + SHA256 chain | CONSTRAINED_CMD | GLOBAL | Evidence Tampering |

## Operational Profiles

Profiles allow the system to toggle between different security postures:

### 🛡️ Strict (Default)
- **Rules**: All (1-10)
- **Use Case**: Production / High-risk environments. Maximum friction, maximum safety.

### 🛠️ Developer
- **Rules**: 1, 2, 3, 4, 6, 7, 10
- **Use Case**: Active development. Relaxes session and tool abuse rules to allow rapid iteration while protecting core assets.

### 🧊 Minimal
- **Rules**: 1, 2, 10
- **Use Case**: Debugging core engine. Only protects the "Source of Truth" (Memory and Registry).
