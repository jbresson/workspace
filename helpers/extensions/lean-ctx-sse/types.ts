export type McpBridgeStatus = {
  mode: string;
  connected: boolean;
  toolCount: number;
  toolNames: string[];
  reconnectAttempts: number;
  lastError?: string;
  lastHungTool?: string;
  lastRetry?: McpBridgeRetryState;
};

export type McpBridgeRetryState = {
  toolName: string;
  reason: string;
  retried: boolean;
  timestamp: string;
};
