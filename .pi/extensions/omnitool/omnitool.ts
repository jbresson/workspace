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
  tool: ProxyToolDefinition;
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
        tool: toolDef,
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

