# Memory Manifest
This manifest provides a high-density index of the project's long-term memory. 
**Operational Law**: Do not read process files in full. Use coordinates `@[start-end]` to target specific logic gates via `ctx_read`.

## 🛡️ Rigor & Identity (The Law)
| File | Focus | Key Truths / Coordinates | Rec. Mode |
| :--- | :--- | :--- | :--- |
| `identity/MANDATES.md` | Core Law | Executor mindset, No Discovery, cmd Loop | `full` |
| `identity/RIGOR_BASELINE.md` | Safety Rails | `@[25-40]` $\rightarrow$ **Evidence Labels**: Apply before any L2/L3 offload. <br> `@[41-44]` $\rightarrow$ **Anti-Bias Gates**: Log absence != Event absence. | `map` |

## ⚙️ Operational Processes (The Engine)
| File | Focus | Key Truths / Coordinates | Rec. Mode |
| :--- | :--- | :--- | :--- |
| `processes/LEAN_CTX_STANDARD.md` | ctx Ops | `@[25-35]` $\rightarrow$ **Scientific Loop**: Mandate before bug fixes. <br> `@[36-43]` $\rightarrow$ **Surprise Analysis**: Trigger when output != prediction. | `map` |
| `processes/investigation_standard.md`| Diagnosis | `@[10-25]` $\rightarrow$ **Investigation Procedure**. <br> `@[30-45]` $\rightarrow$ **Confidence Gates**. <br> `@[46-58]` $\rightarrow$ **Required Output Structure**. | `map` |
| `processes/memory_management.md` | Knowledge Flow | L1->L2->L3 Pipeline, Knowledge Tax, Issue flow | `full` |
| `processes/TASK_MANAGEMENT.md` | Task Flow | `issues/` as single source of truth | `full` |
| `processes/EXECUTION_PACKET.md` | C2 Protocol | Packet structure for Manager -> Worker dispatch | `full` |
| `processes/TASK_EXECUTION.md` | Task Pipeline | Phases 0-6, AC, Convergence Proof | `map` |

## 🧪 Diagnostic Skills (The Tools)
| File | Focus | Key Truths / Coordinates | Rec. Mode |
| :--- | :--- | :--- | :--- |
| `skills/debug.md` | Debugging | `@[5-15]` $\rightarrow$ **Scientific Loop**. <br> `@[17-24]` $\rightarrow$ **Mental Trace**. <br> `@[26-33]` $\rightarrow$ **Delta Debugging**. | `map` |
| `skills/buddy/SKILL.md` | Buddy | Headless Pi executor, custom prompts | `full` |
| `skills/extension-pattern/SKILL.md` | Extensions | Dual registration, tool + command pattern | `map` |
| `skills/task-execution/SKILL.md` | Task Exec | 7-phase workflow, AC, information pipeline | `full` |

## 📚 Knowledgebase (Declarative - "What")
| File | Focus | Key Truths | Rec. Mode |
| :--- | :--- | :--- | :--- |
| `projects/lean-ctx-sse.md` | Memory Infra | SSE Bridge, Lazy-load, MCP tools | `map` |
| `projects/system-design.md` | Architecture | High-level design decisions | `map` |
| `projects/system-spec.md` | Specifications | Technical requirements and specs | `map` |
| `projects/wip-status.md` | cur State | Active work and pending items | `full` |
| `decisions/hf-download.md` | Model Ops | HF retention, local_dir defaults, subprocess.run | `full` |
| `research/lm-studio-configs.md` | LM Studio | Inference profiles, thinking mode toggle, active config | `full` |
| `research/llm-sliding-context-dilution.md` | LLM Context | Sys prompt attention decay, dilution rates, position encoding effects | `full` |
| `research/llm-sliding-context-dilution-citations.md` | References | 20+ primary sources (arxiv), equation mappings, empirical validation | `full` |

## 📋 Root Architecture
| File | Focus | Key Truths | Rec. Mode |
| :--- | :--- | :--- | :--- |
| `ARCHITECTURE.md` | Layout | Memory vs Helpers separation | `map` |
| `ARCHITECTURE_HELPERS.md` | Helpers | Separation of Truth and Tool | `map` |

--- tip: run 'lean-ctx setup --inject-rules' for optimal AI integration ---