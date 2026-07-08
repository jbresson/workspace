/**
 * Test: Librarian Stewardship Engine - Kernel Primitives
 * 
 * Validates:
 * 1. BinaryResolver can locate lean-ctx
 * 2. OutputParser correctly parses compression stats
 * 3. PathResolver enforces wip/ mirror logic
 * 4. LedgerManager creates atomic entries
 * 5. LibrarianService orchestrates all verbs
 */

import * as assert from 'assert';
import { test } from 'node:test';

import {
  BinaryResolver,
  OutputParser,
  PathResolver,
  LedgerManager,
  LibrarianService,
} from './index';

test('BinaryResolver: resolve lean-ctx binary', () => {
  const result = BinaryResolver.resolve('lean-ctx');
  assert.strictEqual(result.isValid, true, 'lean-ctx should be available');
  assert.strictEqual(result.binary.includes('lean-ctx'), true);
});

test('BinaryResolver: cache resolution', () => {
  const result1 = BinaryResolver.resolve('lean-ctx');
  const result2 = BinaryResolver.resolve('lean-ctx');
  assert.strictEqual(result1.binary, result2.binary);
});

test('BinaryResolver: handle missing binary', () => {
  const result = BinaryResolver.resolve('nonexistent-binary-xyz');
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error);
});

test('OutputParser: parse lean-ctx compression footer', () => {
  const output = 'Some content\nCompressed 100 → 50 tokens (-50%)';
  const stats = OutputParser.parseCompressionFooter(output);
  assert.strictEqual(stats?.original, 100);
  assert.strictEqual(stats?.compressed, 50);
  assert.strictEqual(stats?.ratio, -50);
  assert.strictEqual(stats?.savings, 50);
});

test('OutputParser: extract content without footer', () => {
  const output = 'Important content\nCompressed 100 → 50 tokens (-50%)';
  const content = OutputParser.extractContent(output);
  assert.strictEqual(content, 'Important content');
});

test('OutputParser: build structured result', () => {
  const stats = { original: 100, compressed: 50, ratio: -50, savings: 50 };
  const result = OutputParser.buildResult('content', stats, 'cli');
  assert.strictEqual(result.content, 'content');
  assert.strictEqual(result.metadata.tokensSaved, 50);
  assert.strictEqual(result.metadata.compressionRatio, -50);
});

test('PathResolver: identify canonical paths', () => {
  assert.strictEqual(PathResolver.isCanonicalPath('src/index.ts'), true);
  assert.strictEqual(PathResolver.isCanonicalPath('.pi/extensions/foo.ts'), true);
  assert.strictEqual(PathResolver.isCanonicalPath('wip/something.ts'), false);
});

test('PathResolver: resolve canonical to wip mirror', () => {
  const resolved = PathResolver.toWipMirror('src/index.ts');
  assert.strictEqual(resolved, 'wip/primary/src/index.ts');
});

test('PathResolver: enforce wip mirror for canonical paths', () => {
  const result = PathResolver.resolve('src/index.ts', true);
  assert.strictEqual(result.isMirror, true);
  assert.strictEqual(result.isCanonical, true);
  assert.strictEqual(result.resolved, 'wip/primary/src/index.ts');
});

test('PathResolver: pass-through temp paths', () => {
  const result = PathResolver.resolve('wip/test.ts', true);
  assert.strictEqual(result.isMirror, false);
  assert.strictEqual(result.resolved, 'wip/test.ts');
});

test('PathResolver: implement create-only gate', () => {
  const result1 = PathResolver.checkCreateOnlyGate('/nonexistent/file-xyz.ts');
  assert.strictEqual(result1.allowed, true);

  // Create a temp file
  const fs = require('fs');
  const testFile = '/tmp/test-librarian-gate.txt';
  fs.writeFileSync(testFile, 'test');
  const result2 = PathResolver.checkCreateOnlyGate(testFile);
  assert.strictEqual(result2.allowed, false);
  assert.ok(result2.reason?.includes('already exists'));
  fs.unlinkSync(testFile);
});

test('LedgerManager: create and append entries', async () => {
  const ledger = new LedgerManager('test-ticket');
  const result = await ledger.recordDraft('src/index.ts', 'wip/primary/src/index.ts', true);
  assert.strictEqual(result.success, true);
  assert.ok(result.ledgerId);
  assert.ok(result.ledgerRef);
});

test('LedgerManager: generate unique IDs', async () => {
  const ledger = new LedgerManager('test-ticket-2');
  const r1 = await ledger.append('finding', { test: 1 });
  const r2 = await ledger.append('finding', { test: 2 });
  assert.notStrictEqual(r1.ledgerId, r2.ledgerId);
});

test('LibrarianService: initialize with ledger', () => {
  const service = new LibrarianService('test-service');
  const ledgerPath = service.getLedgerPath();
  assert.ok(ledgerPath.includes('BUDDY.md'));
});

test('LibrarianService: execute index verb', async () => {
  const service = new LibrarianService('test-service');
  const result = await service.index();
  assert.strictEqual(result.success, true);
  assert.ok(result.data);
  assert.ok(result.metadata?.tokensSaved !== undefined);
});

test('LibrarianService: execute fetch verb', async () => {
  // Create temp file
  const fs = require('fs');
  const testFile = '/tmp/librarian-fetch-test.txt';
  fs.writeFileSync(testFile, 'line 1\nline 2\nline 3\n');

  const service = new LibrarianService('test-service');
  const result = await service.fetch(testFile);
  assert.strictEqual(result.success, true);
  assert.ok(result.data?.includes('line 1'));

  fs.unlinkSync(testFile);
});

test('LibrarianService: execute draft verb (to wip mirror)', async () => {
  const service = new LibrarianService('test-service');
  const result = await service.draft('wip/test-draft.txt', 'test content');
  assert.strictEqual(result.success, true);
  assert.ok(result.ledgerRef);

  // Verify file was created in wip
  const fs = require('fs');
  assert.ok(fs.existsSync('wip/test-draft.txt'));
});

test('LibrarianService: enforce create-only gate for draft', async () => {
  const service = new LibrarianService('test-service');
  const result = await service.draft('wip/test-draft.txt', 'new content');
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes('already exists'));
});

test('LibrarianService: execute amend verb', async () => {
  const service = new LibrarianService('test-service');
  const result = await service.amend(
    'wip/test-draft.txt',
    'test content',
    'amended content'
  );
  assert.strictEqual(result.success, true);

  // Verify content was updated
  const fs = require('fs');
  const content = fs.readFileSync('wip/test-draft.txt', 'utf-8');
  assert.strictEqual(content, 'amended content');
});

test('LibrarianService: execute note verb', async () => {
  const service = new LibrarianService('test-service');
  const result = await service.note('finding', {
    fact: 'test fact',
    confidence: 'high',
  });
  assert.strictEqual(result.success, true);
  assert.ok(result.ledgerRef);
});

test('LibrarianService: execute audit verb', async () => {
  const service = new LibrarianService('test-service');
  const result = await service.audit('wip/test-draft.txt');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data?.passed, true);
});
