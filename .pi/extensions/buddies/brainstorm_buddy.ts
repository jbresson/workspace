/**
 * brainstorm_buddy.ts
 *
 * Keep Brainstorm Agent. Handles !brainstorm <topic> notes.
 * Local knowledge only — no web access, no bash.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { runBuddy } from "./runner";
import { applyInferenceProfile } from "./utils";

const SYSTEM_PROMPT = `\
You are a creative technical advisor with deep expertise across software engineering,
systems design, research methodology, and applied AI.

MISSION:
Brainstorm ideas, implications, and approaches for the given topic using only your existing
training knowledge. Do NOT use web_fetch or fetch external URLs. You may use read/grep/ls
to inspect local project files for context.

APPROACH:
- Generate a diverse set of ideas — bold, unconventional options alongside practical ones.
- For each key point, explain the concrete mechanism (not just "this could be useful").
- Actively look for cross-domain insights and unexpected connections.
- Further Questions should be genuinely exploratory, not just obvious follow-ups.

OUTPUT FORMAT — respond with exactly this markdown structure and nothing else:

## Conclusion
<One concise paragraph synthesizing the most important insight. OMIT for open-ended exploration.>

## Key Points
- <high-level idea or insight 1>
- <high-level idea or insight 2>
...

## Summary
<Multi-paragraph prose covering the full ideation landscape. Include tradeoffs and context.>

## Key Point Details
### <Key Point 1 verbatim>
<Mechanism, rationale, concrete application, known caveats.>

### <Key Point 2 verbatim>
...

## Sources
- Model Knowledge — <domain>: <brief note on which knowledge base this draws from>
...

## Further Questions
- <question> — <how to explore further or leverage this for self-improvement / practical use>
...
`;

export default function (pi: ExtensionAPI) {
  pi.registerFlag("inference-profile", {
    description: "JSON object of inference parameters",
    type: "string",
    default: "{}",
  });

  // Outer session: only the brainstorm tool
  pi.on("session_start", () => { pi.setActiveTools(["keep_brainstorm"]); });

  pi.on("before_agent_start", () => ({
    systemPrompt:
      "You have exactly one task: call the keep_brainstorm tool with the topic " +
      "provided by the user. Call it immediately.",
  }));

  pi.on("before_provider_request", (event) => {
    applyInferenceProfile(pi, event.payload);
  });

  pi.registerTool({
    name: "keep_brainstorm",
    label: "Keep: Brainstorm Topic",
    description:
      "Brainstorm ideas on a topic using local model knowledge only (no web). " +
      "Returns structured report: Conclusion, Key Points, Summary, Key Point Details, Sources, Further Questions.",
    parameters: Type.Object({
      topic: Type.String({ description: "The topic or question to brainstorm." }),
    }),
    async execute(_id, params) {
      return runBuddy({
        systemPrompt: SYSTEM_PROMPT,
        prompt: `Brainstorm the following topic using only your existing knowledge:\n\n${params.topic}`,
        noSession: true,
        noContextFiles: true,
        // No web_fetch — local read access only
        tools: ["read", "grep", "find", "ls"],
        thinking: "medium",
      });
    },
  });
}


