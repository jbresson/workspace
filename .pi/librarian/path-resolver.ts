/**
 * PathResolver: Enforce wip/ mirror logic for Canonical Intelligence
 * 
 * Handles:
 * - Classification of paths (canonical vs. temp)
 * - wip/ mirror resolution
 * - Path validation (parent existence, permissions)
 * - Creation-only gate for draft operations
 */

import * as path from 'path';
import * as fs from 'fs';

export interface PathResolutionResult {
  original: string;
  resolved: string;
  isMirror: boolean;
  isCanonical: boolean;
  error?: string;
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
}
