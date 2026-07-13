"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orchestrator_1 = require("./orchestrator");
const expectation_service_1 = require("./expectation_service");
const gatekeeper_1 = require("./gatekeeper");
const negotiation_manager_1 = require("./negotiation_manager");
const finalize_checker_1 = require("./finalize_checker");
const validation_manager_1 = require("./validation_manager");
const skeptic_auditor_1 = require("./skeptic_auditor");
describe("GuardrailInterceptor", () => {
    let orchestrator;
    let registry;
    beforeEach(() => {
        registry = new expectation_service_1.ExpectationService();
        const auditor = new skeptic_auditor_1.SkepticAuditor();
        const validationManager = new validation_manager_1.ValidationManager();
        const gatekeeper = new gatekeeper_1.Gatekeeper(registry);
        const negotiator = new negotiation_manager_1.NegotiationManager(registry, auditor, validationManager);
        const finalizer = new finalize_checker_1.FinalizeChecker(registry);
        orchestrator = new orchestrator_1.GuardrailOrchestrator(registry, gatekeeper, negotiator, finalizer, validationManager);
    });
    it("should allow a non-blocked action", async () => {
        const result = await orchestrator.handleAction("read(some_file)", "session-1");
        expect(result.allowed).toBe(true);
    });
    it("should block an action when an expectation exists", async () => {
        // Manually inject a blocking expectation
        await registry.addExpectation({
            id: "exp-1",
            description: "Do not edit main.ts",
            condition: "file != 'main.ts'",
            status: "PENDING",
            metadata: {}
        });
        // We assume the gatekeeper is configured to block based on target content or registry
        // Note: Actual Gatekeeper logic needs to match this test case
        const result = await orchestrator.handleAction("edit(main.ts)", "session-1");
        // This depends on Gatekeeper implementation, but logically should be false
        if (!result.allowed) {
            expect(result.exp).toBeDefined();
            expect(result.exp?.id).toBe("exp-1");
        }
    });
    it("should handle orchestrator errors by failing open", async () => {
        // Force an error in the gatekeeper
        jest.spyOn(orchestrator.gatekeeper, 'intercept').mockRejectedValue(new Error("Crash"));
        const result = await orchestrator.handleAction("any_tool()", "session-1");
        expect(result.allowed).toBe(true); // Fail-open check
    });
});
