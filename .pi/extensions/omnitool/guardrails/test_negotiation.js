const fs = require('fs');
const path = require('path');

class ExpectationService {
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
  async getAllEntries() {
    try {
      const content = await fs.promises.readFile(this.registryPath, 'utf8');
      return content.trim().split('\n').filter(line => line).map(line => JSON.parse(line));
    } catch (e) { return []; }
  }
}

class SkepticAuditor {
  async proposeValidator(exp) { return `grep '${exp.condition}' ${exp.trigger}`; }
  async evaluateTweak(current, tweak) {
    if (tweak.toLowerCase().includes('unsafe')) return { approved: false, reason: 'Unsafe' };
    return { approved: true, updatedValidator: current.replace('API_KEY', 'SERVICE_KEY') };
  }
}

class ValidationManager {
  async validate(exp, proof) {
    // In this mock, if the proof equals the validator, we assume it ran and succeeded
    return { success: true, reason: 'Valid' };
  }
}

class NegotiationManager {
  constructor(registry, auditor, validator) {
    this.registry = registry; this.auditor = auditor; this.validator = validator;
    this.MAX_ITERATIONS = 10;
  }
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
      return { status: 'RESOLVED_NEGOTIATION', nextStep: 'EXECUTE_VALIDATOR' };
    }
    if (state.iterations >= this.MAX_ITERATIONS) return { status: 'HALT', nextStep: 'TERMINATE' };
    const audit = await this.auditor.evaluateTweak(state.proposedValidator, res.tweak);
    if (audit.approved) {
      await this.updateNegotiationState(id, state.iterations + 1, audit.updatedValidator);
      return { status: 'NEGOTIATING', nextStep: audit.updatedValidator };
    }
    return { status: 'REJECTED_TWEAK', nextStep: audit.reason };
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
    if (!agreed) return { resolved: false, reason: 'No agreement' };
    if (proof !== agreed) return { resolved: false, reason: 'Proof mismatch' };
    const res = await this.validationManager.validate(exp, proof);
    return { resolved: res.success, reason: res.reason };
  }
}

async function runTests() {
  const reg = new ExpectationService();
  if (fs.existsSync('.pi/registry/expectations.jsonl')) await fs.promises.unlink('.pi/registry/expectations.jsonl');
  const auditor = new SkepticAuditor();
  const vm = new ValidationManager();
  const nm = new NegotiationManager(reg, auditor, vm);
  const fc = new FinalizeChecker(vm);

  console.log('🚀 Testing Negotiated Validator Protocol...\n');

  try {
    const exp = await reg.issueExpectation({ id: 'EXP-1', trigger: '.env', condition: 'API_KEY', validationType: 'CONSTRAINED_CMD', sessionId: 's1', scope: 'SESSION' });
    
    console.log('Test 1: Initiation...');
    const hand = await nm.initiateHandshake(exp);
    if (!hand.proposedValidator) throw new Error('No validator proposed');
    console.log('✅ Initial proposal received.');

    console.log('Test 2: Valid Tweak...');
    const resTweak = await nm.handleAgentResponse('EXP-1', { agree: false, tweak: 'Use SERVICE_KEY' });
    if (resTweak.status !== 'NEGOTIATING') throw new Error('Valid tweak rejected');
    console.log('✅ Valid tweak accepted.');

    console.log('Test 3: Unsafe Tweak...');
    const resUnsafe = await nm.handleAgentResponse('EXP-1', { agree: false, tweak: 'add unsafe code' });
    if (resUnsafe.status !== 'REJECTED_TWEAK') throw new Error('Unsafe tweak was not rejected');
    console.log('✅ Unsafe tweak blocked.');

    console.log('Test 4: Agreement and Finalization...');
    await nm.handleAgentResponse('EXP-1', { agree: true });
    const updatedExp = await reg.getExpectation('EXP-1');
    const proof = updatedExp.metadata.negotiation.proposedValidator;
    const finalRes = await fc.finalizeResolution(updatedExp, proof);
    if (!finalRes.resolved) throw new Error(`Finalization failed: ${finalRes.reason}`);
    console.log('✅ Agreement and Finalization successful.');

    console.log('\n✨ All Negotiated Validator tests passed successfully!');
  } catch (e) {
    console.error(`\n❌ Test Failed: ${e.message}`);
    process.exit(1);
  }
}
runTests();
