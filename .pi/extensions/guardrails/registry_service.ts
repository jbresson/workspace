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
  private registryPath = path.join(process.cwd(), '.pi/extensions/guardrails/expectations.jsonl');

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
    const active = entries.filter(e => 
      e.state === 'PENDING' && 
      (e.trigger === trigger || this.isTriggerMatch(trigger, e.trigger)) && 
      (e.scope === 'GLOBAL' || e.sessionId === sessionId)
    );
    console.log(`[CGS-LOG] findActive("${trigger}", "${sessionId}") -> found ${active.length} rules`);
    return active;
  }

  private isTriggerMatch(actionTarget: string, ruleTrigger: string): boolean {
    const absoluteTarget = path.isAbsolute(actionTarget) 
      ? actionTarget 
      : path.resolve(process.cwd(), actionTarget);

    if (ruleTrigger === 'forbidden_paths') {
      const forbidden = [
        path.join(process.env.HOME || '', '.ssh'), 
        path.join(process.env.HOME || '', '.aws'), 
        '/etc/passwd', 
        path.join(process.cwd(), '.git/hooks')
      ];
      return forbidden.some(p => absoluteTarget.includes(p));
    }
    if (ruleTrigger === 'audit_logs') {
      const auditPath = path.join(process.cwd(), '.pi/extensions/guardrails/');
      return absoluteTarget.startsWith(auditPath) || absoluteTarget.includes('decisions.log');
    }
    if (ruleTrigger === 'tool_abuse') {
      const tools = ['shell', 'bash', 'ctx_shell'];
      return tools.includes(actionTarget);
    }
    if (ruleTrigger === '.pi/') {
      const piPath = path.join(process.cwd(), '.pi/');
      return absoluteTarget.startsWith(piPath);
    }
    if (ruleTrigger === '/memory') {
      const memoryPath = path.join(process.cwd(), 'memory');
      return absoluteTarget.startsWith(memoryPath);
    }
    return false;
  }

  async clearRegistry(sessionId?: string): Promise<{ cleared: number }> {
    const all = await this.getAllEntries();
    if (!sessionId) {
      await fs.promises.writeFile(this.registryPath, '', 'utf8');
      return { cleared: all.length };
    }
    const filtered = all.filter(e => e.scope === 'GLOBAL' || e.sessionId !== sessionId);
    await fs.promises.writeFile(this.registryPath, filtered.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    return { cleared: all.length };
  }

  async getAllEntries(): Promise<Expectation[]> {
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

  async getExpectation(id: string): Promise<Expectation | null> {
    const entries = await this.getAllEntries();
    return entries.find(e => e.id === id) || null;
  }
}
