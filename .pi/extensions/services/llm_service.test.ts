import { LLMService } from "./llm_service";
import * as runner from "../extensions/buddies/runner";

// Mock the runner's execute function to avoid actual CLI calls during unit tests
jest.mock("../extensions/buddies/runner", () => ({
  runBuddy: jest.fn(),
}));

describe("LLMService", () => {
  const { runBuddy } = runner as jest.Mocked<typeof runner>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call runBuddy with correct SKEPTIC profile settings", async () => {
    runBuddy.mockResolvedValue({
      content: [{ type: "text", text: "[CRITIQUE] Too risky." }],
      isError: false,
    });

    const response = await LLMService.call("SKEPTIC", "Test prompt");

    expect(runBuddy).toHaveBeenCalledWith(expect.objectContaining({
      systemPrompt: expect.stringContaining("Skeptic Auditor"),
      thinking: "high",
      noTools: true,
      noSession: true,
    }));
    expect(response.text).toBe("[CRITIQUE] Too risky.");
    expect(response.isError).toBe(false);
  });

  it("should call runBuddy with correct NEGOTIATOR profile settings", async () => {
    runBuddy.mockResolvedValue({
      content: [{ type: "text", text: "[PROPOSAL] Use a try-catch." }],
      isError: false,
    });

    const response = await LLMService.call("NEGOTIATOR", "Test prompt");

    expect(runBuddy).toHaveBeenCalledWith(expect.objectContaining({
      systemPrompt: expect.stringContaining("Technical Negotiator"),
      thinking: "medium",
      noTools: true,
    }));
    expect(response.text).toBe("[PROPOSAL] Use a try-catch.");
  });

  it("should handle runner errors gracefully", async () => {
    runBuddy.mockResolvedValue({
      content: [{ type: "text", text: "CLI Error" }],
      isError: true,
    });

    const response = await LLMService.call("SKEPTIC", "Test prompt");
    expect(response.isError).toBe(true);
    expect(response.text).toBe("CLI Error");
  });
});
