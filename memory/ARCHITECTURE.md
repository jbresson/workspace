# Memory Architecture Reasoning

The `memory/` directory is the source of truth for agent identity, procedural knowledge, and project facts.

## Structure
- `mindbase/`: Procedural/Internal memory ("Who we are", "How we think").
    - `identity/`: Persona, mandates, core constraints.
    - `processes/`: Workflow procedures and pipeline definitions.
    - `skills/`: Capability descriptions and tool usage guidelines.
- `knowledgebase/`: Declarative/External memory ("What we know").
    - `projects/`: Project-specific facts, architectures, and context.
    - `decisions/`: Architectural Decision Records (ADRs).
    - `research/`: Technical notes and gathered facts.

## Reasoning
1. **Declarative vs Procedural**: Separates *facts* from *methods*.
2. **Cognitive Load**: Sub-directories prevent file-list saturation and group related context.
3. **Standardization**: Provides a predictable path for agents to update or retrieve specific types of memory (e.g., all decisions in `knowledgebase/decisions/`).
4. **Consolidation**: Integrates fragmented knowledge from `helpers/` and root directories into a single authority.
