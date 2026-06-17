import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  appendAudit,
  buildRegistryFromExtensions,
  executeWipSubAction,
} from "../subroutines/omnitool";

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

test("wip init/clone/status/abort lifecycle", async () => {
  const wipRoot = mkTmp("omni-wip-");

  await executeWipSubAction(wipRoot, {
    subAction: "init",
    ticketId: "ABC-123",
    goals: "Do thing",
    repos: ["repo-a"],
  });

  const ticketDir = path.join(wipRoot, "ABC-123");
  assert.equal(fs.existsSync(path.join(ticketDir, "BUDDY.md")), true);
  assert.equal(fs.existsSync(path.join(ticketDir, "repo-a", "BUDDY.md")), true);

  fs.writeFileSync(
    path.join(ticketDir, "repo-a", "BUDDY.md"),
    "STATUS: READY_FOR_GRADUATION\n# REPO LEDGER: repo-a"
  );

  const status = await executeWipSubAction(wipRoot, {
    subAction: "status",
    ticketId: "ABC-123",
  });

  assert.equal(status.details.readyRepos.includes("repo-a"), true);

  await executeWipSubAction(wipRoot, {
    subAction: "clone",
    ticketId: "ABC-123",
    repoName: "repo-b",
    justification: "needed for dependency",
  });

  assert.equal(fs.existsSync(path.join(ticketDir, "repo-b", "BUDDY.md")), true);

  await executeWipSubAction(wipRoot, {
    subAction: "abort",
    ticketId: "ABC-123",
  });

  assert.equal(fs.existsSync(ticketDir), false);
});

test("wip clone restores archived ledgers", async () => {
  const wipRoot = mkTmp("omni-restore-");

  await executeWipSubAction(wipRoot, {
    subAction: "init",
    ticketId: "ABC-124",
    goals: "Restore",
    repos: [],
  });

  const archiveDir = path.join(wipRoot, "ABC-124", ".archives", "repo-z");
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, "BUDDY.md"), "STATUS: IN_PROGRESS\n# REPO LEDGER: repo-z");
  fs.writeFileSync(path.join(archiveDir, "tool_call.json"), "[{\"x\":1}]");

  await executeWipSubAction(wipRoot, {
    subAction: "clone",
    ticketId: "ABC-124",
    repoName: "repo-z",
    justification: "reopen",
  });

  const clonedBuddy = fs.readFileSync(path.join(wipRoot, "ABC-124", "repo-z", "BUDDY.md"), "utf8");
  const clonedCalls = fs.readFileSync(path.join(wipRoot, "ABC-124", "repo-z", "tool_call.json"), "utf8");

  assert.equal(clonedBuddy.includes("repo-z"), true);
  assert.equal(clonedCalls.includes('"x":1'), true);
});
