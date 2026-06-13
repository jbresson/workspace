# Design Document: Adaptive Neural Agent (ANA)

## Vision
The Adaptive Neural Agent (ANA) is an evolving system that combines retrieval-augmented generation (R/AG) for factual memory with Parameter-Efficient Fine-Tuning (LoRA) for behavioral adaptation. It is a closed-loop system where user interactions directly drive the evolution of both its knowledge (RAG) and its reasoning patterns (LoRA).

---

## 1. Core Architecture (The Three Pillars)

### A. The Router (The Gatekeeper)
A lightweight, low-latency component using small-scale embeddings. It performs semantic matching of the incoming prompt against "Behavior Vectors" to determine the necessary execution mode.
*   **Goal:** Minimize overhead while maximizing mode accuracy.
*   **Output:** `[Active_LoRA_ID | Context_Window_Retrieved]`

### B. The LoRAs (The Mindsets)
The system utilizes two distinct types of LoRA adapters to separate *logic* from *knowledge*:
*   **Procedural LoRAs ("How to Think"):** These implement specific reasoning workflows (e.g., a *Debugging mode* that follows a hypothesis-driven cycle, or a *System Design mode* that follows a structural decomposition cycle).
*   **Domain LoRAs ("What to Know"):** These inject domain-specific vocabulary and expertise (e.g., *Python Expert*, *Kubernetes Specialist*).

### C. The RAG Engine (The Memory)
A vector database acting as the agent's long-term, factual memory.
*   **Content:** Documentation, API specifications, error logs, and user-corrected facts.
*   **Function:** Provides immutable or slow-changing grounding to prevent hallucination.

### D. Extensions (The Offloaders)
Code-based components that handle deterministic, high-frequency, or computationally intensive tasks.
*   **Goal:** Minimize the use of "thinking power" for tasks that can be executed more efficiently via code.
*   **Benefit:** Reduces cognitive and computational load on the LLM, preserves context window space, and eliminates hallucination in deterministic processes.
*   **Principle:** LoRA can frame our mind, but extensions let us use our mind when we need to and offload simpler calculations.

---

## 2. The Evolutionary Loop
The agent achieves "learning" through a continuous feedback cycle:

1.  **Interaction:** User provides a prompt.
2.  **Execution:** Router selects mode $\to$ RAG retrieves context $\to$ LLM generates response.
3.  **Feedback:** User provides corrections or validation.
4.  **Evolution:**
    *   **Fact Injection:** Corrections are parsed and upserted into the **RAG**.
    *   **Behavioral Refinement:** Successful interaction traces are queued for **LoRA** fine-tuning.
    *   **Router Calibration:** Classification errors trigger updates to the **Router's** semantic matching logic.

---

## 3. Implementation Roadmap

### Phase 1: Foundation (T1, T2)
*   Implement an embedding-based **Router**.
*   Integrate a **Vector Database** (e.g., ChromaDB or Qdrant) for RAG.

### Phase 2: Capability (T3)
*   Implement dynamic **LoRA loading/swapping** via PEFT, allowing the agent to change "mindsets" mid-session.

### Phase 3: Intelligence (T4)
*   Develop the **Feedback Loop** automation: the pipeline that converts user feedback into RAG updates and LoRA training data.


---

## 4. Existing Successful Strategies

The ANA architecture is informed by several key breakthroughs in agentic research.

### A. Verbal Reinforcement & Self-Critique (Reflexion, ReAct)
*   **Highlight:** The ability for an agent to use linguistic feedback (self-critique or user corrections) to iteratively improve its reasoning without immediate weight updates.
*   **ANA Utility:** This is the foundational logic for our **Evolutionary Loop (Phase 3)**. Instead of complex reinforcement learning, we use natural language feedback to drive RAG updates and queue LoRA training.

### B. Modular Adaptation (LoRA, AdapterFusion)
*   **Highlight:** The efficiency of using low-rank adapters to inject specific knowledge or styles, and the ability to compose multiple adapters to solve complex, multi-faceted tasks.
*   **ANA Utility:** Validates our **Two-Layer LoRA strategy**. By separating "Procedural" (logic) from "Domain" (knowledge) adapters, we minimize interference and maximize reuse.

### C. Retrieval-Augmented Grounding (RAG, Self-RAG)
*   **Highlight:** Using external vector stores to provide factual "open-book" context and training models to critically evaluate the relevance of that retrieved information.
*   **ANA Utility:** Directly informs our **RAG Engine** and **Consistency Monitor (T5)**. We don't just retrieve; we use the agent's reasoning to verify that the retrieved facts are consistent with the active LoRA's "mindset."

### D. Automated Skill Acquisition (Voyager)
*   **Highlight:** The concept of an agent autonomously writing, storing, and retrieving "skills" (code/procedures) in a library to expand its capabilities.
*   **ANA Utility:** Provides the blueprint for **Behavioral Refinement**. We treat successful interaction traces as emergent "skills" that are codified into new LoRA weights.

