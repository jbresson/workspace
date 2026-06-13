# SPEC: Adaptive Neural Agent (ANA)

§G: Evolving agent via RAG (facts) & LoRA (behavioral/procedural modes) w/ lightweight routing.

§C:
- Router latency $\le$ minimal overhead.
- Closed-loop: interaction $\to$ RAG/LoRA evolution.
- Separation: Procedural (how) vs Domain (what) LoRAs.
- Consistency: RAG facts $\neq$ LoRA hallucination.

§I:
- `api`: Prompt $\to$ Response.
- `api`: Feedback $\to$ RAG/LoRA update.

§V:
V1: Router $\to$ [LoRA_ID | Base]
V2: RAG update $\nrightarrow$ loss of existing factual nodes
V3: LoRA swap latency $\le$ threshold
V4: Post-gen check: context $\in$ RAG (if factual)

§T:
id|status|task|cites
T1|. impl Router (embedding-based)|-
T2|. impl RAG (VectorDB integration)|-
T3|. impl LoRA loading/swapping (PEFT)|-
T4|. impl Feedback Loop (RAG/LoRA queue)|V2
T5|. impl Consistency Monitor (Drift detection)|V4

§B:
id|date|cause|fix
