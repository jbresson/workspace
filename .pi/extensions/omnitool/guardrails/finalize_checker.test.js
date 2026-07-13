"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const finalize_checker_1 = require("./finalize_checker");
const validation_manager_1 = require("./validation_manager");
const runner = __importStar(require("../buddies/runner"));
jest.mock("../buddies/runner", () => ({
    runBuddy: jest.fn(),
}));
describe("FinalizeChecker Deep Audit", () => {
    let finalizer;
    let validationManager;
    const { runBuddy } = runner;
    beforeEach(() => {
        validationManager = new validation_manager_1.ValidationManager();
        finalizer = new finalize_checker_1.FinalizeChecker(validationManager);
        jest.clearAllMocks();
    });
    it("should resolve when both hard validation and audit pass", async () => {
        const mockExp = {
            id: "exp-1",
            description: "File exists",
            condition: "exists(test.txt)",
            metadata: { negotiation: { proposedValidator: "ls test.txt" } },
            trigger: "test.txt"
        };
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
        };
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
        };
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
