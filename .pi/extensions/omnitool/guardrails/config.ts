export enum GuardrailMode {
  OFF = 'OFF',       // No interception
  DEBUG = 'DEBUG',   // Intercept and WARN, but allow action
  ENFORCE = 'ENFORCE', // Intercept and BLOCK
  AFK = 'AFK'        // Block human prompts, force externalization
}

export class GuardrailConfig {
  private static instance: GuardrailConfig = new GuardrailConfig();
  public mode: GuardrailMode = this.loadModeFromEnv();

  private constructor() {}

  private loadModeFromEnv(): GuardrailMode {
    return GuardrailMode.ENFORCE;
  }

  public static getInstance(): GuardrailConfig {
    return this.instance;
  }

  setMode(mode: GuardrailMode) {
    console.log(`[GUARDRAIL] Mode changed to: ${mode}`);
    this.mode = mode;
  }

  getMode(): GuardrailMode {
    return this.mode;
  }
}

export default GuardrailConfig;
