"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationManager = void 0;
const validation_strategies_1 = require("./validation_strategies");
class ValidationManager {
    constructor() {
        this.strategies = new Map([
            ['MANUAL', new validation_strategies_1.ManualStrategy()],
            ['CONSTRAINED_CMD', new validation_strategies_1.ConstrainedCmdStrategy()],
            ['SANDBOXED_TS', new validation_strategies_1.SandboxedTSStrategy()],
        ]);
    }
    async validate(expectation, proof) {
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
        }
        catch (error) {
            return {
                success: false,
                reason: `Validation error during ${expectation.validationType} check: ${error.message}`
            };
        }
    }
}
exports.ValidationManager = ValidationManager;
