# EXT-001: Turn Completion Validator Extension

**Created**: 2026-06-13  

## Problem Statement

The Pi agent fires `turn_end` event, but it's ambiguous: does it signal **genuine completion** (agent truly done, user can input) or **transient pause** (agent has queued steering/followUp messages and will auto-resume)?

**False Win Risk**: Downstream systems (notifications, handoff triggers, UI state machines) react to `turn_end` assuming true completion, but agent auto-resumes, creating:
- Premature notifications ("Agent done" then agent resumes)
- Failed handoffs (context loss mid-chain)
- UI state thrashing (idle → busy → idle oscillation)

## Root Cause Analysis

Two distinct patterns trigger `turn_end`:

| Pattern | Behavior | Current Signal |
|---------|----------|-----------------|
| **Genuine Completion** | Agent finished all tool calls, no messages queued | `turn_end` |
| **False Completion** | Agent paused after tool calls, but steering/followUp messages pending in queue | `turn_end` ← **Problem: Same signal!** |

The issue: Extension cannot distinguish between them from `turn_end` event alone.

## Solution Design

### Architecture Overview

**5-Phase approach:**

1. **Data Collection & State Tracking**
   - Track queue state snapshot at `turn_start`
   - Record all `queue_update` events during turn (steering/followUp deltas)
   - Compare pre-turn vs. post-turn state at `turn_end`

2. **Event Stream Analysis**
   - Monitor: `turn_start` → `queue_update` (0..N) → `turn_end` → `agent_end`
   - Classify completion type based on queue state transitions

3. **Heuristics for Detection**
   - If queue grew AND messages pending → `PAUSED_TURN` (false completion)
   - If queue empty AND no deltas → `GENUINE_COMPLETION`
   - Steering messages auto-interrupt; followUp waits for idle

4. **Action on Detection**
   - Option A: Silent suppression (log, no downstream signals)
   - Option B: Informational widget ("Agent paused • 2 follow-up queued")
   - Option C: Interruptible pause (user can break chain)

5. **Edge Case Mitigations**
   - Queue cleared during turn → recheck at `turn_end`
   - Multiple steering/followUp in same turn → sum deltas
   - Message delivery failures → fallback to message count growth
   - RPC mode (no UI) → logging + state registry

### Data Structures

```typescript
// Extension state
type ExtensionState = {
  queueHistory: Map<turnId, QueueSnapshot>;
  pausedTurns: Set<turnId>;
  lastTrueCompletion: { turnId, timestamp };
  config: {
    mode: "silent" | "notify" | "interactive";
    trackWindowMs: 500;  // Wait window for queue updates after turn_end
  };
};

// Per-turn snapshot
type QueueSnapshot = {
  steering: number;
  followUp: number;
  timestamp: ms;
  deltas: QueueChange[];  // Record of all queue updates during turn
};

type QueueChange = {
  type: "steering" | "followUp";
  delta: number;  // +1 when message added, -1 when delivered
  timestamp: ms;
};
```

### Event Subscription Flow

```typescript
let currentTurn: string | null = null;
let preQueueState = { steering: 0, followUp: 0 };

// Capture baseline
pi.on("turn_start", (event, ctx) => {
  currentTurn = event.turnId;
  preQueueState = captureQueueState(ctx);
  recordSnapshot(currentTurn, preQueueState);
});

// Track queue mutations
pi.on("queue_update", (event, ctx) => {
  if (!currentTurn) return;
  recordQueueDelta(currentTurn, event.steering, event.followUp);
});

// Classify and signal
pi.on("turn_end", (event, ctx) => {
  if (!currentTurn) return;
  
  const postQueueState = captureQueueState(ctx);
  const classification = classifyCompletion(
    preQueueState,
    postQueueState,
    queueHistory[currentTurn]
  );
  
  if (classification === "PAUSED") {
    handlePausedTurn(currentTurn, ctx);
  } else {
    handleGenuineCompletion(currentTurn, ctx);
  }
  
  currentTurn = null;
});

// True end (no more queued continuations)
pi.on("agent_end", (event, ctx) => {
  emit("agent_truly_idle", { timestamp: Date.now() });
});
```

### Classification Logic

```typescript
function classifyCompletion(
  pre: QueueState,
  post: QueueState,
  deltas: QueueChange[]
): "GENUINE" | "PAUSED" {
  
  // Sum all queue mutations during turn
  const netSteering = deltas
    .filter(d => d.type === "steering")
    .reduce((sum, d) => sum + d.delta, 0);
  
  const netFollowUp = deltas
    .filter(d => d.type === "followUp")
    .reduce((sum, d) => sum + d.delta, 0);
  
  const finalSteering = post.steering;
  const finalFollowUp = post.followUp;
  
  // Paused if queue grew AND still has pending messages
  if ((netSteering > 0 || netFollowUp > 0) 
      && (finalSteering > 0 || finalFollowUp > 0)) {
    return "PAUSED";
  }
  
  return "GENUINE";
}
```

### Signal Routing (Event Bus)

```typescript
// Emit typed classification event
pi.events.on("turn_classification", (data: {
  type: "GENUINE" | "PAUSED";
  turnId: string;
  timestamp: number;
  metadata: {
    steering: number;
    followUp: number;
    deltas: QueueChange[];
  };
}) => {
  // Other extensions subscribe to this
  if (data.type === "GENUINE") {
    pi.emit("agent_truly_idle", data);  // Safe for notifications, handoff
  } else {
    pi.emit("agent_paused_transient", data);  // Suppress downstream
  }
});
```

### User Interaction Modes

**Silent Mode** (no UI):
- Log classification
- Emit typed event
- Do NOT trigger downstream notifications/handoff

**Notify Mode**:
- Show widget: "Agent paused • 2 follow-up messages queued"
- Auto-dismiss when `agent_end` fires
- Good for user awareness without interruption

**Interactive Mode**:
- Widget with buttons: "Resume now?" / "Let it auto-continue?"
- User can break queue or let it finish
- Useful for long chains requiring supervision

### Configuration

```json
{
  "detectionMode": "silent" | "notify" | "interactive",
  "notificationThreshold": 1000,  // ms before notifying user
  "suppressNativeEvents": true,   // Don't emit turn_end for paused turns
  "logLevel": "debug" | "info" | "off"
}
```

## Edge Cases & Mitigations

| Case | Root | Mitigation |
|------|------|-----------|
| Queue cleared *during* turn | User input or steer delivers instantly | Re-check at `turn_end`; if queue empty, classify as GENUINE |
| Multiple steer/followUp in same turn | Rapid queueing | Sum all deltas; if net positive, PAUSED |
| Steering then manual user input | Next turn from user, not queue | Next turn's classification will be GENUINE (user message, not queued) |
| Message delivery fails silently | Network/API issue | Fallback: compare `agent.state.messages.length` growth; if grew unexpectedly, assume delivery |
| RPC mode (no UI/ctx) | Missing context | Use extension state registry + logging; no widget notifications |
| Turn_end fires, then turn_start immediately | Rapid succession | Track turnId carefully; use queue state deltas, not absolute counts |

## Testing Strategy

**Fixtures**:
1. Single steering message queued
2. Single followUp message queued
3. Mixed steering + followUp
4. Queue cleared before turn_end fires
5. Rapid multi-turn sequences
6. RPC mode (no UI context)

**Observable outputs**:
- Classification event emitted with correct type
- Widget state (if notify mode)
- Extension state snapshots
- Downstream signal routing (no false notifications)

## Success Criteria

- ✅ Detects all steering/followUp queueing patterns
- ✅ Distinguishes genuine completion from transient pauses
- ✅ Routes correct signals to prevent false notifications/handoffs
- ✅ Handles edge cases (queue clears, RPC, rapid turns, failures)
- ✅ Provides user visibility without being intrusive
- ✅ Minimal overhead (<5ms per turn classification)

## Implementation Notes

**Do not implement yet.** This is design capture only.

When ready to implement:
1. Create extension template in `.pi/extensions/turn-completion-validator.ts`
2. Use `ExtensionAPI` from `@earendil-works/pi-coding-agent`
3. Reference examples:
   - `git-checkpoint.ts` - State tracking across turns
   - `notify.ts` - Notification on agent_end
   - `send-user-message.ts` - Queue inspection
4. Test in interactive mode, then RPC mode

## Related Issues

- (Blocking on): Queue state API exposure in `queue_update` event
- (Enabled by): Event bus for type-safe event routing

---

**Original Request**: User asked for design (not implementation) of extension to detect false turn_end events when agent paused after queuing steering/followUp messages.
