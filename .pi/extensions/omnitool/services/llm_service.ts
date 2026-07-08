export class LLMService {
  static async call(prompt: string): Promise<{ content: string }> {
    console.log(`[LLM-MOCK] Calling LLM with prompt: ${prompt.substring(0, 50)}...`);
    return { content: "Mock response from LLM" };
  }
}
