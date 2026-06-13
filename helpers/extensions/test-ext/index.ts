import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "test_tool",
    description: "A simple test tool to verify loading",
    parameters: Type.Object({}),
    async execute() {
      return {
        content: [{ type: "text", text: "Test tool executed successfully!" }],
        details: {},
      };
    },
  });
}
