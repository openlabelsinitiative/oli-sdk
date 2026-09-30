import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAINS, CHAIN_OPTIONS, convertChainId, normalizeChainId, parseCaip10 } from '../src/chains.entry';
import { validateChain } from '../src/validation.entry';

test.describe('chain registry', () => {
  test('Robinhood Chain (eip155:4663) passes chain validation', () => {
    assert.equal(validateChain('eip155:4663'), null);
  });

  test('convertChainId resolves Robinhood Chain spellings to eip155:4663', () => {
    for (const input of ['robinhood', 'Robinhood Chain', '4663', 'eip155:4663']) {
      assert.equal(convertChainId(input), 'eip155:4663', `input: ${input}`);
    }
  });

  test('CHAIN_OPTIONS includes Robinhood Chain', () => {
    assert.ok(
      CHAIN_OPTIONS.some((option) => option.value === 'eip155:4663' && option.label === 'Robinhood Chain')
    );
  });

  test('Robinhood Chain is recognised by CAIP helpers', () => {
    assert.equal(normalizeChainId('eip155:4663'), 'eip155:4663');
    const parts = parseCaip10('eip155:4663:0x0000000000000000000000000000000000000001');
    assert.equal(parts?.chainId, 'eip155:4663');
    assert.equal(parts?.isKnownChain, true);
  });

  test('"any" remains the last chain entry', () => {
    assert.equal(CHAINS[CHAINS.length - 1].id, 'any');
  });
});
