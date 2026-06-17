/**
 * Constrained Executor
 * 
 * Executes shell commands with strict limits to prevent hangs and resource exhaustion.
 * Used by the Guardrail System to verify "Hard Proofs".
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
  error?: Error;
}

export class ConstrainedExecutor {
  private static DEFAULT_TIMEOUT = 10000; // 10 seconds
  private static MAX_BUFFER = 1024 * 1024; // 1MB

  /**
   * Executes a command with strict constraints.
   */
  static async execute(command: string, timeout: number = this.DEFAULT_TIMEOUT): Promise<ExecutionResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: timeout,
        maxBuffer: this.MAX_BUFFER,
      });

      return {
        exitCode: 0,
        stdout,
        stderr,
        success: true,
      };
    } catch (e: any) {
      // Handle execution errors (non-zero exit codes, timeouts, etc.)
      const exitCode = e.code || 1;
      const stdout = e.stdout || "";
      const stderr = e.stderr || e.message || "Unknown execution error";

      return {
        exitCode,
        stdout,
        stderr,
        success: false,
        error: e instanceof Error ? e : new Error(String(e)),
      };
    }
  }
}
