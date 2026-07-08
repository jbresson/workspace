/**
 * OmnitoolMode Configuration
 * 
 * Consolidates omnitool registration, blocking, guardrails, and logging behaviors.
 * Replaces legacy guardrailsMode.
 */

export enum OmnitoolMode {
  // No registration, inert (files present but not loaded)
  OFF = 'OFF',
  
  // Full registration + lifecycle verbose logging, no guardrails, no blocking
  DEBUG = 'DEBUG',
  
  // Full registration as sole proxy, no guardrails, no blocking, error-only logging
  ON = 'ON',
  
  // Full registration, active guardrails, no blocking, verbose logging for guardrails + registration
  GUARDED_DEBUG = 'GUARDED_DEBUG',
  
  // Full registration, active guardrails, blocking enabled, error-only logging (DEFAULT)
  GUARDED = 'GUARDED',
  
  // Full registration, active guardrails, blocking enabled, escalation mode
  // Blocks agent, creates issue expectation, requires resolution before proceeding
  AFK = 'AFK'
}

export class OmnitoolConfig {
  private static instance: OmnitoolConfig = new OmnitoolConfig();
  public mode: OmnitoolMode = OmnitoolMode.GUARDED;

  private constructor() {}

  public static getInstance(): OmnitoolConfig {
    return this.instance;
  }

  setMode(mode: OmnitoolMode) {
    console.log(`[OMNITOOL-CONFIG] Mode changed to: ${mode}`);
    this.mode = mode;
  }

  getMode(): OmnitoolMode {
    return this.mode;
  }

  /**
   * Determine if verbose logging is enabled for this mode
   */
  isVerboseLogging(): boolean {
    return this.mode === OmnitoolMode.DEBUG || this.mode === OmnitoolMode.GUARDED_DEBUG;
  }

  /**
   * Determine if guardrails are active
   */
  isGuardrailsActive(): boolean {
    return this.mode === OmnitoolMode.GUARDED_DEBUG || 
           this.mode === OmnitoolMode.GUARDED || 
           this.mode === OmnitoolMode.AFK;
  }

  /**
   * Determine if blocking is enforced (not just warning/logging)
   */
  isBlockingEnabled(): boolean {
    return this.mode === OmnitoolMode.GUARDED || this.mode === OmnitoolMode.AFK;
  }

  /**
   * Determine if AFK escalation mode is active
   */
  isAfkMode(): boolean {
    return this.mode === OmnitoolMode.AFK;
  }

  /**
   * Determine if omnitool should register and be available
   */
  isRegistered(): boolean {
    return this.mode !== OmnitoolMode.OFF;
  }
}

export default OmnitoolConfig;