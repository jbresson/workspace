import { RegistryService, Expectation } from './registry_service';

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
    const active = await this.registry.findActive(actionTarget, this.config.sessionId);
    
    if (active.length === 0) {
      return { allowed: true, expectations: [] };
    }

    // If any pending expectations exist for this target, it is blocked
    return { allowed: false, expectations: active };
  }

  /**
   * Handles the logic of issuing a meta-expectation for documentation when blocked in AFK mode.
   */
  async handleBlock(originalExp: Expectation): Promise<Expectation> {
    return await this.registry.issueExpectation({
      id: `EXP-TODO-${originalExp.id}`,
      trigger: 'todo.md',
      condition: `Document block and dependency analysis for ${originalExp.id}`,
      validationType: 'SANDBOXED_TS', // We'll use the Skeptic Auditor to verify the todo entry
      proof: null,
      sessionId: this.config.sessionId,
      scope: 'SESSION',
      metadata: { linkedTo: originalExp.id }
    });
  }
}
