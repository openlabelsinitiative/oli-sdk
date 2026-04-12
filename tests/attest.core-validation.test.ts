import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OLIClient } from '../src';

const PROJECTS = [
  { owner_project: 'growthepie', display_name: 'Growthepie' },
  { owner_project: 'uniswap', display_name: 'Uniswap' }
];

test.describe('attest core + validation', () => {
  test('prepareSingleAttestation builds frontend-compatible encoded payload + tags', async () => {
    const oli = new OLIClient();

    const prepared = await oli.attest.prepareSingleAttestation(
      {
        chain_id: 'eip155:1',
        address: '0x52908400098527886e0f7030069857d2e4169ee7',
        'erc20.decimals': '18',
        deployment_date: '2025-01-01T12:30',
        erc_type: 'erc20,erc721',
        contract_name: 'Example'
      },
      {
        mode: 'advancedProfile',
        projects: PROJECTS,
        validate: true
      }
    );

    assert.equal(prepared.network.chainId, 8453);
    assert.equal(prepared.tags['erc20.decimals'], 18);
    assert.equal(prepared.tags.deployment_date, '2025-01-01 12:30');
    assert.deepEqual(prepared.tags.erc_type, ['erc20', 'erc721']);
    assert.match(prepared.encodedData, /^0x[0-9a-f]+$/i);
    assert.equal(prepared.caip10, 'eip155:1:0x52908400098527886E0F7030069857D2E4169EE7');
    assert.equal(prepared.request.recipient, '0x0000000000000000000000000000000000000002');
  });

  test('validateSingle rejects invalid mixed-case checksum addresses', async () => {
    const oli = new OLIClient();

    const result = await oli.attest.validateSingle(
      {
        chain_id: 'eip155:1',
        address: '0x52908400098527886E0F7030069857D2E4169Ee7'
      },
      {
        mode: 'simpleProfile',
        projects: PROJECTS
      }
    );

    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.errors.some((entry) => entry.code === 'ADDRESS_INVALID'));
  });

  test('validateSingle returns category alias conversion as suggestion/conversion (not hard error)', async () => {
    const oli = new OLIClient();

    const result = await oli.attest.validateSingle(
      {
        chain_id: 'eip155:1',
        address: '0x1234567890123456789012345678901234567890',
        usage_category: 'defi'
      },
      {
        mode: 'simpleProfile',
        projects: PROJECTS
      }
    );

    assert.equal(result.valid, true);
    assert.equal(result.diagnostics.errors.length, 0);
    assert.ok(
      result.diagnostics.conversions.some((entry) => entry.code === 'CATEGORY_ALIAS_SUGGESTION' && entry.suggestion === 'dex')
    );
  });

  test('validateBulk enforces max 50 guardrail', async () => {
    const oli = new OLIClient();

    const rows = Array.from({ length: 51 }, (_, index) => ({
      chain_id: 'eip155:1',
      address: `0x${(index + 1).toString(16).padStart(40, '0')}`
    }));

    const result = await oli.attest.validateBulk(rows, {
      mode: 'simpleProfile',
      projects: PROJECTS
    });

    assert.equal(result.valid, false);
    assert.ok(result.diagnostics.errors.some((entry) => entry.code === 'BULK_ROW_LIMIT_EXCEEDED'));
  });

  test('validateBulk with allowedFields ignores validation for fields outside scope', async () => {
    const oli = new OLIClient();

    const result = await oli.attest.validateBulk(
      [
        {
          chain_id: 'eip155:1',
          address: '0x1234567890123456789012345678901234567890',
          deployment_tx: 'bad-hash'
        }
      ],
      {
        mode: 'advancedProfile',
        projects: PROJECTS,
        allowedFields: ['chain_id', 'address', 'contract_name', 'usage_category', 'owner_project']
      }
    );

    assert.equal(result.valid, true);
    assert.ok(!result.diagnostics.errors.some((entry) => entry.code === 'TX_HASH_INVALID'));
    assert.equal(result.rows[0].deployment_tx, undefined);
  });

  test('parseCsv supports fuzzy headers, chain normalization, and CAIP-10 parsing', async () => {
    const oli = new OLIClient();

    const csv = [
      'origin key,address,usage category,paymaster category,owner project',
      'mainnet,eip155:1:0x1234567890123456789012345678901234567890,defi,verify,growthpie',
      '1,0xabcdefabcdefabcdefabcdefabcdefabcdefabcd,nft,both,uniswap'
    ].join('\n');

    const parsed = await oli.attest.parseCsv(csv, {
      mode: 'advancedProfile',
      projects: PROJECTS
    });

    assert.equal(parsed.rows.length, 2);
    assert.equal(parsed.rows[0].chain_id, 'eip155:1');
    assert.equal(parsed.rows[0].address, '0x1234567890123456789012345678901234567890');
    assert.equal(parsed.rows[0].usage_category, 'dex');
    assert.equal(parsed.rows[0].paymaster_category, 'verifying');
    assert.ok(parsed.diagnostics.conversions.some((entry) => entry.code === 'CHAIN_NORMALIZED'));
    assert.ok(parsed.diagnostics.errors.some((entry) => entry.code === 'PROJECT_INVALID'));
  });

  test('parseCsv with allowedFields excludes non-allowed mapped columns', async () => {
    const oli = new OLIClient();

    const csv = [
      'chain_id,address,contract_name,usage_category,owner_project,deployment_tx',
      'eip155:1,0x1234567890123456789012345678901234567890,Demo,dex,uniswap,invalid'
    ].join('\n');

    const parsed = await oli.attest.parseCsv(csv, {
      mode: 'advancedProfile',
      projects: PROJECTS,
      allowedFields: ['chain_id', 'address', 'contract_name', 'usage_category', 'owner_project']
    });

    assert.deepEqual(parsed.columns, ['chain_id', 'address', 'contract_name', 'usage_category', 'owner_project']);
    assert.equal(parsed.rows[0].deployment_tx, undefined);
  });
});
