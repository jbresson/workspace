import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

export interface ProxyToolDefinition {
  name: string;
  description?: string;
  parameters?: any;
  execute: (toolCallId: string, params: any, pi: any) => Promise<any>;
}

export interface RegistryEntry {
  key: string; // module.tool
  moduleId: string;
  toolName: string;
  description?: string;
  parameters?: any;
  execute: ProxyToolDefinition["execute"];
}

export interface RegistryBuildResult {
  entries: Map<string, RegistryEntry>;
  loadedModules: string[];
}

function readJsonArray(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendAudit(logPath: string, entry: Record<string, any>) {
  const dir = path.dirname(logPath);
  fs.mkdirSync(dir, { recursive: true });
  const prev = readJsonArray(logPath);
  prev.push({ timestamp: new Date().toISOString(), ...entry });
  fs.writeFileSync(logPath, JSON.stringify(prev, null, 2));
}

function extractManifest(mod: any): { tools?: Record<string, ProxyToolDefinition> } | null {
  if (mod?.manifest?.tools) return mod.manifest;
  if (mod?.default?.tools) return mod.default;
  if (mod?.tools) return mod;
  return null;
}

export async function buildRegistryFromExtensions(extensionsDir: string): Promise<RegistryBuildResult> {
  const entries = new Map<string, RegistryEntry>();
  const loadedModules: string[] = [];

  if (!fs.existsSync(extensionsDir)) {
    return { entries, loadedModules };
  }

  for (const dirent of fs.readdirSync(extensionsDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const moduleId = dirent.name;
    const moduleDir = path.join(extensionsDir, moduleId);

    const candidates = [
      path.join(moduleDir, "manifest.ts"),
      path.join(moduleDir, "index.ts"),
      path.join(moduleDir, "loader.ts"),
      path.join(moduleDir, "manifest.js"),
      path.join(moduleDir, "index.js"),
      path.join(moduleDir, "loader.js"),
    ];

    const entryFile = candidates.find((p) => fs.existsSync(p));
    if (!entryFile) continue;

    const mod = entryFile.endsWith(".js")
      ? (eval("require") as (id: string) => any)(entryFile)
      : await import(pathToFileURL(entryFile).href);
    const manifest = extractManifest(mod);
    if (!manifest?.tools) continue;

    loadedModules.push(moduleId);

    for (const [toolName, toolDef] of Object.entries(manifest.tools)) {
      const key = `${moduleId}.${toolName}`;
      if (entries.has(key)) {
        throw new Error(`Duplicate tool key detected: ${key}`);
      }
      entries.set(key, {
        key,
        moduleId,
        toolName,
        description: toolDef.description,
        parameters: toolDef.parameters,
        execute: toolDef.execute,
      });
    }
  }

  return { entries, loadedModules };
}

function ensureBuddy(pathToBuddy: string, content: string) {
  if (!fs.existsSync(pathToBuddy)) {
    fs.writeFileSync(pathToBuddy, content);
  }
}

function extractStatusFromBuddy(content: string): string {
  const m = content.match(/^STATUS:\s*(.+)$/m);
  return m ? m[1].trim() : "UNKNOWN";
}

export async function executeWipSubAction(
  wipRoot: string,
  params: { subAction: string; ticketId?: string; goals?: string; repos?: string[]; repoName?: string; justification?: string }
) {
  const { subAction } = params;

  if (subAction === "init") {
    if (!params.ticketId) throw new Error("wip.init requires ticketId");
    const ticketDir = path.join(wipRoot, params.ticketId);
    if (fs.existsSync(ticketDir)) throw new Error(`wip-issue already exists: ${params.ticketId}`);

    fs.mkdirSync(ticketDir, { recursive: true });
    fs.mkdirSync(path.join(ticketDir, ".archives"), { recursive: true });

    const rootBuddy = [
      "STATUS: IN_PROGRESS",
      "# TICKET LEDGER",
      "",
      `GOAL: ${params.goals || "(unset)"}`,
      "",
      "## REPOS",
    ].join("\n");

    fs.writeFileSync(path.join(ticketDir, "BUDDY.md"), rootBuddy);
    fs.writeFileSync(path.join(ticketDir, "tool_call.json"), "[]\n");

    for (const repo of params.repos || []) {
      const repoDir = path.join(ticketDir, repo);
      fs.mkdirSync(repoDir, { recursive: true });
      const repoBuddy = [
        "STATUS: IN_PROGRESS",
        `# REPO LEDGER: ${repo}`,
        "",
        "## NOTES",
        "- initialized",
      ].join("\n");
      fs.writeFileSync(path.join(repoDir, "BUDDY.md"), repoBuddy);
      fs.writeFileSync(path.join(repoDir, "tool_call.json"), "[]\n");
    }

    return { content: [{ type: "text", text: `initialized ${params.ticketId}` }], details: { ticketId: params.ticketId, repos: params.repos || [] } };
  }

  if (!params.ticketId) throw new Error(`wip.${subAction} requires ticketId`);
  const ticketDir = path.join(wipRoot, params.ticketId);
  if (!fs.existsSync(ticketDir)) throw new Error(`wip-issue not found: ${params.ticketId}`);

  if (subAction === "clone") {
    if (!params.repoName) throw new Error("wip.clone requires repoName");
    if (!params.justification?.trim()) throw new Error("wip.clone requires justification");

    const repoDir = path.join(ticketDir, params.repoName);
    if (fs.existsSync(repoDir)) throw new Error(`issue-repo already exists: ${params.repoName}`);

    fs.mkdirSync(repoDir, { recursive: true });

    const archiveDir = path.join(ticketDir, ".archives", params.repoName);
    const archivedBuddy = path.join(archiveDir, "BUDDY.md");
    const archivedCalls = path.join(archiveDir, "tool_call.json");

    if (fs.existsSync(archivedBuddy)) {
      fs.copyFileSync(archivedBuddy, path.join(repoDir, "BUDDY.md"));
    } else {
      fs.writeFileSync(
        path.join(repoDir, "BUDDY.md"),
        [
          "STATUS: IN_PROGRESS",
          `# REPO LEDGER: ${params.repoName}`,
          "",
          "## NOTES",
          `- clone justification: ${params.justification}`,
        ].join("\n")
      );
    }

    if (fs.existsSync(archivedCalls)) {
      fs.copyFileSync(archivedCalls, path.join(repoDir, "tool_call.json"));
    } else {
      fs.writeFileSync(path.join(repoDir, "tool_call.json"), "[]\n");
    }

    return { content: [{ type: "text", text: `cloned ${params.repoName} into ${params.ticketId}` }] };
  }

  // Intentionally no `wip.graduate` here.
  // Graduation must remain a user-command path (`/graduate <repo>`), not an agent-callable omnitool avenue.
  if (subAction === "status") {
    const repos = fs
      .readdirSync(ticketDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => d.name);

    const repoStatuses = repos.map((repo) => {
      const buddyPath = path.join(ticketDir, repo, "BUDDY.md");
      const status = fs.existsSync(buddyPath) ? extractStatusFromBuddy(fs.readFileSync(buddyPath, "utf8")) : "MISSING_LEDGER";
      return { repo, status };
    });

    const readyRepos = repoStatuses.filter((r) => r.status === "READY_FOR_GRADUATION").map((r) => r.repo);

    return {
      content: [{
        type: "text",
        text: `ticket=${params.ticketId}\nrepos=${repos.length}\nready=${readyRepos.join(",") || "none"}`,
      }],
      details: { ticketId: params.ticketId, repoStatuses, readyRepos },
    };
  }

  if (subAction === "abort") {
    fs.rmSync(ticketDir, { recursive: true, force: true });
    return { content: [{ type: "text", text: `aborted ${params.ticketId}` }] };
  }

  throw new Error(`Unknown wip subAction: ${subAction}`);
}
