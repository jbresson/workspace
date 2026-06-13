import { RegistryService, ExpectationState } from './registry_service';
import { Gatekeeper, SafetyMode } from './gatekeeper';
import * as fs from 'fs';

async function runTests() {
  const registry = new RegistryService();
  // Clear registry before tests
  if (fs.existsSync('.pi/registry/expectations.jsonl')) {
    await fs.promises.unlink('.pi/registry/expectations.jsonl');
  }

  console.log('🚀 Starting Guardrail Logic Tests...\n');

  try {
    // Test 1: Global Scope Enforcement
    console.log('Test 1: Global Scope Enforcement...');
    await registry.issueExpectation({
      id: 'EXP-GLOBAL',
      trigger: '.env',
      condition: 'Global Safety Check',
      validationType: 'MANUAL',
      proof: null,
      sessionId: 'session-1',
      scope: 'GLOBAL'
    });

    const gk1 = new Gatekeeper(registry, { sessionId: 'session-2', mode: SafetyMode.PRESENT });
    const res1 = await gk1.intercept('.env');
    if (res1.allowed) throw new Error('Global expectation failed to block different session');
    console.log('✅ Passed: Global scope blocks all sessions.');

    // Test 2: Session Isolation
    console.log('Test 2: Session Isolation...');
    await registry.issueExpectation({
      id: 'EXP-SESSION',
      trigger: 'core.ts',
      condition: 'Session specific check',
      validationType: 'MANUAL',
      proof: null,
      sessionId: 'session-1',
      scope: 'SESSION'
    });

    const gk2 = new Gatekeeper(registry, { sessionId: 'session-2', mode: SafetyMode.PRESENT });
    const res2 = await gk2.intercept('core.ts');
    if (\!res2.allowed) throw new Error('Session expectation blocked a different session');
    console.log('✅ Passed: Session scope does not leak.');

    // Test 3: AFK Todo Generation
    console.log('Test 3: AFK Todo Generation...');
    const gkAFK = new Gatekeeper(registry, { sessionId: 'session-1', mode: SafetyMode.AFK });
    const blockRes = await gkAFK.intercept('.env'); // Should be blocked by EXP-GLOBAL
    if (blockRes.allowed) throw new Error('Should have been blocked');
    
    const todoExp = await gkAFK.handleBlock(blockRes.expectations[0]);
    if (\!todoExp.id.startsWith('EXP-TODO-')) throw new Error('Todo ID format incorrect');
    console.log(`✅ Passed: Generated ${todoExp.id} for blocked action.`);

    // Test 4: Proof Persistence (The "Compliance \!= Correctness" check)
    console.log('Test 4: Proof Persistence...');
    // Resolve the TODO, but NOT the original block
    await registry.updateState(todoExp.id, 'RESOLVED', 'verified-todo-entry');
    
    const res4 = await gkAFK.intercept('.env');
    if (res4.allowed) throw new Error('Resolving a TODO should not resolve the original blockage\!');
    console.log('✅ Passed: Original block persists after documentation is resolved.');

    console.log('\n✨ All logic tests passed successfully\!');
  } catch (e) {
    console.error(`\n❌ Test Failed: ${e.message}`);
    process.exit(1);
  }
}

runTests();
