import { Expectation, ExpectationState } from './expectation_service';
import { 
  ValidationResult, 
  ManualStrategy, 
  ConstrainedCmdStrategy, 
  SandboxedTSStrategy 
} from './validation_strategies';

export class ValidationManager {
  private strategies: Map<string, any>;

  constructor() {
    this.strategies = new Map([
      ['MANUAL', new ManualStrategy()],
      ['CONSTRAINED_CMD', new ConstrainedCmdStrategy()],
      ['SANDBOXED_TS', new SandboxedTSStrategy()],
    ]);
  }

  async validate(expectation: Expectation, proof: string): Promise<ValidationResult> {
    const strategy = this.strategies.get(expectation.validationType);

    if (!strategy) {
      // FAIL-SAFE: Default to Manual if type is unknown or unsupported
      return { 
        success: false, 
        reason: `Unsupported validation type '${expectation.validationType}'. Defaulting to MANUAL resolution.` 
      };
    }

    try {
      return await strategy.validate(expectation, proof);
    } catch (error) {
      return { 
        success: false, 
        reason: `Validation error during ${expectation.validationType} check: ${error.message}` 
      };
    }
  }
}
