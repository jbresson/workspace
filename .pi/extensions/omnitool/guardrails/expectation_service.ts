import * as fs from 'fs';
import * as path from 'path';

export type ExpectationState = 'PENDING' | 'RESOLVED' | 'REJECTED' | 'EXPIRED';
export type ValidationType = 'MANUAL' | 'CONSTRAINED_CMD' | 'SANDBOXED_TS';

export interface Expectation {
  id: string;
  trigger: string; // File path or tool name
  condition: string;
  description?: string; // Added for compatibility with skeptic_auditor and negotiation_manager
  state: ExpectationState;
  validationType: ValidationType;
  proof: string | null;
  timestamp: number;
  sessionId: string;
  scope: 'GLOBAL' | 'SESSION';
  metadata?: Record<string, any>;
}

export class ExpectationService {
  private expectationPath = path.join(process.cwd(), '.pi/extensions/omnitool/guardrails/expectations.jsonl');

  async issueExpectation(sessionId: string, exp: Omit<Expectation, 'timestamp' | 'state' | 'sessionId'>): Promise<Expectation> {
    const expectation: Expectation = {
      ...exp,
      sessionId,
      state: 'PENDING',
      timestamp: Date.now(),
    };
    await this.appendEntry(expectation);
    return expectation;
  }

  private async appendEntry(entry: Expectation): Promise<void> {
    await fs.promises.appendFile(this.expectationPath, JSON.stringify(entry) + '\n', 'utf8');
  }

  async updateState(sessionId: string, id: string, state: ExpectationState, proof: string | null = null): Promise<boolean> {
    const entries = await this.getAllEntries();
    let found = false;
    const updatedEntries = entries.map(entry => {
      if (entry.id === id && entry.sessionId === sessionId) {
        found = true;
        return { ...entry, state, proof: proof ?? entry.proof };
      }
      return entry;
    });

    if (found) {
      await fs.promises.writeFile(this.expectationPath, updatedEntries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    }
    return found;
  }

  async findActive(sessionId: string, toolName: string, toolParams: any): Promise<Expectation[]> {
    const entries = await this.getAllEntries();
    
    // Bypass logic: If the tool is intended to resolve a guardrail block, do not let expectations block it.
    const resolutionTools = ['resolve_guardrail', 'negotiate_guardrail'];
    if (resolutionTools.includes(toolName)) {
      return [];
    }

    return entries.filter(e => 
      e.state === 'PENDING' && 
      (e.scope === 'GLOBAL' || e.sessionId === sessionId) &&
      this.isTriggerMatch(toolName, toolParams, e.trigger)
    );
  }

  private isTriggerMatch(toolName: string, toolParams: any, ruleTrigger: string): boolean {
    if (ruleTrigger === toolName) return true;
    const p = toolParams?.path || toolParams?.filePath || '';
    if (p && p.includes(ruleTrigger)) return true;
    return false;
  }

  async clearRegistry(sessionId?: string): Promise<{ cleared: number }> {
    const all = await this.getAllEntries();
    if (!sessionId) {
      await fs.promises.writeFile(this.expectationPath, '', 'utf8');
      return { cleared: all.length };
    }
    const filtered = all.filter(e => e.scope === 'GLOBAL' || e.sessionId !== sessionId);
    await fs.promises.writeFile(this.expectationPath, filtered.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    return { cleared: all.length };
  }

  async updateMetadata(sessionId: string, id: string, metadata: Record<string, any>): Promise<boolean> {
    const entries = await this.getAllEntries();
    let found = false;
    const updatedEntries = entries.map(entry => {
      if (entry.id === id && entry.sessionId === sessionId) {
        found = true;
        return { ...entry, metadata: { ...entry.metadata, ...metadata } };
      }
      return entry;
    });

    if (found) {
      await fs.promises.writeFile(this.expectationPath, updatedEntries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    }
    return found;
  }

  async getAllEntries(): Promise<Expectation[]> {
    try {
      const content = await fs.promises.readFile(this.expectationPath, 'utf8');
      return content
        .trim()
        .split('\n')
        .filter(line => line)
        .map(line => JSON.parse(line));
    } catch (e) {
      return [];
    }
  }

  async getExpectation(sessionId: string, id: string): Promise<Expectation | null> {
    const entries = await this.getAllEntries();
    return entries.find(e => e.id === id && e.sessionId === sessionId) || null;
  }
}