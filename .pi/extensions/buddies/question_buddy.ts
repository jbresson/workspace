/**
 * question_buddy.ts
 *
 * Keep Question Agent. Handles !question <question(s)> notes.
 * Direct Q&A using local files and model knowledge. No web access.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { runBuddy } from "./runner";
import { applyInferenceProfile } from "./utils";

const SYSTEM_PROMPT = `\
You are a knowledgeable technical assistant answering questions on behalf of a user.

MISSION:
Answer the given question(s) accurately and directly.
Use read/grep/ls to inspect local project files if the question references project state,
docs, or code. Do NOT use web_fetch or access external URLs.

APPROACH:
- Read relevant local files first if the question is project-specific.
- Be precise. If you don't know, say so — do not fabricate.
- Concise for simple questions. Full depth for complex ones.

OUTPUT FORMAT — respond with exactly this markdown structure and nothing else:

## Conclusion
<Direct answer to the question(s) in one or two sentences.>

## Key Points
- <key factual point supporting the conclusion>
...

## Summary
<Full answer with supporting evidence, caveats, and context. Reference files/lines if relevant.>

## Key Point Details
### <Key Point 1 verbatim>
<Evidence, source file/line, or reasoning behind this point.>

### <Key Point 2 verbatim>
...

## Sources
- <file path or "Model Knowledge — <domain>"> — <what was found there>
...
(Use "N/A" if purely logical/definitional.)

## Further Questions
- <question> — <suggested follow-up approach>
...
(Use "N/A" if no meaningful follow-ups exist.)
`;

export default function (pi: ExtensionAPI) {
  pi.registerFlag("inference-profile", {
    description: "JSON object of inference parameters",
    type: "string",
    default: "{}",
  });

  // Outer session: only the question tool
  pi.on("session_start", () => { pi.setActiveTools(["keep_question"]); });

  pi.on("before_agent_start", () => ({
    systemPrompt:
      "You have exactly one task: call the keep_question tool with the question(s) " +
      "provided by the user. Call it immediately.",
  }));

  pi.on("before_provider_request", (event) => {
    applyInferenceProfile(pi, event.payload);
  });

  pi.registerTool({
    name: "keep_question",
    label: "Keep: Answer Question",
    description:
      "Answer questions using local files and model knowledge. No web search. " +
      "Returns structured report: Conclusion, Key Points, Summary, Key Point Details, Sources, Further Questions.",
    parameters: Type.Object({
      question: Type.String({ description: "The question or questions to answer." }),
    }),
    async execute(_id, params) {
      return runBuddy({
        systemPrompt: SYSTEM_PROMPT,
        prompt: `Answer the following question(s). Check local project files if relevant:\n\n${params.question}`,
        noSession: true,
        noContextFiles: true,
        // Read-only local access
        tools: ["read", "grep", "find", "ls"],
        thinking: "low",
      });
    },
  });
}


