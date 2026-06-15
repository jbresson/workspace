import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { getModifiedDocs, fetchGitHistory } from "./collector";
import { buildSourceContext } from "./context";
import { analyzeDocChanges, formatReviewResult } from "./analysis";
import { buildReviewPrompt } from "./prompt";
import type { ReviewResult } from "./types";

let state: { lastReviewResult?: ReviewResult } = {};

async function runDocReview(
  pi: ExtensionAPI,
  params: { forceModel?: boolean; budgetTokens?: number },
  ctx: any
): Promise<ReviewResult | { error: string }> {
  try {
    const cwd = ctx.cwd;
    const budget = params.budgetTokens || 30000;

    // Phase 1: Collect modified docs
    ctx.ui?.notify?.("Collecting modified docs...", "info");
    const modifiedDocs = await getModifiedDocs(cwd);

    if (modifiedDocs.length === 0) {
      return { error: "No modified .md files found" };
    }

    // Phase 2: Fetch git history
    ctx.ui?.notify?.(`Fetching history for ${modifiedDocs.length} docs...`, "info");
    const gitHistory = new Map();

    for (const doc of modifiedDocs) {
      const history = await fetchGitHistory(cwd, doc.path, 10);
      gitHistory.set(doc.path, history);
    }

    // Phase 3: Build source context
    ctx.ui?.notify?.("Loading source context (this may take a moment)...", "info");
    const sourceContext = await buildSourceContext(
      cwd,
      modifiedDocs.map((d) => d.path),
      budget
    );

    ctx.ui?.notify?.(
      `Loaded ${sourceContext.sources.length} sources (${sourceContext.tokensUsed}/${budget} tokens)`,
      "info"
    );

    // Phase 4: Build review prompt
    const reviewPrompt = buildReviewPrompt(modifiedDocs, sourceContext, gitHistory);

    // Phase 5: Call model with github-copilot + claude-haiku-4.5
    ctx.ui?.notify?.("Calling review model...", "info");

    const apiKey = process.env.GITHUB_TOKEN || process.env.COPILOT_API_KEY;
    if (!apiKey) {
      return { error: "github-copilot API key not configured (GITHUB_TOKEN or COPILOT_API_KEY)" };
    }

    let modelResponse = "";
    try {
      const response = await fetch("https://api.github.com/copilot/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          prompt: reviewPrompt,
          temperature: 0.5,
          max_tokens: 4096,
        }),
        signal: ctx.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `Model API error: ${response.status} ${errorText.substring(0, 100)}` };
      }

      const data = (await response.json()) as any;
      modelResponse = data.choices?.[0]?.text || data.completion || "";
    } catch (e) {
      ctx.ui?.notify?.("Model call failed, falling back to local analysis", "warning");
      modelResponse = "{}";
    }

    // Phase 6: Parse model response
    let parsedResult: ReviewResult;
    try {
      parsedResult = JSON.parse(modelResponse);
    } catch (e) {
      ctx.ui?.notify?.(
        "Model response was not valid JSON, falling back to local analysis",
        "warning"
      );
      const localFindings: any[] = [];
      for (const doc of modifiedDocs) {
        const history = gitHistory.get(doc.path) || [];
        const findings = await analyzeDocChanges({
          currentContent: doc.currentContent,
          unmodifiedContent: doc.unmodifiedContent,
          history,
          sourceContext: sourceContext.sources.map((s) => s.content).join("\n"),
          filePath: doc.path,
        });
        localFindings.push(...findings);
      }
      parsedResult = formatReviewResult(localFindings);
    }

    state.lastReviewResult = parsedResult;
    return parsedResult;
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { error: `Review failed: ${err}` };
  }
}

export default function (pi: ExtensionAPI) {
  // Register command
  pi.registerCommand("doc-review", {
    description:
      "Review modified documentation for detail loss, contradictions, and misalignment",
    handler: async (args, ctx) => {
      const result = await runDocReview(pi, {}, ctx);

      if ("error" in result) {
        ctx.ui.notify(`Error: ${result.error}`, "error");
        return;
      }

      const summary = result.summary;
      ctx.ui.notify(
        `Review complete: ${summary.contradictions} contradictions, ${summary.detail_losses} detail losses, ${summary.misalignments} misalignments, ${summary.improvements} improvements`,
        "info"
      );

      if (result.findings.length > 0) {
        ctx.ui.setEditorText(
          JSON.stringify(result, null, 2) + "\n\n" + JSON.stringify(result.findings, null, 2)
        );
      }
    },
  });

  // Register tool
  pi.registerTool({
    name: "doc_review_files",
    label: "Review Docs",
    description:
      "Review modified documentation for contradictions, detail loss, misalignment, and improvements",
    parameters: Type.Object({
      forceModel: Type.Optional(Type.Boolean({ description: "Force specific model" })),
      budgetTokens: Type.Optional(Type.Number({ description: "Token budget for sources" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      onUpdate?.({
        content: [{ type: "text", text: "Starting documentation review..." }],
      });

      const result = await runDocReview(pi, params, ctx);

      if ("error" in result) {
        throw new Error(result.error);
      }

      const text = JSON.stringify(result, null, 2);

      return {
        content: [{ type: "text", text }],
        details: result,
      };
    },
  });
}
