"use strict";
/**
 * OmnitoolMode Configuration
 *
 * Consolidates omnitool registration, blocking, guardrails, and logging behaviors.
 * Replaces legacy guardrailsMode.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OmnitoolConfig = exports.OmnitoolMode = void 0;
var OmnitoolMode;
(function (OmnitoolMode) {
    // No registration, inert (files present but not loaded)
    OmnitoolMode["OFF"] = "OFF";
    // Full registration + lifecycle verbose logging, no guardrails, no blocking
    OmnitoolMode["DEBUG"] = "DEBUG";
    // Full registration as sole proxy, no guardrails, no blocking, error-only logging
    OmnitoolMode["ON"] = "ON";
    // Full registration, active guardrails, no blocking, verbose logging for guardrails + registration
    OmnitoolMode["GUARDED_DEBUG"] = "GUARDED_DEBUG";
    // Full registration, active guardrails, blocking enabled, error-only logging (DEFAULT)
    OmnitoolMode["GUARDED"] = "GUARDED";
    // Full registration, active guardrails, blocking enabled, escalation mode
    // Blocks agent, creates issue expectation, requires resolution before proceeding
    OmnitoolMode["AFK"] = "AFK";
})(OmnitoolMode || (exports.OmnitoolMode = OmnitoolMode = {}));
class OmnitoolConfig {
    constructor() {
        this.mode = OmnitoolMode.GUARDED;
    }
    static getInstance() {
        return this.instance;
    }
    setMode(mode) {
        console.log(`[OMNITOOL-CONFIG] Mode changed to: ${mode}`);
        this.mode = mode;
    }
    getMode() {
        return this.mode;
    }
    /**
     * Determine if verbose logging is enabled for this mode
     */
    isVerboseLogging() {
        return this.mode === OmnitoolMode.DEBUG || this.mode === OmnitoolMode.GUARDED_DEBUG;
    }
    /**
     * Determine if guardrails are active
     */
    isGuardrailsActive() {
        return this.mode === OmnitoolMode.GUARDED_DEBUG ||
            this.mode === OmnitoolMode.GUARDED ||
            this.mode === OmnitoolMode.AFK;
    }
    /**
     * Determine if blocking is enforced (not just warning/logging)
     */
    isBlockingEnabled() {
        return this.mode === OmnitoolMode.GUARDED || this.mode === OmnitoolMode.AFK;
    }
    /**
     * Determine if AFK escalation mode is active
     */
    isAfkMode() {
        return this.mode === OmnitoolMode.AFK;
    }
    /**
     * Determine if omnitool should register and be available
     */
    isRegistered() {
        return this.mode !== OmnitoolMode.OFF;
    }
}
exports.OmnitoolConfig = OmnitoolConfig;
OmnitoolConfig.instance = new OmnitoolConfig();
exports.default = OmnitoolConfig;
