/**
 * LedgerManager: Atomic BUDDY.md ledger operations
 * 
 * Handles:
 * - Append-only ledger entries (no rewrites)
 * - Type-safe entry creation (draft, amend, knowledge, decision)
 * - Timestamp + provenance tracking
 * - Transaction log with ledger references
 */

import * as fs from 'fs';
import * as path from 'path';

export interface LedgerEntry {
  id: string;
  timestamp: string;
  type: 'draft' | 'amend' | 'knowledge' | 'decision' | 'finding' | 'uncertainty';
  scope: 'root' | 'repo';
  data: Record<string, any>;
}

export interface LedgerResponse {
  success: boolean;
  ledgerId: string;
  ledgerRef: string;
  error?: string;
}

export class LedgerManager {
  private ledgerPath: string;
  private ticketId?: string;

  constructor(ticketId?: string) {
    this.ticketId = ticketId;
    this.ledgerPath = ticketId
      ? `wip/${ticketId}/BUDDY.md`
      : 'wip/primary/BUDDY.md';
  }

  /**
   * Generate unique ledger entry ID
   */
  private generateLedgerId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Ensure ledger file exists
   */
  private ensureLedgerExists(): boolean {
    try {
      const dir = path.dirname(this.ledgerPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(this.ledgerPath)) {
        fs.writeFileSync(
          this.ledgerPath,
          `# 🤝 BUDDY.md - Librarian Ledger\n\n` +
          `**Ticket**: ${this.ticketId || 'root'}\n` +
          `**Initialized**: ${new Date().toISOString()}\n\n` +
          `## 📋 Transaction Log\n\n`
        );
      }
      return true;
    } catch (e) {
      console.error(`Error ensuring ledger exists: ${e}`);
      return false;
    }
  }

  /**
   * Format ledger entry as markdown
   */
  private formatEntry(entry: LedgerEntry): string {
    const lines = [
      `### [${entry.type.toUpperCase()}] ${entry.id}`,
      `- **Scope**: ${entry.scope}`,
      `- **Timestamp**: ${entry.timestamp}`,
    ];

    // Add data fields
    Object.entries(entry.data).forEach(([key, value]) => {
      const formatted = typeof value === 'object'
        ? JSON.stringify(value, null, 2).split('\n').join('\n  ')
        : value;
      lines.push(`- **${key}**: ${formatted}`);
    });

    lines.push(''); // Blank line separator
    return lines.join('\n');
  }

  /**
   * Append entry to ledger (atomic write-through)
   */
  async append(
    type: LedgerEntry['type'],
    data: Record<string, any>,
    scope: 'root' | 'repo' = 'root'
  ): Promise<LedgerResponse> {
    try {
      if (!this.ensureLedgerExists()) {
        return {
          success: false,
          ledgerId: '',
          ledgerRef: '',
          error: 'Failed to ensure ledger file exists',
        };
      }

      const ledgerId = this.generateLedgerId();
      const entry: LedgerEntry = {
        id: ledgerId,
        timestamp: new Date().toISOString(),
        type,
        scope,
        data,
      };

      const formatted = this.formatEntry(entry);

      // Append to ledger file
      fs.appendFileSync(this.ledgerPath, formatted);

      const ledgerRef = `${this.ledgerPath}#${ledgerId}`;

      return {
        success: true,
        ledgerId,
        ledgerRef,
      };
    } catch (e) {
      return {
        success: false,
        ledgerId: '',
        ledgerRef: '',
        error: `Failed to append to ledger: ${e}`,
      };
    }
  }

  /**
   * Create draft entry
   */
  async recordDraft(
    filePath: string,
    wipPath: string,
    mirror: boolean
  ): Promise<LedgerResponse> {
    return this.append('draft', {
      filePath,
      wipPath,
      mirror,
    });
  }

  /**
   * Create amend entry
   */
  async recordAmend(
    filePath: string,
    wipPath: string,
    changes: number
  ): Promise<LedgerResponse> {
    return this.append('amend', {
      filePath,
      wipPath,
      changeCount: changes,
    });
  }

  /**
   * Create finding entry (evidence-backed)
   */
  async recordFinding(
    finding: string,
    confidence: 'high' | 'medium' | 'low',
    evidence: string[]
  ): Promise<LedgerResponse> {
    return this.append('finding', {
      finding,
      confidence,
      evidence,
    });
  }

  /**
   * Create decision entry (with reversibility)
   */
  async recordDecision(
    decision: string,
    reasoning: string,
    reversible: boolean,
    rollbackPlan?: string
  ): Promise<LedgerResponse> {
    return this.append('decision', {
      decision,
      reasoning,
      reversible,
      rollbackPlan: rollbackPlan || 'N/A',
    });
  }

  /**
   * Get ledger file path
   */
  getLedgerPath(): string {
    return this.ledgerPath;
  }

  /**
   * Read ledger content
   */
  readLedger(): string | null {
    try {
      if (!fs.existsSync(this.ledgerPath)) {
        return null;
      }
      return fs.readFileSync(this.ledgerPath, 'utf-8');
    } catch (e) {
      console.error(`Error reading ledger: ${e}`);
      return null;
    }
  }
}
