/**
 * research_buddy.ts
 *
 * Keep Research Agent. Handles !research <topic> notes.
 *
 * Responsibilities (all logic here, Python is pure orchestration):
 *   - Restricts outer session tools to keep_research only
 *   - Injects routing system prompt via before_agent_start
 *   - Reads --inference-profile flag and injects params via before_provider_request
 *   - Sub-agent has web_fetch + read/grep/ls (no bash)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { fileURLToPath } from "url";
import * as path from "path";
import { runBuddy } from "./runner";
import { applyInferenceProfile } from "./utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAFE_FETCH_PATH = path.join(__dirname, "safe_fetch.ts");

const SYSTEM_PROMPT = `\
You are an expert research analyst conducting deep, accurate research.

MISSION:
Research the given topic thoroughly. Use web_fetch to read web pages, docs, and APIs.
Cross-reference multiple sources. Do not fabricate facts — if uncertain, say so explicitly.

WEB RESEARCH STRATEGY:
1. Start with a few targeted web_fetch calls to authoritative sources (official docs, papers,
   news sources, RFCs). Construct search URLs manually or fetch known authoritative pages.
2. Fetch and read relevant content. Extract key facts, version numbers, caveats.
3. Cross-reference at least 3 sources where possible for factual claims.
4. Use read/grep/ls to check local project files for relevant prior art or context.

OUTPUT FORMAT — respond with exactly this markdown structure and nothing else:

## Conclusion
<One concise paragraph stating the answer or result. OMIT ENTIRELY for pure discovery topics.>

## Key Points
- <high-level bullet 1>
- <high-level bullet 2>
...

## Summary
<Multi-paragraph technical prose. Cover all findings in depth. Precise with versions, numbers, caveats.>

## Key Point Details
### <Key Point 1 verbatim>
<Why this is a key point. Specific technical details, numbers, edge cases, limitations.>

### <Key Point 2 verbatim>
...

## Sources
- [<Name>](<url>) — <one-line description>
...
(Use "Model Knowledge — <domain>" for training-data facts with no URL.)

## Further Questions
- <question> — <how to follow up, or how to apply this finding for self-improvement / practical use>
...
`;

export default function (pi: ExtensionAPI) {
  // Accept inference profile JSON from daemon via CLI flag
  pi.registerFlag("inference-profile", {
    description: "JSON object of inference parameters (temperature, top_p, etc.)",
    type: "string",
    default: "{}",
  });

  // Restrict outer session to only this tool — no bash, no read, nothing else
  pi.on("session_start", () => { pi.setActiveTools(["keep_research"]); });

  // Inject routing system prompt: outer pi's only job is to call keep_research
  pi.on("before_agent_start", (_event, _ctx) => {
    return {
      systemPrompt:
        "You have exactly one task: call the keep_research tool with the research topic " +
        "provided by the user. Call it immediately without any preamble or commentary.",
    };
  });

  pi.on("before_provider_request", (event) => {
    applyInferenceProfile(pi, event.payload);
  });

  pi.registerTool({
    name: "keep_research",
    label: "Keep: Research Topic",
    description:
      "Research a topic using web_fetch and local files. " +
      "Returns a structured report: Conclusion, Key Points, Summary, Key Point Details, Sources, Further Questions.",
    parameters: Type.Object({
      topic: Type.String({ description: "The research topic or question." }),
    }),
    async execute(_id, params) {
      return runBuddy({
        systemPrompt: SYSTEM_PROMPT,
        prompt: `Research the following topic and produce the full structured report:\n\n${params.topic}`,
        noSession: true,
        noContextFiles: true,
        // Safe tools only: web_fetch via safe_fetch extension + read/grep/ls for local context
        extensions: [SAFE_FETCH_PATH],
        tools: ["web_fetch", "read", "grep", "find", "ls"],
        thinking: "medium",
      });
    },
  });
}
