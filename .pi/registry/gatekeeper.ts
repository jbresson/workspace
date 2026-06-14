import { RegistryService, Expectation } from './registry_service';
import GuardrailConfig, { GuardrailMode } from './config';

export enum SafetyMode {
  PRESENT = 'PRESENT',
  AFK = 'AFK'
}

export interface GatekeeperConfig {
  sessionId: string;
  mode: SafetyMode;
}

export class Gatekeeper {
  constructor(
    private registry: RegistryService,
    private config: GatekeeperConfig
  ) {}

  async intercept(actionTarget: string): Promise<{ allowed: boolean, expectations: Expectation[] }> {
    const globalConfig = GuardrailConfig.getInstance();
    const currentMode = globalConfig.getMode();

    // 1. Bootstrap Exception: Never block system-critical paths
    if (actionTarget.startsWith('.pi/') || actionTarget === 'todo.md') {
      return { allowed: true, expectations: [] };
    }

    // 2. Check Global Mode
    if (currentMode === GuardrailMode.OFF) {
      return { allowed: true, expectations: [] };
    }

    const active = await this.registry.findActive(actionTarget, this.config.sessionId);
    
    if (active.length === 0) {
      return { allowed: true, expectations: [] };
    }

    // 3. Handle DEBUG vs ENFORCE
    if (currentMode === GuardrailMode.DEBUG) {
      console.warn(`[GUARDRAIL-DEBUG] Action to ${actionTarget} would be blocked by: ${active.map(e => e.id).join(', ')}`);
      return { allowed: true, expectations: active };
    }

    // ENFORCE mode: Hard block
    return { allowed: false, expectations: active };
  }

  async handleBlock(originalExp: Expectation): Promise<Expectation> {
    // Implementation as before...
    return await this.registry.issueExpectation({
      id: `EXP-TODO-${originalExp.id}`,
      trigger: 'todo.md',
      condition: `Document block and dependency analysis for ${originalExp.id}`,
      validationType: 'SANDBOXED_TS',
      proof: null,
      sessionId: this.config.sessionId,
      scope: 'SESSION',
      metadata: { linkedTo: originalExp.id }
    });
  }
}
