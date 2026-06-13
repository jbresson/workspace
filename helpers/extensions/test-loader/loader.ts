import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

console.error("[test-loader] Extension loaded!");

export default async function (pi: ExtensionAPI) {
  console.error("[test-loader] Default export called!");
  
  pi.registerTool({
    name: "test_tool",
    description: "Test tool",
    parameters: {},
    async execute() {
      return { content: [{ type: "text", text: "Test tool works!" }] };
    },
  });

  console.error("[test-loader] Tool registered!");

  pi.registerCommand("test_command", {
    description: "Test command",
    handler: async () => {
      console.error("[test-loader] Command called!");
      return { content: [{ type: "text", text: "Test command works!" }] };
    },
  });

  console.error("[test-loader] Command registered!");
}
