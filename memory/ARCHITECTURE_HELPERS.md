# Helpers Architecture & Hardening

## Layout
- `/.pi/extensions/`: Pi extension source code (Auto-discovery, Lazy-load).
- `/helpers/impl/skills/`: The executable implementation of capabilities.
- `/memory/mindbase/skills/`: The documentation and definition (`SKILL.md`) of capabilities.

## Hardening Principles
1. **Separation of Truth and Tool**: 
    - Definitions (The "What") live in `memory/`.
    - Implementation (The "How") lives in `helpers/impl/`.
    - This prevents agents from confusing documentation with executable code during context retrieval.
2. **Dependency Isolation**: Extensions in `/.pi/extensions/` must maintain their own `package.json` or requirements to avoid project-root pollution.
3. **Discovery First**: All new helpers must be registered via a `SKILL.md` in the corresponding memory path before implementation.
4. **Statelessness**: Helpers should ideally be stateless, relying on `lean-ctx` for session memory rather than local `.tmp` files unless explicitly required.
