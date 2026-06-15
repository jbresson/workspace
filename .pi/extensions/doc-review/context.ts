import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { SourceContext } from "./types";
import { estimateTokens } from "./collector";

interface SourceFile {
  path: string;
  content: string;
  priority: number;
}

async function findMarkdownFiles(dir: string): Promise<SourceFile[]> {
  const files: SourceFile[] = [];

  function walk(current: string, priority: number) {
    if (!existsSync(current)) return;

    try {
      const entries = readdirSync(current, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(current, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          walk(fullPath, priority);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          try {
            const content = readFileSync(fullPath, "utf8");
            files.push({
              path: fullPath,
              content,
              priority,
            });
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }

  walk(dir, 1);
  return files;
}

export async function buildSourceContext(
  cwd: string,
  modifiedFilePaths: string[],
  budget = 30000
): Promise<SourceContext> {
  const sources: SourceFile[] = [];
  let tokensUsed = 0;

  // Priority 1: Mandates and rigor baseline
  const mandatePaths = [
    join(cwd, "memory/mindbase/identity/MANDATES.md"),
    join(cwd, "memory/mindbase/identity/RIGOR_BASELINE.md"),
  ];

  for (const p of mandatePaths) {
    if (existsSync(p) && tokensUsed < budget) {
      try {
        const content = readFileSync(p, "utf8");
        const tokens = await estimateTokens(content);
        if (tokensUsed + tokens <= budget) {
          sources.push({ path: p, content, priority: 1 });
          tokensUsed += tokens;
        }
      } catch (e) {
        // Skip
      }
    }
  }

  // Priority 2: Processes
  const processDir = join(cwd, "memory/mindbase/processes");
  const processFiles = await findMarkdownFiles(processDir);
  for (const file of processFiles) {
    if (tokensUsed < budget) {
      const tokens = await estimateTokens(file.content);
      if (tokensUsed + tokens <= budget) {
        sources.push({ ...file, priority: 2 });
        tokensUsed += tokens;
      }
    }
  }

  // Priority 3: Knowledge base (decisions, projects)
  const knowledgeDir = join(cwd, "memory/knowledgebase");
  const knowledgeFiles = await findMarkdownFiles(knowledgeDir);
  for (const file of knowledgeFiles) {
    if (tokensUsed < budget) {
      const tokens = await estimateTokens(file.content);
      if (tokensUsed + tokens <= budget) {
        sources.push({ ...file, priority: 3 });
        tokensUsed += tokens;
      }
    }
  }

  // Priority 4: Skills
  const skillsDir = join(cwd, "memory/mindbase/skills");
  const skillFiles = await findMarkdownFiles(skillsDir);
  for (const file of skillFiles) {
    if (tokensUsed < budget) {
      const tokens = await estimateTokens(file.content);
      if (tokensUsed + tokens <= budget) {
        sources.push({ ...file, priority: 4 });
        tokensUsed += tokens;
      }
    }
  }

  // Priority 5: Modified doc references (contextual)
  for (const modPath of modifiedFilePaths) {
    if (tokensUsed >= budget) break;

    // Look for related docs in memory
    const relatedSearch = join(
      cwd,
      "memory",
      modPath.replace(/\.md$/, "*").replace(/\//g, "/")
    );

    // (Simplified; in production would use glob)
  }

  // Priority 6: .pi/ extension docs
  const piExtDir = join(cwd, ".pi/extensions");
  if (existsSync(piExtDir)) {
    const piFiles = await findMarkdownFiles(piExtDir);
    for (const file of piFiles) {
      if (tokensUsed < budget) {
        const tokens = await estimateTokens(file.content);
        if (tokensUsed + tokens <= budget) {
          sources.push({ ...file, priority: 6 });
          tokensUsed += tokens;
        }
      }
    }
  }

  // Priority 7: Pi SDK docs
  const sdkDocPaths = [
    "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs",
    "/usr/local/lib/node_modules/@earendil-works/pi-coding-agent/docs",
  ];

  for (const sdkPath of sdkDocPaths) {
    if (existsSync(sdkPath) && tokensUsed < budget) {
      const sdkFiles = await findMarkdownFiles(sdkPath);
      for (const file of sdkFiles) {
        if (tokensUsed < budget) {
          const tokens = await estimateTokens(file.content);
          if (tokensUsed + tokens <= budget) {
            sources.push({ ...file, priority: 7 });
            tokensUsed += tokens;
          }
        }
      }
      break; // Only check first valid path
    }
  }

  // Priority 8: Remaining memory files
  const remainingDir = join(cwd, "memory");
  const remainingFiles = await findMarkdownFiles(remainingDir);
  for (const file of remainingFiles) {
    if (
      tokensUsed < budget &&
      !sources.some((s) => s.path === file.path)
    ) {
      const tokens = await estimateTokens(file.content);
      if (tokensUsed + tokens <= budget) {
        sources.push({ ...file, priority: 8 });
        tokensUsed += tokens;
      }
    }
  }

  return {
    sources: sources.map((s) => ({
      path: s.path,
      content: s.content,
      priority: s.priority,
    })),
    tokensUsed,
    budget,
  };
}

export async function loadMemoryIndex(cwd: string): Promise<string> {
  const manifestPath = join(cwd, "memory/MANIFEST.md");
  if (existsSync(manifestPath)) {
    return readFileSync(manifestPath, "utf8");
  }
  return "";
}
