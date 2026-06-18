# Issue EXT-007: Buddy Ledger & JSON Audit Integration

## 🎯 Objective
Integrate the `BUDDY.md` (Narrative State) and `.pi/logs/tool_call.json` (Audit Evidence) into all higher-level process tools to ensure seamless synchronization between agent thought and system record.

## 📋 Requirements
### 1. Narrative State (`BUDDY.md`) Integration
- [ ] **Note Tool Evolution**: Update `omnitool({ action: "note" })` to support structured updates to specific sections of `BUDDY.md` (e.g., `# CURRENT FOCUS`, `# THE WALL`).
- [ ] **Automatic State Updates**: Process tools (like `archive` or user-command graduation events) should automatically append a summary of their outcome to the `# WORKING MEMORY` section of `BUDDY.md`.
- [ ] **Handover Automation**: Create a tool/command to generate a "Session Summary" from `BUDDY.md` for cross-agent handovers.

### 2. Audit Evidence (`tool_call.json`) Integration
- [ ] **Evidence Linking**: When an agent performs an `audit`, the tool should be able to correlate specific entries in `BUDDY.md` with the exact timestamps/calls in `tool_call.json`.
- [ ] **Audit Reporting**: Implement a utility that can translate raw JSON audit logs into a human-readable "Execution Report" for the agent.

### 3. Guardrail Synergy
- [ ] **Shadow Monitoring**: Ensure guardrails continue to monitor `.json` ledgers in the background without interfering with the agent's narrative in `BUDDY.md`.

## ✅ Success Criteria
- Agent can update its "Current Focus" via `omnitool` and see it reflected in `BUDDY.md`.
- System logs provide an immutable record of all actions regardless of what is written in `BUDDY.md`.
- Transition between agents is handled by reading the `BUDDY.md` ledger.
