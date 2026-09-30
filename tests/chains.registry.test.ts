import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OLIClient } from '../src';
import {
  CHAINS,
  CHAIN_OPTIONS,
  convertChainId,
  createChainRegistry,
  getChainOptions,
  isKnownChain,
  normalizeChainId,
  parseCaip10
} from '../src/chains.entry';
import { validateChain } from '../src/validation.entry';

const ADDRESS = '0x1234567890123456789012345678901234567890';
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

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

test.describe('chain validation without a chain list', () => {
  test('validateChain accepts any well-formed EVM chain ID', () => {
    for (const value of ['eip155:1', 'eip155:99999', 'eip155:any', 'starknet:SN_MAIN']) {
      assert.equal(validateChain(value), null, `value: ${value}`);
    }
  });

  test('validateChain rejects malformed EVM IDs and unknown non-EVM chains', () => {
    for (const value of ['eip155:abc', 'eip155:0', 'eip155:', 'EIP155:1', 'starknet:sn_main', 'foo:bar', SOLANA]) {
      assert.match(validateChain(value) ?? '', /Invalid chain/, `value: ${value}`);
    }
    assert.equal(validateChain(''), 'Chain is required');
  });

  test('convertChainId turns numeric and CAIP-2 input into eip155 IDs without a lookup', () => {
    assert.equal(convertChainId('99999'), 'eip155:99999');
    assert.equal(convertChainId(' EIP155:99999 '), 'eip155:99999');
    assert.equal(convertChainId('starknet:sn_main'), 'starknet:SN_MAIN');
    assert.equal(convertChainId('not-a-chain'), '');
  });

  test('validateSingle accepts an unlisted EVM chain with a CHAIN_UNRECOGNIZED warning', async () => {
    const oli = new OLIClient();
    const result = await oli.attest.validateSingle({ chain_id: 'eip155:99999', address: ADDRESS });

    assert.equal(result.valid, true);
    assert.ok(result.diagnostics.warnings.some((entry) => entry.code === 'CHAIN_UNRECOGNIZED'));
  });

  test('validateSingle does not warn for listed chains or eip155:any', async () => {
    const oli = new OLIClient();
    for (const chainId of ['eip155:4663', 'eip155:any']) {
      const result = await oli.attest.validateSingle({ chain_id: chainId, address: ADDRESS });
      assert.equal(result.valid, true);
      assert.ok(!result.diagnostics.warnings.some((entry) => entry.code === 'CHAIN_UNRECOGNIZED'), chainId);
    }
  });

  test('validateSingle infers chain_id from a CAIP-10 address on an unlisted EVM chain', async () => {
    const oli = new OLIClient();
    const result = await oli.attest.validateSingle({ address: `eip155:99999:${ADDRESS}` });

    assert.equal(result.valid, true);
    assert.equal(result.row.chain_id, 'eip155:99999');
    assert.equal(result.row.address, ADDRESS);
  });
});

test.describe('host-supplied chain registry', () => {
  const chainRegistry = createChainRegistry({
    chains: [
      { id: 'newchain', name: 'New Chain', caip2: 'eip155:99999' },
      { id: 'solana', name: 'Solana', caip2: SOLANA },
      { id: 'ethereum', name: 'Ethereum Mainnet', caip2: 'eip155:1' }
    ],
    aliases: { nc: 'eip155:99999' }
  });

  test('resolves host chain names, ids and aliases', () => {
    for (const input of ['newchain', 'New Chain', 'nc', '99999']) {
      assert.equal(convertChainId(input, chainRegistry), 'eip155:99999', `input: ${input}`);
    }
    assert.equal(convertChainId('newchain'), '', 'built-in registry does not know host chains');
  });

  test('keeps built-in chains and aliases unless includeBuiltIn is false', () => {
    assert.equal(convertChainId('robinhood', chainRegistry), 'eip155:4663');
    assert.equal(convertChainId('arb', chainRegistry), 'eip155:42161');

    const hostOnly = createChainRegistry({ chains: [{ name: 'New Chain', caip2: 'eip155:99999' }], includeBuiltIn: false });
    assert.equal(convertChainId('robinhood', hostOnly), '');
    assert.deepEqual(getChainOptions(hostOnly), [{ value: 'eip155:99999', label: 'New Chain' }]);
  });

  test('host chains override built-in entries with the same CAIP-2 ID', () => {
    const options = getChainOptions(chainRegistry);
    assert.deepEqual(options.filter((option) => option.value === 'eip155:1'), [{ value: 'eip155:1', label: 'Ethereum Mainnet' }]);
  });

  test('non-EVM host chains become valid only through the registry', () => {
    assert.equal(validateChain(SOLANA, chainRegistry), null);
    assert.equal(isKnownChain(SOLANA, chainRegistry), true);
    assert.equal(normalizeChainId(SOLANA.replace('solana', 'SOLANA'), chainRegistry), SOLANA);
  });

  test('rejects malformed host chains', () => {
    assert.throws(() => createChainRegistry({ chains: [{ name: 'Bad', caip2: 'not a chain' }] }), /invalid CAIP-2/);
    assert.throws(() => createChainRegistry({ chains: [{ name: ' ', caip2: 'eip155:5' }] }), /missing a name/);
  });

  test('getChainOptions() without a registry matches CHAIN_OPTIONS', () => {
    assert.deepEqual(getChainOptions(), CHAIN_OPTIONS);
  });

  test('validateSingle uses the registry: no warning for host chains', async () => {
    const oli = new OLIClient();
    const result = await oli.attest.validateSingle({ chain_id: 'eip155:99999', address: ADDRESS }, { chainRegistry });

    assert.equal(result.valid, true);
    assert.ok(!result.diagnostics.warnings.some((entry) => entry.code === 'CHAIN_UNRECOGNIZED'));
  });

  test('parseCsv converts host chain names in the chain_id column', async () => {
    const oli = new OLIClient();
    const csv = ['chain_id,address', `New Chain,${ADDRESS}`, `nc,${ADDRESS}`].join('\n');
    const parsed = await oli.attest.parseCsv(csv, { chainRegistry });

    assert.deepEqual(parsed.rows.map((row) => row.chain_id), ['eip155:99999', 'eip155:99999']);
  });

  test('prepareSingleAttestation passes the registry to validation', async () => {
    const oli = new OLIClient();
    const prepared = await oli.attest.prepareSingleAttestation(
      { chain_id: SOLANA, address: 'So11111111111111111111111111111111111111112' },
      { chainRegistry }
    );

    assert.equal(prepared.chainId, SOLANA);
    await assert.rejects(
      oli.attest.prepareSingleAttestation({ chain_id: SOLANA, address: 'So11111111111111111111111111111111111111112' }),
      /failed validation/
    );
  });
});
