import * as fs from 'fs';
import * as path from 'path';

export type ExpectationState = 'PENDING' | 'RESOLVED' | 'REJECTED' | 'EXPIRED';
export type ValidationType = 'MANUAL' | 'CONSTRAINED_CMD' | 'SANDBOXED_TS';

export interface Expectation {
  id: string;
  trigger: string; // File path or tool name
  condition: string;
  state: ExpectationState;
  validationType: ValidationType;
  proof: string | null;
  timestamp: number;
  sessionId: string;
  scope: 'GLOBAL' | 'SESSION';
  metadata?: Record<string, any>;
}

export class RegistryService {
  private registryPath = path.join(process.cwd(), '.pi/registry/expectations.jsonl');

  async issueExpectation(exp: Omit<Expectation, 'timestamp' | 'state'>): Promise<Expectation> {
    const expectation: Expectation = {
      ...exp,
      state: 'PENDING',
      timestamp: Date.now(),
    };
    
    await this.appendEntry(expectation);
    return expectation;
  }

  private async appendEntry(entry: Expectation): Promise<void> {
    await fs.promises.appendFile(this.registryPath, JSON.stringify(entry) + '\n', 'utf8');
  }

  async updateState(id: string, state: ExpectationState, proof: string | null = null): Promise<boolean> {
    const entries = await this.getAllEntries();
    let found = false;
    
    const updatedEntries = entries.map(entry => {
      if (entry.id === id) {
        found = true;
        return { ...entry, state, proof: proof ?? entry.proof };
      }
      return entry;
    });

    if (found) {
      await fs.promises.writeFile(this.registryPath, updatedEntries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    }
    
    return found;
  }

  async findActive(trigger: string, sessionId: string): Promise<Expectation[]> {
    const entries = await this.getAllEntries();
    return entries.filter(e => 
      e.state === 'PENDING' && 
      e.trigger === trigger && 
      (e.scope === 'GLOBAL' || e.sessionId === sessionId)
    );
  }

  private async getAllEntries(): Promise<Expectation[]> {
    try {
      const content = await fs.promises.readFile(this.registryPath, 'utf8');
      return content
        .trim()
        .split('\n')
        .filter(line => line)
        .map(line => JSON.parse(line));
    } catch (e) {
      return [];
    }
  }
}
