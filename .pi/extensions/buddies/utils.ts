/**
 * Shared utilities for keep-agent buddies.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Read the --inference-profile CLI flag and inject its params into the
 * provider request payload. Handles both standard and llama.cpp-specific params.
 *
 * Standard params (applied top-level): temperature, top_p, max_tokens,
 *   presence_penalty, frequency_penalty
 * LMStudio/llama.cpp extras (applied in extra_body): top_k, min_p, repeat_penalty
 */
export function applyInferenceProfile(pi: ExtensionAPI, payload: unknown): void {
  const raw = pi.getFlag("inference-profile") as string;
  if (!raw || raw === "{}") return;

  let params: Record<string, unknown>;
  try {
    params = JSON.parse(raw);
  } catch {
    return; // malformed JSON — silently ignore
  }

  if (typeof payload !== "object" || payload === null) return;
  const p = payload as Record<string, unknown>;

  for (const key of ["temperature", "top_p", "max_tokens", "presence_penalty", "frequency_penalty"]) {
    if (params[key] !== undefined) p[key] = params[key];
  }

  const extras: Record<string, unknown> = {};
  for (const key of ["top_k", "min_p", "repeat_penalty"]) {
    if (params[key] !== undefined) extras[key] = params[key];
  }
  if (Object.keys(extras).length > 0) {
    p["extra_body"] = { ...(p["extra_body"] as object ?? {}), ...extras };
  }
}
