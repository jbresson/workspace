import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  appendAudit,
  buildRegistryFromExtensions,
} from "./omnitool";

function mkTmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("buildRegistryFromExtensions indexes module.tool keys", async () => {
  const root = mkTmp("omni-ext-");
  const modDir = path.join(root, "alpha");
  fs.mkdirSync(modDir, { recursive: true });
  fs.writeFileSync(
    path.join(modDir, "index.js"),
    `module.exports = { manifest: { tools: { ping: { description: 'Ping', execute: async () => ({ ok: true }) } } } };`
  );

  const built = await buildRegistryFromExtensions(root);
  assert.equal(built.entries.has("alpha.ping"), true);
});

test("appendAudit appends structured entries", () => {
  const root = mkTmp("omni-audit-");
  const logPath = path.join(root, "tool_call.json");

  appendAudit(logPath, { action: "call", status: "success" });
  appendAudit(logPath, { action: "list", status: "success" });

  const parsed = JSON.parse(fs.readFileSync(logPath, "utf8"));
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].action, "call");
  assert.equal(parsed[1].action, "list");
  assert.ok(parsed[0].timestamp);
});

// NOTE: Legacy wip ticket-based lifecycle tests (init/clone/status/abort with ticketId)
// have been removed. These tested the old file-mirror wip model which has been
// replaced by the EXT-010 git worktree backend. See:
//   .pi/extensions/omnitool/wip-manager/manager.test.ts  (27 tests for new model)
