import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { WipWorktreeManager } from "./manager";

function parseArgs(raw: any): Record<string, any> {
  if (typeof raw === "object" && raw) return raw;
  const s = String(raw || "").trim();
  const out: Record<string, any> = {};
  for (const part of s.split(/\s+/)) {
    if (!part) continue;
    if (part.startsWith("--")) {
      const [k, v] = part.slice(2).split("=");
      out[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v ?? true;
      continue;
    }
    if (!out._) out._ = [];
    out._.push(part);
  }
  return out;
}

export default async function (pi: ExtensionAPI) {
  const workspaceRoot = "/Users/john.bresson/workspace";
  const mgr = new WipWorktreeManager(
    workspaceRoot,
    (cmd, args) => pi.exec(cmd, args),
    (p) => pi.readFile(p),
    (p, c) => pi.writeFile(p, c),
  );

  pi.registerCommand("wip-prepare", {
    description: "/wip-prepare <project> <issue> <slug> [--base <ref>]",
    handler: async (args) => {
      const a = parseArgs(args);
      const [project, issue, slug] = a._ || [];
      return mgr.wipPrepare({ project, issue, slug, base: a.base });
    },
  });

  pi.registerCommand("wip-list", {
    description: "/wip-list [project]",
    handler: async (args) => {
      const a = parseArgs(args);
      const [project] = a._ || [];
      return mgr.wipList({ project });
    },
  });

  pi.registerCommand("wip-status", {
    description: "/wip-status <project> <issue> <slug>",
    handler: async (args) => {
      const a = parseArgs(args);
      const [project, issue, slug] = a._ || [];
      return mgr.wipStatus({ project, issue, slug });
    },
  });

  pi.registerCommand("wip-graduate", {
    description: "/wip-graduate <project> <issue> <slug> --to <target-branch> [--no-squash] [--description=..] [--issue-link=..] [--no-prune]",
    handler: async (args) => {
      const a = parseArgs(args);
      const [project, issue, slug] = a._ || [];
      return mgr.wipGraduate({ project, issue, slug, to: a.to, noSquash: !!a.noSquash, description: a.description, issueLink: a.issueLink, noPrune: !!a.noPrune });
    },
  });

  pi.registerCommand("wip-prune", {
    description: "/wip-prune <project> <issue> <slug> [--force]",
    handler: async (args) => {
      const a = parseArgs(args);
      const [project, issue, slug] = a._ || [];
      return mgr.wipPrune({ project, issue, slug, force: !!a.force });
    },
  });

  pi.registerCommand("wip-seed", {
    description: "/wip-seed <project> <issue> <slug> <paths...> [--overwrite]",
    handler: async (args) => {
      const a = parseArgs(args);
      const arr = a._ || [];
      const [project, issue, slug, ...paths] = arr;
      return mgr.wipSeed({ project, issue, slug, paths, overwrite: !!a.overwrite });
    },
  });
}
