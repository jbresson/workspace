import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { DocChange, GitCommit } from "./types";

export async function getModifiedDocs(cwd: string): Promise<DocChange[]> {
  try {
    // Get modified .md files from git
    const diffOutput = execSync("git diff --name-only HEAD", {
      cwd,
      encoding: "utf8",
    });

    const modifiedFiles = diffOutput
      .split("\n")
      .filter((f) => f.endsWith(".md") && f.trim().length > 0);

    const changes: DocChange[] = [];

    for (const file of modifiedFiles) {
      const fullPath = join(cwd, file);
      try {
        const currentContent = readFileSync(fullPath, "utf8");
        const unmodifiedContent = execSync(`git show HEAD:${file}`, {
          cwd,
          encoding: "utf8",
        });

        changes.push({
          path: file,
          currentContent,
          unmodifiedContent,
          isDiff: currentContent !== unmodifiedContent,
        });
      } catch (e) {
        // File may be new or deleted; skip
      }
    }

    return changes;
  } catch (e) {
    console.error("Failed to get modified docs:", e);
    return [];
  }
}

export async function fetchGitHistory(
  cwd: string,
  filePath: string,
  limit = 10
): Promise<GitCommit[]> {
  try {
    const output = execSync(
      `git log -p --follow -n${limit} --format="%H|%ai|%an|%s" -- ${filePath}`,
      {
        cwd,
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
      }
    );

    const commits: GitCommit[] = [];
    const lines = output.split("\n");
    let i = 0;

    while (i < lines.length) {
      const headerLine = lines[i];
      if (!headerLine.includes("|")) {
        i++;
        continue;
      }

      const [hash, date, author, ...messageParts] = headerLine.split("|");
      const message = messageParts.join("|");

      // Collect diff lines until next commit
      const diffLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].includes("|")) {
        diffLines.push(lines[i]);
        i++;
      }

      // Strip non-diff noise (only keep actual diff hunks)
      const cleanDiff = diffLines
        .filter((line) => line.startsWith("+") || line.startsWith("-") || line.startsWith("@@"))
        .join("\n");

      commits.push({
        hash: hash.trim(),
        date: date.trim(),
        author: author.trim(),
        message: message.trim(),
        diff: cleanDiff,
      });
    }

    return commits;
  } catch (e) {
    console.error(`Failed to fetch git history for ${filePath}:`, e);
    return [];
  }
}

export async function estimateTokens(text: string): Promise<number> {
  // Rough estimate: 1 token ≈ 4 characters (Claude tokenizer)
  return Math.ceil(text.length / 4);
}

export async function stripDiffNoise(diff: string): Promise<string> {
  // Keep only actual diff content (lines starting with +, -, @@)
  return diff
    .split("\n")
    .filter(
      (line) =>
        line.startsWith("+") ||
        line.startsWith("-") ||
        line.startsWith("@@") ||
        line.startsWith("---") ||
        line.startsWith("+++")
    )
    .join("\n");
}
