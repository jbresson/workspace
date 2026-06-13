const fs = require('fs');
const path = require('path');

class RegistryService {
  constructor() {
    this.registryPath = path.join(process.cwd(), '.pi/registry/expectations.jsonl');
  }
  async issueExpectation(exp) {
    const expectation = { ...exp, state: 'PENDING', timestamp: Date.now() };
    await fs.promises.appendFile(this.registryPath, JSON.stringify(expectation) + '\n', 'utf8');
    return expectation;
  }
  async updateState(id, state, proof = null) {
    const entries = await this.getAllEntries();
    let found = false;
    const updatedEntries = entries.map(entry => {
      if (entry.id === id) {
        found = true;
        return { ...entry, state, proof: proof ?? entry.proof };
      }
      return entry;
    });
    if (found) {
      await fs.promises.writeFile(this.registryPath, updatedEntries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    }
    return found;
  }
  async findActive(trigger, sessionId) {
    const entries = await this.getAllEntries();
    return entries.filter(e => e.state === 'PENDING' && e.trigger === trigger && (e.scope === 'GLOBAL' || e.sessionId === sessionId));
  }
  async getAllEntries() {
    try {
      const content = await fs.promises.readFile(this.registryPath, 'utf8');
      return content.trim().split('\n').filter(line => line).map(line => JSON.parse(line));
    } catch (e) { return []; }
  }
}

class Gatekeeper {
  constructor(registry, config) {
    this.registry = registry;
    this.config = config;
  }
  async intercept(actionTarget) {
    const active = await this.registry.findActive(actionTarget, this.config.sessionId);
    if (active.length === 0) return { allowed: true, expectations: [] };
    return { allowed: false, expectations: active };
  }
  async handleBlock(originalExp) {
    return await this.registry.issueExpectation({
      id: `EXP-TODO-${originalExp.id}`,
      trigger: 'todo.md',
      condition: `Document block and dependency analysis for ${originalExp.id}`,
      validationType: 'SANDBOXED_TS',
      proof: null,
      sessionId: this.config.sessionId,
      scope: 'SESSION',
      metadata: { linkedTo: originalExp.id }
    });
  }
}

async function runTests() {
  const registry = new RegistryService();
  if (fs.existsSync('.pi/registry/expectations.jsonl')) await fs.promises.unlink('.pi/registry/expectations.jsonl');
  console.log('🚀 Starting Guardrail Logic Tests...\n');
  try {
    console.log('Test 1: Global Scope Enforcement...');
    await registry.issueExpectation({ id: 'EXP-GLOBAL', trigger: '.env', condition: 'Global Safety Check', validationType: 'MANUAL', proof: null, sessionId: 'session-1', scope: 'GLOBAL' });
    const gk1 = new Gatekeeper(registry, { sessionId: 'session-2', mode: 'PRESENT' });
    const res1 = await gk1.intercept('.env');
    if (res1.allowed) throw new Error('Global expectation failed to block different session');
    console.log('✅ Passed: Global scope blocks all sessions.');

    console.log('Test 2: Session Isolation...');
    await registry.issueExpectation({ id: 'EXP-SESSION', trigger: 'core.ts', condition: 'Session specific check', validationType: 'MANUAL', proof: null, sessionId: 'session-1', scope: 'SESSION' });
    const gk2 = new Gatekeeper(registry, { sessionId: 'session-2', mode: 'PRESENT' });
    const res2 = await gk2.intercept('core.ts');
    if (res2.allowed === false) throw new Error('Session expectation blocked a different session');
    console.log('✅ Passed: Session scope does not leak.');

    console.log('Test 3: AFK Todo Generation...');
    const gkAFK = new Gatekeeper(registry, { sessionId: 'session-1', mode: 'AFK' });
    const blockRes = await gkAFK.intercept('.env');
    if (blockRes.allowed) throw new Error('Should have been blocked');
    const todoExp = await gkAFK.handleBlock(blockRes.expectations[0]);
    if (\!todoExp.id.startsWith('EXP-TODO-')) throw new Error('Todo ID format incorrect');
    console.log(`✅ Passed: Generated ${todoExp.id} for blocked action.`);

    console.log('Test 4: Proof Persistence...');
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
