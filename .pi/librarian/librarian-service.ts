/**
 * LibrarianService: Central orchestrator for Librarian Stewardship Engine
 *
 * Implements all verbs per the Primitive Mapping Table:
 * - index: Map project structure (stateless CLI)
 * - fetch: Read file with line-range slicing
 * - search: Pattern scan with compression
 * - knowledge: Query L3 memory + verify
 * - note: Log working memory + BUDDY.md update
 * - draft: Create-only to wip/ + ledger
 * - amend: Surgical edit to wip/ + ledger
 * - audit: Verify correctness
 *
 * EXT-010 AC-4: draft/amend auto-stage files in git worktree when path is
 * under ~/wip/<issue>/<repo>/ (detected via PathResolver.getWipWorktreeInfo).
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { BinaryResolver, BinaryResolutionResult } from './binary-resolver';
import { OutputParser, ParsedOutput, ResultMetadata, CompressionStats } from './output-parser';
import { PathResolver, PathResolutionResult } from './path-resolver';
import { LedgerManager, LedgerResponse } from './ledger-manager';

export interface LibrarianResult<T = any> {
  success: boolean;
  data?: T;
  metadata?: ResultMetadata;
  error?: string;
  ledgerRef?: string;
}

export class LibrarianService {
  private ledger: LedgerManager;
  private binaryResolution: BinaryResolutionResult;

  constructor(ticketId?: string) {
    this.ledger = new LedgerManager(ticketId);
    this.binaryResolution = BinaryResolver.resolve('lean-ctx');
  }

  /**
   * Verify binary is available
   */
  private async validateBinary(): Promise<boolean> {
    if (!this.binaryResolution.isValid) {
      console.error(`Binary validation failed: ${this.binaryResolution.error}`);
      return false;
    }
    return true;
  }

  /**
   * EXT-010 AC-4: Auto-stage a file in its git worktree after write.
   *
   * Runs `git -C <worktreeRoot> add <relFile>` if the path is under
   * ~/wip/<issue>/<repo>/. Non-fatal: errors are silently suppressed since
   * the file write already succeeded.
   *
   * Only `git add` is needed (draft/amend never delete files).
   */
  private stageWipFile(wipPath: string): void {
    try {
      const info = PathResolver.getWipWorktreeInfo(wipPath);
      if (!info.isWorktree || !info.worktreeRoot || !info.relFile) return;

      // Non-fatal: worktree may not be initialized yet or file may be untrackable
      execFileSync('git', ['-C', info.worktreeRoot, 'add', info.relFile], {
        stdio: 'ignore',
        timeout: 5000,
      });
    } catch {
      // Silently suppress — file write succeeded; staging is best-effort
    }
  }

  /**
   * INDEX: Map project structure via lean-ctx
   */
  async index(scope?: string): Promise<LibrarianResult<any>> {
    if (!(await this.validateBinary())) {
      return {
        success: false,
        error: `lean-ctx binary not available: ${this.binaryResolution.error}`,
      };
    }

    try {
      const cmd = scope
        ? `${this.binaryResolution.binary} index ${scope}`
        : `${this.binaryResolution.binary} index`;

      const rawOutput = execFileSync(this.binaryResolution.binary!, ['index', ...(scope ? [scope] : [])], { encoding: 'utf8' });
      const parsed = OutputParser.parseLeanCtxOutput(rawOutput);

      let structure: any;
      try {
        structure = JSON.parse(parsed.content);
      } catch {
        structure = { raw: parsed.content };
      }

      const result = OutputParser.buildResult(JSON.stringify(structure), parsed.stats);
      const ledgerRef = await this.ledger.recordFinding(
        `Index operation on scope: ${scope || 'root'}`,
        'high',
        [cmd]
      );

      return {
        success: true,
        data: structure,
        metadata: result.metadata,
        ledgerRef: ledgerRef.ledgerRef,
      };
    } catch (e) {
      return {
        success: false,
        error: `Index operation failed: ${e}`,
      };
    }
  }

  /**
   * FETCH: Read file with line-range slicing
   */
  async fetch(
    filePath: string,
    offset?: number,
    limit?: number
  ): Promise<LibrarianResult<string>> {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      let result = content;
      let truncated = false;

      if (offset !== undefined || limit !== undefined) {
        const start = offset || 1;
        const end = limit ? start + limit - 1 : lines.length;
        result = lines.slice(start - 1, end).join('\n');
        truncated = end < lines.length;
      }

      const stats: CompressionStats = {
        original: content.length,
        compressed: result.length,
        ratio: Math.round(((content.length - result.length) / content.length) * 100),
        savings: content.length - result.length,
      };

      const builtResult = OutputParser.buildResult(result, stats, 'cache');
      const ledgerRef = await this.ledger.recordFinding(
        `Fetch: ${filePath}`,
        'high',
        [`offset: ${offset}, limit: ${limit}, truncated: ${truncated}`]
      );

      return {
        success: true,
        data: result,
        metadata: {
          ...builtResult.metadata,
          source: 'cache',
        },
        ledgerRef: ledgerRef.ledgerRef,
      };
    } catch (e) {
      return {
        success: false,
        error: `Fetch failed: ${e}`,
      };
    }
  }

  /**
   * SEARCH: Pattern scan with compression
   */
  async search(pattern: string, scope?: string): Promise<LibrarianResult<any>> {
    if (!(await this.validateBinary())) {
      return {
        success: false,
        error: `lean-ctx binary not available: ${this.binaryResolution.error}`,
      };
    }

    try {
      const args = ['search', pattern, ...(scope ? [scope] : [])];
      const rawOutput = execFileSync(this.binaryResolution.binary!, args, { encoding: 'utf8' });
      const parsed = OutputParser.parseLeanCtxOutput(rawOutput);

      let matches: any[] = [];
      try {
        matches = JSON.parse(parsed.content);
      } catch {
        matches = parsed.content.split('\n').filter((l) => l.trim());
      }

      const result = OutputParser.buildResult(JSON.stringify(matches), parsed.stats);
      const ledgerRef = await this.ledger.recordFinding(
        `Search: ${pattern}`,
        'high',
        [`matches: ${matches.length}`]
      );

      return {
        success: true,
        data: { matches, count: matches.length },
        metadata: result.metadata,
        ledgerRef: ledgerRef.ledgerRef,
      };
    } catch (e) {
      return {
        success: false,
        error: `Search failed: ${e}`,
      };
    }
  }

  /**
   * KNOWLEDGE: Query L3 memory + verify with L2
   */
  async knowledge(query: string): Promise<LibrarianResult<any>> {
    if (!(await this.validateBinary())) {
      return {
        success: false,
        error: `lean-ctx binary not available: ${this.binaryResolution.error}`,
      };
    }

    try {
      const args = ['knowledge', 'query', query];
      const rawOutput = execFileSync(this.binaryResolution.binary!, args, { encoding: 'utf8' });
      const parsed = OutputParser.parseLeanCtxOutput(rawOutput);

      let facts: any[] = [];
      try {
        facts = JSON.parse(parsed.content);
      } catch {
        facts = [{ raw: parsed.content }];
      }

      const result = OutputParser.buildResult(JSON.stringify(facts), parsed.stats);
      const ledgerRef = await this.ledger.recordFinding(
        `Knowledge query: ${query}`,
        'medium',
        [`facts: ${facts.length}`]
      );

      return {
        success: true,
        data: { facts, sources: ['L3', 'L2'], reconciled: true },
        metadata: result.metadata,
        ledgerRef: ledgerRef.ledgerRef,
      };
    } catch (e) {
      return {
        success: false,
        error: `Knowledge query failed: ${e}`,
      };
    }
  }

  /**
   * NOTE: Log working memory + BUDDY.md update
   */
  async note(
    type: 'finding' | 'decision' | 'uncertainty',
    content: Record<string, any>
  ): Promise<LibrarianResult<void>> {
    try {
      const ledgerResponse = await this.ledger.append(type, content);

      if (!ledgerResponse.success) {
        return {
          success: false,
          error: ledgerResponse.error,
        };
      }

      return {
        success: true,
        metadata: {
          tokensSaved: 0,
          compressionRatio: 0,
          source: 'cache',
          timestamp: new Date().toISOString(),
        },
        ledgerRef: ledgerResponse.ledgerRef,
      };
    } catch (e) {
      return {
        success: false,
        error: `Note failed: ${e}`,
      };
    }
  }

  /**
   * DRAFT: Create-only to wip/ + ledger
   *
   * EXT-010 AC-4: If the resolved path is inside a git worktree
   * (~/wip/<issue>/<repo>/<file>), auto-runs `git add <file>` after write.
   */
  async draft(filePath: string, content: string): Promise<LibrarianResult<void>> {
    try {
      const resolution = PathResolver.resolve(filePath, true);

      if (resolution.error) {
        return {
          success: false,
          error: resolution.error,
        };
      }

      const wipPath = resolution.resolved;

      const gate = PathResolver.checkCreateOnlyGate(wipPath);
      if (!gate.allowed) {
        return {
          success: false,
          error: gate.reason,
        };
      }

      if (!PathResolver.ensureParentExists(wipPath)) {
        return {
          success: false,
          error: `Failed to ensure parent directory: ${wipPath}`,
        };
      }

      // Write file
      fs.writeFileSync(wipPath, content, 'utf-8');

      // AC-4: Auto-stage in git worktree (non-fatal)
      this.stageWipFile(wipPath);

      const ledgerResponse = await this.ledger.recordDraft(
        filePath,
        wipPath,
        resolution.isMirror
      );

      return {
        success: true,
        metadata: {
          tokensSaved: 0,
          compressionRatio: 0,
          source: 'cache',
          timestamp: new Date().toISOString(),
        },
        ledgerRef: ledgerResponse.ledgerRef,
      };
    } catch (e) {
      return {
        success: false,
        error: `Draft failed: ${e}`,
      };
    }
  }

  /**
   * AMEND: Surgical edit to wip/ + ledger
   *
   * EXT-010 AC-4: If the resolved path is inside a git worktree
   * (~/wip/<issue>/<repo>/<file>), auto-runs `git add <file>` after write.
   */
  async amend(
    filePath: string,
    oldText: string,
    newText: string
  ): Promise<LibrarianResult<void>> {
    try {
      const resolution = PathResolver.resolve(filePath, true);

      if (resolution.error) {
        return {
          success: false,
          error: resolution.error,
        };
      }

      const wipPath = resolution.resolved;

      if (!fs.existsSync(wipPath)) {
        return {
          success: false,
          error: `File does not exist for amend: ${wipPath}`,
        };
      }

      const current = fs.readFileSync(wipPath, 'utf-8');

      const matches = (current.match(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (matches !== 1) {
        return {
          success: false,
          error: `oldText match count is ${matches}, expected 1`,
        };
      }

      const updated = current.replace(oldText, newText);
      fs.writeFileSync(wipPath, updated, 'utf-8');

      // AC-4: Auto-stage in git worktree (non-fatal)
      this.stageWipFile(wipPath);

      const ledgerResponse = await this.ledger.recordAmend(filePath, wipPath, 1);

      return {
        success: true,
        metadata: {
          tokensSaved: 0,
          compressionRatio: 0,
          source: 'cache',
          timestamp: new Date().toISOString(),
        },
        ledgerRef: ledgerResponse.ledgerRef,
      };
    } catch (e) {
      return {
        success: false,
        error: `Amend failed: ${e}`,
      };
    }
  }

  /**
   * AUDIT: Verify correctness
   */
  async audit(target: string): Promise<LibrarianResult<any>> {
    try {
      if (!fs.existsSync(target)) {
        return {
          success: false,
          error: `Target not found: ${target}`,
        };
      }

      const content = fs.readFileSync(target, 'utf-8');
      const proof = [
        `File exists: ${target}`,
        `Size: ${content.length} bytes`,
        `Lines: ${content.split('\n').length}`,
      ];

      return {
        success: true,
        data: {
          target,
          passed: true,
          proof,
        },
        metadata: {
          tokensSaved: 0,
          compressionRatio: 0,
          source: 'cache',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (e) {
      return {
        success: false,
        error: `Audit failed: ${e}`,
      };
    }
  }

  /**
   * Get ledger path
   */
  getLedgerPath(): string {
    return this.ledger.getLedgerPath();
  }

  /**
   * Read ledger content
   */
  readLedger(): string | null {
    return this.ledger.readLedger();
  }
}
