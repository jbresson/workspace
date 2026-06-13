# Brainstorming Ideas

This file contains ideas for the project that are being considered before being formally documented in `DESIGN.md`.

## Ideas
look ad postgres pgvector and AGE, also I'd look at a "memory engram" concept if you want to maintain accurate quotes etc.
use our extension loader to capture this idea: `Client extensions can make it better (add a "tool tool" the provides a tool index, tool search, etc. - it can be the only or one of very few tools in the system prompt).`
1.  **Sandboxing via `--tools`**: Use `pi --tools` from the sandboxing extension to restrict agents to protect ourselves from mistakes.
2.  **Safe File Writes (Backup-before-write)**: On file writes, first create a backup file with the current contents, then do the write. This makes rollbacks simple and easy.
3.  **Ephemeral Agent Sessions**: Use sessions to support instances of spawning a new ephemeral agent with quick simple instructions to answer a question before giving the next prompt to an agent.
4.  **Mindset-driven Sessions**: Use `/export mindset_session.jsonl` then `pi --fork saved_session.jsonl` to startup in certain "mindsets" before LoRA are ready.
5.  **Specialized Agent Commands**: Store "different types of pi agents" as well-named extension commands with specific CLI options. This allows agents to easily call upon specialized "friends" (e.g., `pi --role researcher`).
