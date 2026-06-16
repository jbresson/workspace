import { Gatekeeper } from './gatekeeper';
import { GuardrailMode, GuardrailConfig } from './config';
import { GLOBAL_RULES } from './gatekeeper-rules';

describe('Gatekeeper hardening policy', () => {
  const TESTED_RULE_IDS = new Set([
    'RULE-READ-PERIMETER',
    'RULE-1',
    'RULE-SHELL-BLOCK',
    'RULE-5',
  ]);

  const originalHome = process.env.HOME;
  const baseDir = '/Users/john.bresson/workspace';

  const expectationServiceStub = {
    findActive: jest.fn(async () => []),
    issueExpectation: jest.fn(async () => ({})),
  } as any;

  let gatekeeper: Gatekeeper;

  beforeEach(() => {
    jest.spyOn(process, 'cwd').mockReturnValue(baseDir);
    process.env.HOME = '/Users/john.bresson';
    GuardrailConfig.getInstance().setMode(GuardrailMode.ENFORCE);
    expectationServiceStub.findActive.mockClear();
    gatekeeper = new Gatekeeper(expectationServiceStub);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.HOME = originalHome;
  });

  it('blocks write outside base dir', async () => {
    const result = await gatekeeper.intercept('s1', 'write', {
      path: '/Users/john.bresson/blocked_test.txt',
      content: 'x',
    });

    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('RULE-1');
    expect(result.reason).toMatch(/only permitted within the current working directory/i);
  });

  it('allows write inside base dir non-integrity path', async () => {
    const result = await gatekeeper.intercept('s1', 'write', {
      path: '/Users/john.bresson/workspace/tmp/ok.txt',
      content: 'ok',
    });

    expect(result.allowed).toBe(true);
  });

  it('blocks write in integrity zones', async () => {
    const result = await gatekeeper.intercept('s1', 'edit', {
      path: '/Users/john.bresson/workspace/memory/ARCHITECTURE.md',
      oldText: 'a',
      newText: 'b',
    });

    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('RULE-1');
    expect(result.reason).toMatch(/self-integrity zones/i);
  });

  it('blocks read of secret paths', async () => {
    const result = await gatekeeper.intercept('s1', 'ctx_read', {
      path: '/Users/john.bresson/.ssh/config',
    });

    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('RULE-READ-PERIMETER');
    expect(result.reason).toMatch(/secret-containing paths/i);
  });

  it('allows read of non-secret integrity docs per updated guidance', async () => {
    const result = await gatekeeper.intercept('s1', 'ctx_read', {
      path: '/Users/john.bresson/workspace/memory/ARCHITECTURE.md',
    });

    expect(result.allowed).toBe(true);
  });

  it('blocks raw shell tools', async () => {
    const result = await gatekeeper.intercept('s1', 'bash', {
      command: 'echo hello',
    });

    expect(result.allowed).toBe(false);
    expect(result.ruleId).toBe('RULE-SHELL-BLOCK');
  });

  it('blocks ctx_session reset and cleanup', async () => {
    const reset = await gatekeeper.intercept('s1', 'ctx_session', { action: 'reset' });
    const cleanup = await gatekeeper.intercept('s1', 'ctx_session', { action: 'cleanup' });

    expect(reset.allowed).toBe(false);
    expect(cleanup.allowed).toBe(false);
    expect(reset.ruleId).toBe('RULE-5');
    expect(cleanup.ruleId).toBe('RULE-5');
  });

  it('enforces coverage for every active guardrail rule', () => {
    const activeRuleIds = GLOBAL_RULES.map((r) => r.id).sort();
    const testedRuleIds = Array.from(TESTED_RULE_IDS).sort();

    expect(testedRuleIds).toEqual(activeRuleIds);
  });
});
