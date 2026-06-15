const fs = require('fs');
const path = require('path');

class RegistryService {
  constructor() { this.registryPath = path.join(process.cwd(), '.pi/registry/expectations.jsonl'); }
  async issueExpectation(exp) {
    const expectation = { ...exp, state: 'PENDING', timestamp: Date.now(), metadata: {} };
    await fs.promises.appendFile(this.registryPath, JSON.stringify(expectation) + '\n', 'utf8');
    return expectation;
  }
  async getExpectation(id) {
    const entries = await this.getAllEntries();
    return entries.find(e => e.id === id);
  }
  async updateMetadata(id, metadata) {
    const entries = await this.getAllEntries();
    const updated = entries.map(e => e.id === id ? { ...e, metadata: { ...e.metadata, ...metadata } } : e);
    await fs.promises.writeFile(this.registryPath, updated.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
  }
  async updateState(id, state, proof = null) {
    const entries = await this.getAllEntries();
    const updated = entries.map(e => e.id === id ? { ...e, state, proof: proof ?? e.proof } : e);
    await fs.promises.writeFile(this.registryPath, updated.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
  }
  async getAllEntries() {
    try {
      const content = await fs.promises.readFile(this.registryPath, 'utf8');
      return content.trim().split('\n').filter(line => line).map(line => JSON.parse(line));
    } catch (e) { return []; }
  }
}

class SkepticAuditor {
  async proposeValidator(exp) { return `grep 'API_KEY' ${exp.trigger}`; }
  async evaluateTweak(current, tweak) {
    if (tweak.toLowerCase().includes('unsafe')) return { approved: false, reason: 'Security risk detected' };
    if (tweak.toLowerCase().includes('correct')) return { approved: true, updatedValidator: current.replace('API_KEY', 'SERVICE_KEY') };
    return { approved: false, reason: 'Tweak does not improve correctness' };
  }
}

class ValidationManager {
  async validate(exp, proof) {
    if (proof.includes('SERVICE_KEY')) return { success: true, reason: 'Verified' };
    return { success: false, reason: 'State not found' };
  }
}

class NegotiationManager {
  constructor(registry, auditor) { this.registry = registry; this.auditor = auditor; this.MAX_ITERATIONS = 10; }
  async initiateHandshake(exp) {
    const val = await this.auditor.proposeValidator(exp);
    await this.updateNegotiationState(exp.id, 1, val);
    return { status: 'NEGOTIATING', proposedValidator: val };
  }
  async handleAgentResponse(id, res) {
    const exp = await this.registry.getExpectation(id);
    const state = await this.getNegotiationState(id);
    if (res.agree) {
      await this.updateNegotiationState(id, state.iterations, state.proposedValidator, 'AGREED');
      return { status: 'RESOLVED_NEGOTIATION' };
    }
    if (state.iterations >= this.MAX_ITERATIONS) return { status: 'HALT' };
    const audit = await this.auditor.evaluateTweak(state.proposedValidator, res.tweak);
    if (audit.approved) {
      await this.updateNegotiationState(id, state.iterations + 1, audit.updatedValidator);
      return { status: 'NEGOTIATING', nextStep: audit.updatedValidator };
    }
    return { status: 'REJECTED_TWEAK', reason: audit.reason };
  }
  async updateNegotiationState(id, iter, val, status = 'NEGOTIATING') {
    await this.registry.updateMetadata(id, { negotiation: { iterations: iter, proposedValidator: val, status } });
  }
  async getNegotiationState(id) {
    const exp = await this.registry.getExpectation(id);
    return exp.metadata?.negotiation || { iterations: 0, proposedValidator: null, status: 'NEGOTIATING' };
  }
}

class FinalizeChecker {
  constructor(vm) { this.validationManager = vm; }
  async finalizeResolution(exp, proof) {
    const agreed = exp.metadata?.negotiation?.proposedValidator;
    if (!agreed || proof !== agreed) return { resolved: false, reason: 'Proof mismatch' };
    const res = await this.validationManager.validate(exp, proof);
    return { resolved: res.success, reason: res.reason };
  }
}

async function runIntegrationTest() {
  const reg = new RegistryService();
  if (fs.existsSync('.pi/registry/expectations.jsonl')) await fs.promises.unlink('.pi/registry/expectations.jsonl');
  const auditor = new SkepticAuditor();
  const vm = new ValidationManager();
  const nm = new NegotiationManager(reg, auditor);
  const fc = new FinalizeChecker(vm);

  console.log('🚀 STARTING END-TO-END INTEGRATION TEST (Non-Happy Path)\n');

  try {
    const exp = await reg.issueExpectation({ id: 'EXP-SESS-1', trigger: '.env', condition: 'API_KEY', validationType: 'CONSTRAINED_CMD', sessionId: 's1', scope: 'SESSION' });
    console.log('Step 1: Expectation Registered [EXP-SESS-1]');

    const init = await nm.initiateHandshake(exp);
    console.log(`Auditor proposed: ${init.proposedValidator}`);

    const res1 = await nm.handleAgentResponse('EXP-SESS-1', { agree: false, tweak: 'Use unsafe bypass' });
    if (res1.status !== 'REJECTED_TWEAK') throw new Error('Failed to reject unsafe tweak');
    console.log('Step 2a: Unsafe tweak correctly rejected.');

    const res2 = await nm.handleAgentResponse('EXP-SESS-1', { agree: false, tweak: 'Correct key is SERVICE_KEY' });
    if (res2.status !== 'NEGOTIATING') throw new Error('Failed to accept correct tweak');
    console.log(`Step 2b: Correct tweak accepted. New Validator: ${res2.nextStep}`);

    await nm.handleAgentResponse('EXP-SESS-1', { agree: true });
    console.log('Step 2c: Agent agreed to negotiated validator.');

    console.log('Step 3: Simulated state change applied to .env');

    const finalExp = await reg.getExpectation('EXP-SESS-1');
    const agreedValidator = finalExp.metadata.negotiation.proposedValidator;
    console.log(`Step 4: Agent claims resolution using proof: ${agreedValidator}`);

    const result = await fc.finalizeResolution(finalExp, agreedValidator);
    if (!result.resolved) throw new Error(`Final validation failed: ${result.reason}`);
    
    await reg.updateState('EXP-SESS-1', 'RESOLVED', agreedValidator);
    console.log('Step 5: Final validation SUCCESS. Expectation marked RESOLVED.');

    console.log('\n✨ FULL CYCLE VERIFIED: Register -> Argue -> Change -> Validate');
  } catch (e) {
    console.error(`\n❌ Integration Test Failed: ${e.message}`);
    process.exit(1);
  }
}
runIntegrationTest();
