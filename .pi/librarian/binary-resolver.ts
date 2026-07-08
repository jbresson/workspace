/**
 * BinaryResolver: Locate and validate lean-ctx binary
 * 
 * Handles:
 * - PATH resolution
 * - Binary validation
 * - Caching resolved path
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface BinaryResolutionResult {
  binary: string;
  isValid: boolean;
  error?: string;
}

export class BinaryResolver {
  private static cache: Map<string, BinaryResolutionResult> = new Map();

  /**
   * Resolve and validate lean-ctx binary location
   */
  static resolve(binaryName: string = 'lean-ctx'): BinaryResolutionResult {
    // Check cache first
    if (this.cache.has(binaryName)) {
      return this.cache.get(binaryName)!;
    }

    try {
      // Try `which` command
      const binary = execSync(`which ${binaryName}`, { encoding: 'utf8' }).trim();
      
      if (!binary) {
        const result: BinaryResolutionResult = {
          binary: '',
          isValid: false,
          error: `Binary not found in PATH: ${binaryName}`,
        };
        this.cache.set(binaryName, result);
        return result;
      }

      // Validate binary exists and is executable
      if (!fs.existsSync(binary)) {
        const result: BinaryResolutionResult = {
          binary,
          isValid: false,
          error: `Binary exists in which but not at filesystem: ${binary}`,
        };
        this.cache.set(binaryName, result);
        return result;
      }

      // Test binary is executable
      try {
        execSync(`${binary} --version`, { encoding: 'utf8', timeout: 5000 });
      } catch (e) {
        const result: BinaryResolutionResult = {
          binary,
          isValid: false,
          error: `Binary not executable or missing --version: ${e}`,
        };
        this.cache.set(binaryName, result);
        return result;
      }

      const result: BinaryResolutionResult = {
        binary,
        isValid: true,
      };
      this.cache.set(binaryName, result);
      return result;
    } catch (e) {
      const result: BinaryResolutionResult = {
        binary: '',
        isValid: false,
        error: `Error resolving binary: ${e}`,
      };
      this.cache.set(binaryName, result);
      return result;
    }
  }

  /**
   * Clear resolution cache (useful for testing)
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
