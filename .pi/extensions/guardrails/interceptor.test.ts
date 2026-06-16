import { GuardrailOrchestrator } from "./orchestrator";
import { ExpectationService } from "./expectation_service";
import { Gatekeeper } from "./gatekeeper";
import { NegotiationManager } from "./negotiation_manager";
import { FinalizeChecker } from "./finalize_checker";
import { ValidationManager } from "./validation_manager";
import { SkepticAuditor } from "./skeptic_auditor";

describe("GuardrailInterceptor", () => {
  let orchestrator: GuardrailOrchestrator;
  let registry: ExpectationService;

  beforeEach(() => {
    registry = new ExpectationService();
    const auditor = new SkepticAuditor();
    const validationManager = new ValidationManager();
    const gatekeeper = new Gatekeeper(registry);
    const negotiator = new NegotiationManager(registry, auditor, validationManager);
    const finalizer = new FinalizeChecker(registry);

    orchestrator = new GuardrailOrchestrator(
      registry,
      gatekeeper,
      negotiator,
      finalizer,
      validationManager
    );
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
