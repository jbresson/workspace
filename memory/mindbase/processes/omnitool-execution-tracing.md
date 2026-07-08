# Omnitool Execution Tracing Strategy

## Purpose
Enable debugging of omnitool dispatcher by adding structured logging at key execution points.

## Implementation Locations

### 1. Main Dispatcher (`index.ts:229` - omnitool.execute)

**Add at entry:**
```typescript
console.log(`[omnitool.execute] toolCallId=${toolCallId}, action=${action}`);
console.log(`[omnitool.execute] params keys=${Object.keys(params).join(",")}`);
```

**After guardrail check:**
```typescript
console.log(`[omnitool.execute] Checking guardrails for action=${action}...`);
const guardResult = await gatekeeper.intercept(/*...*/);
console.log(`[omnitool.execute] Guardrail result: allowed=${guardResult.allowed}`);
```

**If blocked:**
```typescript
console.log(`[omnitool.execute] BLOCKED by ${guardResult.ruleId}: ${guardResult.reason}`);
```

**Before dispatch:**
```typescript
console.log(`[omnitool.execute] Guardrails passed, dispatching action=${action}...`);
const result = await dispatch(action, params, pi, toolCallId);
console.log(`[omnitool.execute] dispatch completed successfully`);
```

**In catch block:**
```typescript
console.error(`[omnitool.execute] EXCEPTION: ${message}`);
console.error(`[omnitool.execute] Stack (first 3 lines):`, error?.stack?.split('\n').slice(0, 3).join('\n'));
```

---

### 2. Dispatch Function (`index.ts:73` - dispatch)

**Add at entry:**
```typescript
console.log(`[dispatch] action=${action}, toolKey=${params?.tool || "N/A"}`);
```

**For each route:**
```typescript
// In "list" route:
console.log(`[dispatch] Listing tools...`);

// In "search" route:
console.log(`[dispatch] Searching for query=${params?.query}`);

// In "wip" route:
console.log(`[dispatch] Routing to core.wip manager`);
const wipTool = registry.get("core.wip");
console.log(`[dispatch] wipTool found=${\!\!wipTool}`);

// In "call" route:
console.log(`[dispatch] Direct tool call for tool=${toolKey}`);
const target = registry.get(toolKey);
console.log(`[dispatch] Target tool found=${\!\!target}`);
```

---

### 3. WipWorktreeManager (`wip-manager/manager.ts`)

**In each public method (wipPrepare, wipGraduate, etc.):**
```typescript
async wipPrepare(params: {...}) {
  console.log(`[WipWorktreeManager.wipPrepare] project=${params.project}, issue=${params.issue}, slug=${params.slug}`);
  try {
    // ... implementation
    console.log(`[WipWorktreeManager.wipPrepare] SUCCESS: created=${created}, attached=${attached}`);
  } catch (e: any) {
    console.error(`[WipWorktreeManager.wipPrepare] ERROR: ${e.message}`);
    throw e;
  }
}
```

---

### 4. executeWipSubAction (`wip-manager/manager.ts:320`)

**At entry:**
```typescript
console.log(`[executeWipSubAction] wipRoot=${wipRoot}, subAction=${params?.subAction}, hasPi=${\!\!pi}`);
```

**For git operations branch:**
```typescript
if ([...].includes(subAction)) {
  console.log(`[executeWipSubAction] Git op: ${subAction}, instantiating WipWorktreeManager`);
  const mgr = new WipWorktreeManager(...);
  console.log(`[executeWipSubAction] Dispatching to mgr.${subAction}()`);
  const result = await mgr[subAction](params);
  console.log(`[executeWipSubAction] Git op result: code=${result.details?.code}`);
  return result;
}
```

---

## Log Output Format

```
[module.method] Operation starting: key=value
[module.method] Intermediate checkpoint: status=xxx
[module.method] SUCCESS: result_field=value
[module.method] ERROR: reason
```

---

## Using Logs

### Development (Node console output)
```bash
# Terminal where Pi is running will show logs
# grep for patterns: [omnitool, [dispatch, [WipWorktreeManager
```

### User-Facing Notifications
When important milestones complete (e.g., `wipGraduate` success), add:
```typescript
if (ctx?.ui?.notify) {
  ctx.ui.notify(`✅ Graduated ${movedCommits.length} commit(s) to ${targetBranch}`, "success");
}
```

---

## Error Handling Strategy

**Current:** Try/catch wrapper returns `CmdResult` with `isError: true`.

**Enhanced** (do in dispatcher):
```typescript
try {
  const result = await dispatch(action, params, pi, toolCallId);
  if (result.isError) {
    console.warn(`[omnitool] Action ${action} returned error: ${result.details?.error}`);
  }
  return result;
} catch (error: any) {
  console.error(`[omnitool] Unhandled exception: ${error.message}`);
  // Return error response instead of throwing
  return {
    content: [{ type: "text", text: `❌ Unhandled error: ${error.message}` }],
    isError: true,
    details: { code: "OMNITOOL_EXCEPTION", error: error.message }
  };
}
```

---

## Testing the Logs

1. Start Pi with omnitool loaded
2. Call: `omnitool({ action: "list" })`
3. Check console for: `[omnitool.execute] action=list`
4. Call WIP command: `omnitool({ action: "wip", params: { subAction: "prepare", project: "test", issue: "T-1", slug: "test" } })`
5. Check for: `[WipWorktreeManager.wipPrepare]` logs

---

## Future Enhancements

- Structured logging with severity levels (DEBUG, INFO, WARN, ERROR)
- Metrics collection (duration, success rate)
- Request tracing (correlate logs across async boundaries)
- Log aggregation service
