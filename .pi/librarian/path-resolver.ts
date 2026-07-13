/**
 * PathResolver: Enforce wip/ mirror logic for Canonical Intelligence
 *
 * Handles:
 * - Classification of paths (canonical vs. temp)
 * - wip/ mirror resolution
 * - Path validation (parent existence, permissions)
 * - Creation-only gate for draft operations
 * - EXT-010: Wip worktree path detection for AC-4 git-staging
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface PathResolutionResult {
  original: string;
  resolved: string;
  isMirror: boolean;
  isCanonical: boolean;
  error?: string;
}

/**
 * Info about a path inside a git worktree under ~/wip/<issue>/<repo>/
 * Used by LibrarianService to auto-stage files after draft/amend (AC-4).
 */
export interface WipWorktreeInfo {
  isWorktree: boolean;
  worktreeRoot?: string;  // e.g. /Users/john/wip/EXT-010/workspace
  relFile?: string;       // e.g. src/index.ts
}

export class PathResolver {
  /**
   * Define what paths are considered "Canonical Intelligence"
   * These must route to wip/ mirror
   */
  private static CANONICAL_ROOTS = [
    '.pi/extensions',
    '.pi/memory',
    '.pi/subroutines',
    'src/',
    'lib/',
    'memory/',
    'docs/',
  ];

  /**
   * Paths safe to write directly (not canonical)
   */
  private static TEMP_ROOTS = [
    'wip/',
    '.pi/logs',
    '.pi/settings',
    'tmp/',
    '.tmp/',
  ];

  /**
   * Determine if path is Canonical Intelligence
   */
  static isCanonicalPath(filePath: string): boolean {
    const normalized = path.normalize(filePath);
    return this.CANONICAL_ROOTS.some((root) => normalized.startsWith(root));
  }

  /**
   * Determine if path is safe temp/wip location
   */
  static isTempPath(filePath: string): boolean {
    const normalized = path.normalize(filePath);
    return this.TEMP_ROOTS.some((root) => normalized.startsWith(root));
  }

  /**
   * Resolve canonical path to its wip/ mirror
   */
  static toWipMirror(filePath: string): string {
    // If already in wip/, return as-is
    if (filePath.startsWith('wip/')) {
      return filePath;
    }

    // Construct mirror path
    // e.g., "src/index.ts" -> "wip/primary/src/index.ts"
    return `wip/primary/${filePath}`;
  }

  /**
   * Resolve path with full validation
   */
  static resolve(
    filePath: string,
    enforceWipForCanonical: boolean = true
  ): PathResolutionResult {
    try {
      const normalized = path.normalize(filePath);
      const isCanonical = this.isCanonicalPath(normalized);
      const isTemp = this.isTempPath(normalized);

      let resolved = normalized;
      let isMirror = false;

      // Enforce wip/ mirror for canonical paths
      if (isCanonical && enforceWipForCanonical) {
        resolved = this.toWipMirror(normalized);
        isMirror = true;
      } else if (!isTemp && !isCanonical) {
        // Path is neither canonical nor temp
        // This is a gray zone - allow but log
        isMirror = false;
      }

      return {
        original: filePath,
        resolved,
        isMirror,
        isCanonical,
      };
    } catch (e) {
      return {
        original: filePath,
        resolved: '',
        isMirror: false,
        isCanonical: false,
        error: `Error resolving path: ${e}`,
      };
    }
  }

  /**
   * Validate parent directory exists before write
   */
  static validateParentExists(filePath: string): boolean {
    try {
      const dir = path.dirname(filePath);
      return fs.existsSync(dir);
    } catch {
      return false;
    }
  }

  /**
   * Ensure parent directory exists (create if needed)
   */
  static ensureParentExists(filePath: string): boolean {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return true;
    } catch (e) {
      console.error(`Failed to ensure parent directory: ${e}`);
      return false;
    }
  }

  /**
   * Gate for draft operations: file must NOT exist
   */
  static checkCreateOnlyGate(filePath: string): { allowed: boolean; reason?: string } {
    try {
      if (fs.existsSync(filePath)) {
        return {
          allowed: false,
          reason: `File already exists; use amend instead: ${filePath}`,
        };
      }
      return { allowed: true };
    } catch (e) {
      return {
        allowed: false,
        reason: `Error checking file existence: ${e}`,
      };
    }
  }

  /**
   * Get canonical path from wip mirror
   */
  static fromWipMirror(wipPath: string): string {
    // e.g., "wip/primary/src/index.ts" -> "src/index.ts"
    return wipPath.replace(/^wip\/primary\//, '');
  }

  /**
   * EXT-010 AC-4: Detect if a path is inside a git worktree at ~/wip/<issue>/<repo>/
   *
   * Structure: ~/wip/<issue>/<repo>/<relFile>
   *   - <issue> must match [A-Z]+-[0-9]+ (at least one path segment before repo)
   *   - <repo> is the second segment after ~/wip/
   *   - <relFile> is everything after ~/wip/<issue>/<repo>/
   *
   * Returns { isWorktree: false } for paths NOT under ~/wip/<issue>/<repo>/
   * Returns { isWorktree: true, worktreeRoot, relFile } for paths inside a worktree.
   *
   * Non-fatal: if home dir cannot be resolved, returns { isWorktree: false }.
   */
  static getWipWorktreeInfo(filePath: string): WipWorktreeInfo {
    try {
      const wipBase = path.join(os.homedir(), 'wip');
      const absPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(filePath);

      // Must start with ~/wip/ + separator
      if (!absPath.startsWith(wipBase + path.sep)) {
        return { isWorktree: false };
      }

      // Strip wipBase/ → e.g. "EXT-010/workspace/src/index.ts"
      const rel = absPath.slice(wipBase.length + 1);
      const parts = rel.split(path.sep);

      // Need at least: <issue>/<repo>/<file>
      if (parts.length < 3) return { isWorktree: false };

      const [issue, repo, ...fileParts] = parts;

      // Validate issue format to avoid false positives (e.g. BUDDY.md at ticket root)
      if (!/^[A-Z][A-Z0-9]*-[0-9]+$/.test(issue)) return { isWorktree: false };
      if (!repo || fileParts.length === 0) return { isWorktree: false };

      return {
        isWorktree: true,
        worktreeRoot: path.join(wipBase, issue, repo),
        relFile: fileParts.join(path.sep),
      };
    } catch {
      return { isWorktree: false };
    }
  }
}

export default PathResolver;
