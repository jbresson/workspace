import * as fs from 'fs';
import * as path from 'path';
import { ExpectationService } from './expectation_service';
import { GUARDRAIL_RULES, GUARDRAIL_PROFILES } from './rules_definition';

class GuardrailBootstrapper {
  constructor(registry) {
    this.registry = registry;
  }

  async activateProfile(profileName) {
    const profile = GUARDRAIL_PROFILES[profileName];
    if (!profile) throw new Error(`Profile ${profileName} not found`);

    console.log(`[BOOTSTRAP] Activating profile: ${profile.name}`);
    
    for (const ruleId of profile.activeRules) {
      const rule = GUARDRAIL_RULES[ruleId];
      if (!rule) continue;

      const active = await this.registry.findActive(rule.trigger, 'BOOTSTRAP');
      if (active.length === 0) {
        await this.registry.issueExpectation({
          id: rule.id,
          trigger: rule.trigger,
          condition: rule.condition,
          validationType: rule.validationType,
          sessionId: 'BOOTSTRAP',
          scope: rule.scope,
          metadata: { description: rule.description, risk: rule.risk }
        });
        console.log(`  + Activated ${rule.id}: ${rule.description}`);
      }
    }
  }

  async runTests() {
    console.log('[BOOTSTRAP] Running Rule Correctness Tests...');
    const tests = [
      { target: '/memory/ARCHITECTURE.md', expectedRule: 'RULE-1' },
      { target: '.pi/extensions/guardrails/expectations.jsonl', expectedRule: 'RULE-2' },
      { target: '.pi/some_file', expectedRule: 'RULE-3' },
      { target: 'todo.md', expectedRule: 'RULE-4' },
      { target: '~/.ssh/id_rsa', expectedRule: 'RULE-7' },
      { target: 'shell', expectedRule: 'RULE-9' },
    ];

    let passed = 0;
    for (const test of tests) {
      const active = await this.registry.findActive(test.target, 'TEST_SESSION');
      if (active.some(e => e.id === test.expectedRule)) {
        console.log(`  ✅ ${test.target} -> ${test.expectedRule}`);
        passed++;
      } else {
        console.error(`  ❌ ${test.target} failed to trigger ${test.expectedRule}. Found: ${active.map(e => e.id)}`);
      }
    }

    return passed === tests.length;
  }
}

(async () => {
  const rs = new ExpectationService();
  const boot = new GuardrailBootstrapper(rs);
  try {
    await boot.activateProfile('strict');
    const success = await boot.runTests();
    process.exit(success ? 0 : 1);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
