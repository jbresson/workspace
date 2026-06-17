import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport as SseClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { type TSchema, Type } from "typebox";
import type { McpBridgeRetryState, McpBridgeStatus } from "./types.js";

/** Result shape returned by the MCP client's `callTool`. */
type McpCallResult = Awaited<ReturnType<Client["callTool"]>>;

const CLI_OVERRIDE_TOOLS = new Set([
  "ctx_read",
  "ctx_multi_read",
  "ctx_shell",
  "ctx_search",
  "ctx_tree",
]);

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;
const TOOL_CALL_TIMEOUT_MS = 120000;

type McpTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
};

function isAbortLikeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    err.name === "AbortError" ||
    msg.includes("aborted") ||
    msg.includes("cancelled") ||
    msg.includes("canceled")
  );
}

function isHostToolRejection(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("the user doesn't want to proceed with this tool use") ||
    msg.includes("tool use was rejected") ||
    msg.includes("stop what you are doing and wait for the user to tell you how to proceed")
  );
}

function isRetrySafeTool(name: string): boolean {
  const lower = name.toLowerCase();
  const mutatingHints = [
    "edit", "fill", "cache", "workflow",
    "execute", "session", "knowledge", "response",
  ];
  return !mutatingHints.some((hint) => lower.includes(hint));
}

export class McpSseBridge {
  private client: Client | null = null;
  private transport: SseClientTransport | null = null;
  private registeredTools: string[] = [];
  private connected = false;
  private sseUrl: string;
  private projectName: string;

  private reconnectAttempts = 0;
  private lastError: string | undefined;
  private lastHungTool: string | undefined;
  private serverProcess: any = null;

  constructor(projectPath?: string) {
    this.projectName = this.deriveProjectName(projectPath);
    this.sseUrl = this.resolveSseUrl(projectPath);
  }

  private deriveProjectName(projectPath?: string): string {
    if (!projectPath) return "default";
    const normalizedPath = projectPath.replace(/^~/, process.env.HOME || "");
    return path.basename(normalizedPath);
  }

  private resolveSseUrl(projectPath?: string): string {
    const configPath = path.join(__dirname, "projects-config.json");
    let config = { projects: {}, settings: { url: "http://localhost", path: "/sse", portRange: [10000, 11000] } };

    try {
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
    } catch (err) {
      console.warn(`[lean-ctx SSE bridge] Failed to read projects-config.json: ${err}`);
    }

    const name = this.projectName;
    let port = config.projects[name]?.port;

    if (!port) {
      const usedPorts = new Set(Object.values(config.projects).map((p: any) => p.port));
      const [start, end] = config.settings.portRange;
      for (let p = start; p <= end; p++) {
        if (!usedPorts.has(p)) {
          port = p;
          break;
        }
      }

      if (!port) throw new Error("No available ports in configured range.");

      config.projects[name] = { port, path: this.deriveProjectName(projectPath) };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    const { url, path: ssePath } = config.settings;
    const finalUrl = `${url}:${port}${ssePath}`;
    console.log(`[lean-ctx SSE bridge] Resolved SSE URL for ${name}: ${finalUrl}`);
    return finalUrl;
  }

  async start(pi: ExtensionAPI, projectPath?: string): Promise<void> {
    try {
      await this.ensureServerRunning(projectPath);
      await this.connect();
      await this.discoverAndRegisterTools(pi);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.lastError = msg;
      console.error(`[lean-ctx SSE bridge] Failed to start: ${msg}`);
      throw err;
    }
  }

  private async ensureServerRunning(projectPath?: string): Promise<void> {
    if (this.serverProcess) return;

    const normalizedPath = projectPath ? projectPath.replace(/^~/, process.env.HOME || "") : process.cwd();
    const port = this.extractPortFromUrl(this.sseUrl);

    console.log(`[lean-ctx SSE bridge] Starting server for ${this.projectName} on port ${port}...`);

    try {
      this.serverProcess = spawn("lean-ctx", ["server", "--port", String(port)], {
        cwd: normalizedPath,
        detached: true,
        stdio: "ignore",
      });

      this.serverProcess.unref();

      // Wait for server to become available
      let attempts = 0;
      while (attempts < 10) {
        try {
          const res = await fetch(this.sseUrl);
          if (res.ok || res.status === 405) return; // 405 Method Not Allowed is often OK for SSE endpoints on GET
        } catch (e) {
          // ignore
        }
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      throw new Error(`lean-ctx server failed to start on ${this.sseUrl}`);
    } catch (err) {
      this.serverProcess = null;
      throw err;
    }
  }

  private extractPortFromUrl(url: string): number {
    const match = url.match(/:(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
    this.transport = new SseClientTransport({
      url: this.sseUrl,
    });

    this.client = new Client({
      name: "pi-lean-ctx-sse",
      version: "1.0.0",
    });

    this.transport.onclose = () => {
      this.connected = false;
      this.lastError = "MCP SSE transport closed";
      this.scheduleReconnect();
    };

    this.transport.onerror = (err) => {
      this.lastError = err instanceof Error ? err.message : String(err);
      console.error(`[lean-ctx SSE bridge] Transport err: ${this.lastError}`);
    };

    await this.client.connect(this.transport);
    this.connected = true;
    this.reconnectAttempts = 0;
    this.lastError = undefined;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.lastError = `Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached.`;
      console.error(
        `[lean-ctx SSE bridge] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. MCP tools unavailable.`
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
    setTimeout(async () => {
      try {
        await this.connect();
        console.log("[lean-ctx SSE bridge] Reconnected successfully");
      } catch (err) {
        this.lastError = err instanceof Error ? err.message : String(err);
        this.scheduleReconnect();
      }
    }, delay);
  }

  private async forceReconnect(): Promise<void> {
    this.connected = false;
    await this.client?.close();
    this.client = null;
    this.transport = null;
    await this.connect();
  }

  private async discoverAndRegisterTools(pi: ExtensionAPI): Promise<void> {
    if (!this.client) return;
    try {
      console.log(`[lean-ctx SSE bridge] Fetching tool list from ${this.sseUrl}...`);
      const result = await this.client.listTools();
      console.log(`[lean-ctx SSE bridge] Received tools:`, JSON.stringify(result, null, 2));
      const tools = (result.tools ?? []) as McpTool[];
      for (const tool of tools) {
        if (CLI_OVERRIDE_TOOLS.has(tool.name)) continue;
        this.registerMcpTool(pi, tool);
      }
    } catch (err) {
      console.error(`[lean-ctx SSE bridge] Failed to list tools:`, err);
      throw err;
    }
  }

  private registerMcpTool(pi: ExtensionAPI, tool: McpTool): void {
    const bridge = this;
    const schema = this.jsonSchemaToTypebox(tool.inputSchema);
    const prefixedName = `${this.projectName}_${tool.name}`;

    pi.registerTool({
      name: prefixedName,
      label: `${this.projectName}: ${tool.name}`,
      desc: tool.description ?? `lean-ctx SSE tool (${this.projectName}): ${tool.name}`,
      promptSnippet: tool.description ?? tool.name,
      parameters: schema,
      async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
        const result = await bridge.callTool(
          tool.name, // Call original name on server
          params as Record<string, unknown>,
          signal
        );
        // Pi's AgentToolResult requires a `details` field; MCP tool output has none.
        return { ...result, details: undefined };
      },
    });
    this.registeredTools.push(prefixedName);
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<{ content: Array<{ type: "text"; text: string }> }> {
    if (!this.client || !this.connected) {
      throw new Error(`lean-ctx SSE bridge not connected. Tool "${name}" unavailable.`);
    }

    if (signal?.aborted) {
      throw new Error(`lean-ctx SSE tool "${name}" interrupted by host.`);
    }

    try {
      const result = await this.callToolWithTimeout(name, args, signal);
      this.lastError = undefined;
      return this.toTextBlocks(result);
    } catch (err) {
      if (isHostToolRejection(err) || isAbortLikeError(err)) {
        throw new Error(`lean-ctx SSE tool "${name}" interrupted by host.`);
      }

      if (this.isTimeoutError(err) && isRetrySafeTool(name)) {
        this.lastRetry = {
          toolName: name,
          reason: "timeout",
          retried: true,
          timestamp: new Date().toISOString(),
        };
        await this.forceReconnect();
        const retried = await this.callToolWithTimeout(name, args, signal);
        this.lastError = undefined;
        return this.toTextBlocks(retried);
      }

      this.lastError = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  private async callToolWithTimeout(
    name: string,
    args: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<McpCallResult> {
    const call = this.client?.callTool({ name, arguments: args });
    if (!call) {
      throw new Error(`lean-ctx SSE bridge not connected. Tool "${name}" unavailable.`);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        this.lastHungTool = name;
        reject(new Error(`lean-ctx SSE tool "${name}" timed out after ${Math.round(TOOL_CALL_TIMEOUT_MS / 1000)}s.`));
      }, TOOL_CALL_TIMEOUT_MS);
    });

    const promises: Promise<McpCallResult>[] = [call, timeout];
    if (signal) {
      let onAbort: (() => void) | undefined;
      const abortPromise = new Promise<never>((_, reject) => {
        onAbort = () => {
          reject(new Error(`lean-ctx SSE tool "${name}" interrupted by host.`));
        };
        signal.addEventListener("abort", onAbort, { once: true });
      });
      promises.push(abortPromise);
    }

    try {
      return await Promise.race(promises);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private isTimeoutError(err: unknown): boolean {
    return err instanceof Error && err.message.includes("timed out after");
  }

  private toTextBlocks(
    result: McpCallResult
  ): { content: Array<{ type: "text"; text: string }> } {
    const content = (
      result.content as Array<{ type: string; text?: string }>
    ).map((block) => ({
      type: "text" as const,
      text: block.text ?? "",
    }));
    return { content };
  }

  private jsonSchemaToTypebox(
    schema?: Record<string, unknown>
  ): ReturnType<typeof Type.Object> {
    if (!schema || !schema.properties) {
      return Type.Object({});
    }

    const properties = schema.properties as Record<string, Record<string, unknown>>;
    const required = new Set((schema.required as string[] | undefined) ?? []);
    const fields: Record<string, TSchema> = {};

    for (const [key, prop] of Object.entries(properties)) {
      const desc = (prop.description as string) ?? undefined;
      const jsonType = prop.type as string | undefined;
      let field: TSchema;

      switch (jsonType) {
        case "number":
        case "integer":
          field = Type.Number({ desc });
          break;
        case "boolean":
          field = Type.Boolean({ desc });
          break;
        case "array":
          field = Type.Array(Type.Unknown(), { desc });
          break;
        case "object":
          field = Type.Record(Type.String(), Type.Unknown(), { desc });
          break;
        default:
          field = Type.String({ desc });
          break;
      }

      fields[key] = required.has(key) ? field : Type.Optional(field);
    }

    return Type.Object(fields);
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  getStatus(): McpBridgeStatus {
    return {
      mode: "sse",
      connected: this.connected,
      toolCount: this.registeredTools.length,
      toolNames: [...this.registeredTools],
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastError,
      lastHungTool: this.lastHungTool,
      lastRetry: this.lastRetry,
    };
  }

  async shutdown(): Promise<void> {
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
    await this.client?.close();
    this.client = null;
    this.transport = null;
    this.connected = false;
  }
}
