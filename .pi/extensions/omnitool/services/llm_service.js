"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
class LLMService {
    static async call(prompt) {
        console.log(`[LLM-MOCK] Calling LLM with prompt: ${prompt.substring(0, 50)}...`);
        return { content: "Mock response from LLM" };
    }
}
exports.LLMService = LLMService;
