/**
 * safe_fetch.ts — Sandboxed HTTP fetch tool for research agents.
 *
 * Registers `web_fetch`: a GET-only, public-internet-only tool that
 * research sub-agents can use instead of bash for reading web content.
 *
 * Safety constraints enforced:
 *   - GET requests only
 *   - https:// and http:// only (no file://, ftp://, etc.)
 *   - Private/loopback IP ranges blocked
 *   - 10s timeout, 100KB response cap
 *   - No auth header forwarding
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const PRIVATE_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/i,
  /^169\.254\./,           // link-local
  /^0\.0\.0\.0$/,
  /\.local$/i,
  /\.internal$/i,
];

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_PATTERNS.some((p) => p.test(hostname));
}

const MAX_BYTES = 100_000;

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch (safe GET)",
    description:
      "Fetch a public URL via HTTP GET. Returns the response body as text (max 100KB). " +
      "Use for reading web pages, docs, APIs. No private/local URLs. No POST/PUT/DELETE.",
    promptSnippet: "web_fetch(url) → fetch a public URL and return its text body",
    parameters: Type.Object({
      url: Type.String({
        description: "Fully-qualified public URL to fetch (https:// or http://).",
      }),
      maxBytes: Type.Optional(
        Type.Number({
          description: `Max response bytes to return (default ${MAX_BYTES}, max ${MAX_BYTES}).`,
        })
      ),
    }),
    async execute(_id, params) {
      let parsed: URL;
      try {
        parsed = new URL(params.url);
      } catch {
        return {
          content: [{ type: "text", text: `Error: invalid URL '${params.url}'` }],
          isError: true,
        };
      }

      if (!["https:", "http:"].includes(parsed.protocol)) {
        return {
          content: [{ type: "text", text: `Error: only http/https allowed, got '${parsed.protocol}'` }],
          isError: true,
        };
      }

      if (isPrivateHost(parsed.hostname)) {
        return {
          content: [{ type: "text", text: `Error: private/local URLs are blocked ('${parsed.hostname}')` }],
          isError: true,
        };
      }

      const limit = Math.min(params.maxBytes ?? MAX_BYTES, MAX_BYTES);

      try {
        const response = await fetch(params.url, {
          method: "GET",
          headers: {
            "User-Agent": "keep-agent/research-buddy (safe-fetch)",
            "Accept": "text/html,text/plain,application/json,*/*",
          },
          signal: AbortSignal.timeout(10_000),
        });

        const contentType = response.headers.get("content-type") ?? "";
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer).slice(0, limit);
        const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        const truncated = buffer.byteLength > limit;

        return {
          content: [
            {
              type: "text",
              text:
                `[${response.status} ${response.statusText}] ${params.url}\n` +
                `Content-Type: ${contentType}\n` +
                (truncated ? `[truncated to ${limit} bytes of ${buffer.byteLength}]\n\n` : "\n") +
                text,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [{ type: "text", text: `Error fetching ${params.url}: ${err.message}` }],
          isError: true,
        };
      }
    },
  });
}
