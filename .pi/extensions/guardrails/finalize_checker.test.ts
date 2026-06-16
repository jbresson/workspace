import { FinalizeChecker } from "./finalize_checker";
import { ValidationManager } from "./validation_manager";
import { LLMService } from "../../../helpers/services/llm_service";
import * as runner from "../../helpers/extensions/pi-buddies/runner";

jest.mock("../../helpers/extensions/pi-buddies/runner", () => ({
  runBuddy: jest.fn(),
}));

describe("FinalizeChecker Deep Audit", () => {
  let finalizer: FinalizeChecker;
  let validationManager: ValidationManager;
  const { runBuddy } = runner as jest.Mocked<typeof runner>;

  beforeEach(() => {
    validationManager = new ValidationManager();
    finalizer = new FinalizeChecker(validationManager);
    jest.clearAllMocks();
  });

  it("should resolve when both hard validation and audit pass", async () => {
    const mockExp = {
      id: "exp-1",
      description: "File exists",
      condition: "exists(test.txt)",
      metadata: { negotiation: { proposedValidator: "ls test.txt" } },
      trigger: "test.txt"
    } as any;

    // Mock Hard Validation success
    jest.spyOn(validationManager, 'validate').mockResolvedValue({ 
      success: true, 
      reason: "File found in directory." 
    });

    // Mock LLM Approval
    runBuddy.mockResolvedValue({
      content: [{ type: "text", text: "[APPROVED] Output confirms existence." }],
      isError: false,
    });

    const result = await finalizer.finalizeResolution(mockExp, "ls test.txt");
    expect(result.resolved).toBe(true);
  });

  it("should block resolution if hard validation fails", async () => {
    const mockExp = {
      id: "exp-1",
      description: "File exists",
      condition: "exists(test.txt)",
      metadata: { negotiation: { proposedValidator: "ls test.txt" } },
      trigger: "test.txt"
    } as any;

    jest.spyOn(validationManager, 'validate').mockResolvedValue({ 
      success: false, 
      reason: "File not found." 
    });

    const result = await finalizer.finalizeResolution(mockExp, "ls test.txt");
    expect(result.resolved).toBe(false);
    expect(result.reason).toContain("Execution failed");
  });

  it("should block resolution if LLM auditor detects fake success", async () => {
    const mockExp = {
      id: "exp-1",
      description: "File exists",
      condition: "exists(test.txt)",
      metadata: { negotiation: { proposedValidator: "echo 0" } }, // a fake validator
      trigger: "test.txt"
    } as any;

    jest.spyOn(validationManager, 'validate').mockResolvedValue({ 
      success: true, 
      reason: "Command returned exit 0." 
    });

    // Mock LLM Critique
    runBuddy.mockResolvedValue({
      content: [{ type: "text", text: "[CRITIQUE] The output is just a hardcoded 0 and doesn't prove the file exists." }],
      isError: false,
    });

    const result = await finalizer.finalizeResolution(mockExp, "echo 0");
    expect(result.resolved).toBe(false);
    expect(result.reason).toContain("Adversarial audit failed");
  });
});
