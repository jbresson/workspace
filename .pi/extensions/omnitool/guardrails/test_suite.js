"use strict";
/**
 * Guardrail Logic Tests — updated for current OmnitoolMode API
 * Original tested SafetyMode (old API); this version tests OmnitoolMode (current API).
 */
const { ExpectationService } = require("./expectation_service");
const { Gatekeeper } = require("./gatekeeper");
const { OmnitoolConfig, OmnitoolMode } = require("./config");
const fs = require("fs");

async function runTests() {
    const registry = new ExpectationService();

    // Clear registry before tests
    const registryPath = require("path").join(process.cwd(), ".pi/extensions/omnitool/guardrails/expectations.jsonl");
    if (fs.existsSync(registryPath)) {
        await fs.promises.unlink(registryPath);
    }

    console.log("🚀 Starting Guardrail Logic Tests...\n");

    // Set mode to GUARDED for all tests (active guardrails + blocking)
    OmnitoolConfig.getInstance().setMode(OmnitoolMode.GUARDED);

    const gk = new Gatekeeper(registry);

    // Test 1: Global Scope Enforcement
    console.log("Test 1: Global Scope Enforcement...");
    await registry.issueExpectation("session-1", {
        id: "EXP-GLOBAL",
        trigger: ".env",
        condition: "Global Safety Check",
        validationType: "MANUAL",
        proof: null,
        scope: "GLOBAL"
    });

    const res1 = await gk.intercept("session-2", ".env", {});
    if (res1.allowed)
        throw new Error("Global expectation failed to block different session");
    console.log("✅ Passed: Global scope blocks all sessions.");

    // Test 2: Session Isolation
    console.log("Test 2: Session Isolation...");
    await registry.issueExpectation("session-1", {
        id: "EXP-SESSION",
        trigger: "core.ts",
        condition: "Session specific check",
        validationType: "MANUAL",
        proof: null,
        scope: "SESSION"
    });

    const res2 = await gk.intercept("session-2", "core.ts", {});
    if (!res2.allowed)
        throw new Error("Session expectation blocked a different session");
    console.log("✅ Passed: Session scope does not leak.");

    // Test 3: AFK Mode — escalation creates an expectation
    console.log("Test 3: AFK Mode Escalation...");
    OmnitoolConfig.getInstance().setMode(OmnitoolMode.AFK);
    const gkAFK = new Gatekeeper(registry);
    const blockRes = await gkAFK.intercept("session-1", ".env", {});
    if (blockRes.allowed)
        throw new Error("Should have been blocked by AFK mode + global expectation");
    console.log("✅ Passed: AFK mode blocked action with active global expectation.");

    // Test 4: GUARDED_DEBUG mode warns but does NOT block
    console.log("Test 4: GUARDED_DEBUG mode allows despite active expectation...");
    OmnitoolConfig.getInstance().setMode(OmnitoolMode.GUARDED_DEBUG);
    const gkDebug = new Gatekeeper(registry);
    const res4 = await gkDebug.intercept("session-1", ".env", {});
    if (!res4.allowed)
        throw new Error("GUARDED_DEBUG should not block — only warn");
    console.log("✅ Passed: GUARDED_DEBUG allows call (warn-only mode).");

    // Test 5: Resolved expectation — GUARDED should allow after resolution
    console.log("Test 5: Resolved expectation no longer blocks...");
    OmnitoolConfig.getInstance().setMode(OmnitoolMode.GUARDED);
    // Mark EXP-GLOBAL as resolved
    await registry.updateState("session-1", "EXP-GLOBAL", "RESOLVED", "manual-verification");
    const gkResolved = new Gatekeeper(registry);
    // session-1 is blocked by EXP-SESSION; session-3 should be clear for "core.ts"
    const res5 = await gkResolved.intercept("session-3", ".env", {});
    if (!res5.allowed)
        throw new Error("Resolved expectation should no longer block");
    console.log("✅ Passed: Resolved expectation does not block.");

    // Restore default mode
    OmnitoolConfig.getInstance().setMode(OmnitoolMode.GUARDED);

    console.log("\n✨ All Guardrail Logic tests passed successfully!");
}

runTests().catch(err => {
    console.error(`\n❌ Test Failed: ${err.message}`);
    process.exit(1);
});
