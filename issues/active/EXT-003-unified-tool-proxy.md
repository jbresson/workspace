# Issue EXT-003: Omnitool - The Librarian's Kernel

## 🎯 Vision
Transform the tool-calling architecture from a "menu of options" to a "Single Point of Entry" (Kernel). The agent is restricted to one and only one tool: `omnitool`. This creates a deterministic choke point for auditing, security, and token efficiency.

## 🛡️ Hard Invariants (Non-Negotiable)
1. **Sole Access**: `omnitool` is the ONLY tool presented to the agent. All other tools are hidden.
2. **No Shell/Exec**: Arbitrary script execution (`bash`, `shell`, `exec`) is strictly illegal and removed from all reachable paths.
3. **No Live Loading**: The agent cannot load new extensions or register tools at runtime. Registry is locked after boot.
4. **Proxy Isolation**: No direct calls to `ctx_*` (lean-ctx) tools. These are used as internal subroutines by the `omnitool` dispatcher.
5. **WIP Mirror**: All modifications (`draft`, `amend`) must target a `wip/` mirror of the workspace.
6. **Audit Trail**: Every interaction is synchronously logged to `.pi/logs/tool_call.json`.

## 📚 The Librarian's Registry (Interface)
The agent interacts via `omnitool({ action: string, params: Record<string, any> })`.

| Action | Purpose | Internal Implementation / Subroutine | Memory Tier |
| :--- | :--- | :--- | :--- |
| **`index`** | Map project structure | `ctx_ls` $\rightarrow$ `memory/MANIFEST.md` | L1 (Structure) |
| **`fetch`** | Direct read of specific file | `ctx_read` (Targeted) | L1/L2 (Content) |
| **`search`** | Pattern scan across codebase | `ctx_grep` / `ctx_find` | L1 (Pattern) |
| **`knowledge`** | Query or verify deep facts | `ctx_knowledge` $\rightarrow$ `memory/*.md` | L3 (Knowledge) |
| **`note`** | Store or get working memory | `ctx_session` (findings/decisions) | L2 (Working) |
| **`draft`** | Create new file only (no overwrite) | `write` $\rightarrow$ target: `wip/` (create-only gate) | Filesystem |
| **`amend`** | Precise surgical update | `edit` $\rightarrow$ target: `wip/` | Filesystem |
| **`archive`** | Promote working memory to L3 | System process (L2 $\rightarrow$ L3) | L2 $\rightarrow$ L3 |
| **`audit`** | Validate correctness / Run tests | `ctx_verify` / functional tests | Truth Check |

## 🛠️ Implementation Roadmap

### Phase 1: Kernel Core (The Plumbing)
- [ ] **1.1**: Refactor `.pi/extensions/extension-loader.ts` into `OmniTool` class.
- [ ] **1.2**: Implement the Audit Sink: synchronous write of `{ timestamp, request, response, status }` to `.pi/logs/tool_call.json`.
- [ ] **1.3**: Implement Eager Boot: Load all approved extensions during initialization and freeze the registry.
- [ ] **1.4**: Build the Dispatcher: Map Librarian verbs $\rightarrow$ internal tool calls.

### Phase 2: The Librarian Suite (The Abstractions)
- [ ] **2.1**: Implement `index`, `fetch`, `search` logic with strict parameter validation.
- [ ] **2.2**: Implement `knowledge` (query/verify) and `note` (store/get) handlers.
- [ ] **2.3**: Implement `draft` and `amend` with mandatory `wip/` path resolution logic.
- [ ] **2.4**: Implement `audit` by wrapping existing verification subroutines.

### Phase 3: Lockdown & Migration (The Wall)
- [ ] **3.1**: Purge all individual tool definitions from the Agent's system prompt / environment.
- [ ] **3.2**: Update `.pi/SYSTEM.md` (WIP) to define `omnitool` as the sole interface and document Librarian nomenclature.
- [ ] **3.3**: Enforce graduation boundary in omnitool policy: no agent-callable `graduate` action; user-command pathway only.

### Phase 4: Verification & Pressure Testing
- [ ] **4.1**: **Illegal Call Test**: Attempt shell execution or direct `ctx_*` calls $\rightarrow$ verify failure.
- [ ] **4.2**: **Audit Trace Test**: Verify `.pi/logs/tool_call.json` accurately reflects a complex task sequence.
- [ ] **4.3**: **Full Cycle Test**: Execute: `knowledge` (recall) $\rightarrow$ `note` (plan) $\rightarrow$ `draft` (wip create-only) $\rightarrow$ `amend` (wip) $\rightarrow$ `audit` $\rightarrow$ request user graduation.

## ✅ Acceptance Criteria
- [ ] Agent has exactly ONE tool available: `omnitool`.
- [ ] Zero access to shell/exec in any form.
- [ ] 100% of tool calls are recorded in `.pi/logs/tool_call.json`.
- [ ] Code changes never promote to real filesystem via agent tool call; promotion occurs only through user graduation command pathway.
- [ ] Token overhead for tools is reduced by $\ge 50\%$ (no more verbose schemas in prompt).
