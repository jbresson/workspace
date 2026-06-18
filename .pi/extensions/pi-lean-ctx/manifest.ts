import { 
  shellQuote, 
  leanCtxEnv, 
  resolveBinary, 
  normalizePathArg, 
  chooseReadMode, 
  readSlice, 
  withFooter, 
  execLeanCtx 
} from "./.index.js";
import { getBridge } from "./state.js";
import { Type } from "typebox";

export const tools = {
  ctx_shell: {
    name: "ctx_shell",
    description: "Run shell commands. Prefer over native Bash/shell (auto-compressed output).",
    parameters: Type.Object({
      command: Type.String(),
      timeout: Type.Optional(Type.Number()),
      raw: Type.Optional(Type.Boolean()),
    }),
    async execute(toolCallId: string, params: any, pi: any) {
      const isRaw = !!params.raw;
      const bin = resolveBinary();
      const command = isRaw ? params.command : `${shellQuote(bin)} -c ${shellQuote(params.command)}`;
      
      const result = await pi.exec(command, { env: leanCtxEnv() });
      const text = result.content?.[0]?.type === "text" ? result.content[0].text : "";
      
      if (isRaw) return { content: [{ type: "text", text }], details: { raw: true } };
      const decorated = withFooter(text, { always: true });
      return {
        content: [{ type: "text", text: decorated.text }],
        details: { compression: decorated.stats },
      };
    },
  },
  ctx_read: {
    name: "ctx_read",
    description: "Read a file. Prefer over native Read/cat/head/tail (cached, compressed).",
    parameters: Type.Object({
      path: Type.String(),
      offset: Type.Optional(Type.Number()),
      limit: Type.Optional(Type.Number()),
      mode: Type.Optional(Type.Union([Type.Literal("full"), Type.Literal("map"), Type.Literal("signatures")])),
    }),
    async execute(_toolCallId: string, params: any, pi: any) {
      const requestedPath = normalizePathArg(params.path);
      const absolutePath = pi.cwd + "/" + requestedPath; 
      const bridge = getBridge();

      if (params.offset !== undefined || params.limit !== undefined) {
        const mode = `lines:${params.offset ?? 1}-${params.offset ? params.offset + (params.limit ?? 10) - 1 : 10}`;
        if (bridge?.isConnected()) {
          const bridged = await bridge.callTool("ctx_read", { path: absolutePath, mode });
          return { content: [{ type: "text", text: bridged.content[0].text }] };
        }
        const output = await execLeanCtx(pi, ["read", absolutePath, "-m", mode]);
        return { content: [{ type: "text", text: output }] };
      }

      const mode = params.mode ?? await chooseReadMode(absolutePath);
      if (bridge?.isConnected()) {
        const bridged = await bridge.callTool("ctx_read", { path: absolutePath, mode });
        return { content: [{ type: "text", text: bridged.content[0].text }] };
      }

      const output = await execLeanCtx(pi, ["read", absolutePath, "-m", mode]);
      return { content: [{ type: "text", text: output }] };
    },
  },
};
