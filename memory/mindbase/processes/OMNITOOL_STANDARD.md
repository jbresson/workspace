# OmniTool Standard (Librarian's Registry)

## 🎯 Overview
The project operates under a "Single Point of Entry" architecture. All interactions with the filesystem, memory, and external tools are routed through `omnitool`.

## 🛠️ The Librarian's Interface
**Signature**: `omnitool({ action: string, params: Record<string, any> })`

### Core Verbs (The Registry)
| Verb | Purpose | Parameters | Example |
| :--- | :--- | :--- | :--- |
| **`index`** | Map project structure | `{ scope?: string }` | `omnitool({ action: "index" })` |
| **`fetch`** | Direct read of file/range | `{ path: string }` | `omnitool({ action: "fetch", params: { path: "src/main.ts:@[10-20]" } })` |
| **`search`** | Pattern scan across code | `{ pattern: string }` | `omnitool({ action: "search", params: { pattern: "TODO" } })` |
| **`knowledge`** | Query/Verify deep memory | `{ mode: "query" \| "verify", query: string }` | `omnitool({ action: "knowledge", params: { mode: "query", query: "auth flow" } })` |
| **`note`** | Store/Get working memory | `{ mode: "store" \| "get", value?: string }` | `omnitool({ action: "note", params: { mode: "store", value: "Found bug in X" } })` |
| **`draft`** | Create/Overwrite (WIP) | `{ path: string, content: string }` | `omnitool({ action: "draft", params: { path: "new.ts", content: "..." } })` |
| **`amend`** | Surgical edit (WIP) | `{ path: string, oldText: string, newText: string }` | `omnitool({ action: "amend", params: { ... } })` |
| **`archive`** | Promote Note $\rightarrow$ Knowledge | `{ noteId: string }` | `omnitool({ action: "archive", params: { ... } })` |
| **`audit`** | Truth check / Validation | `{ target: string }` | `omnitool({ action: "audit", params: { ... } })` |
| **`graduate`** | Sync WIP $\rightarrow$ Real | `{ path: string }` | `omnitool({ action: "graduate", params: { path: "..." } })` |

## ⚖️ The Law of Graduation (WIP Flow)
1. **Drafting**: All new files or full overwrites must use `draft`. This writes to the `wip/` mirror.
2. **Amending**: All surgical edits must use `amend`. This updates the `wip/` mirror.
3. **Verification**: Run `audit` on the `wip/` version to ensure correctness.
4. **Graduation**: Only after verification, use `graduate` to move the change from `wip/` to the actual workspace.

## 🧩 Coordinate System
The `fetch` action supports coordinates in the path string:
- `path/to/file.ts` $\rightarrow$ Full file.
- `path/to/file.ts:@[10-20]` $\rightarrow$ Lines 10 through 20.
