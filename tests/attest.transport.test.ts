import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OLIClient, AttestValidationError } from '../src';
import type { OnchainAttestationRequest, OnchainSubmitContext, OnchainTxResult, OnchainWalletAdapter } from '../src/attest';

const PROJECTS = [{ owner_project: 'growthepie', display_name: 'Growthepie' }];

function createMockAdapter(overrides: Partial<OnchainWalletAdapter> = {}): OnchainWalletAdapter {
  const base: OnchainWalletAdapter = {
    name: 'mock-adapter',
    async getChainId() {
      return 8453;
    },
    async switchNetwork() {
      return;
    },
    async isSponsorshipSupported() {
      return false;
    },
    async attest(_request: OnchainAttestationRequest, _context: OnchainSubmitContext): Promise<OnchainTxResult> {
      return {
        status: 'success',
        txHash: '0xabc',
        uids: ['0xuid1']
      };
    },
    async multiAttest(requests: OnchainAttestationRequest[]): Promise<OnchainTxResult> {
      return {
        status: 'success',
        txHash: '0xbulk',
        uids: requests.map((_, index) => `0xuid${index + 1}`)
      };
    }
  };

  return {
    ...base,
    ...overrides
  };
}

test.describe('attest transport boundaries', () => {
  test('single submit uses sponsored path fallback to regular', async () => {
    const oli = new OLIClient();
    let switchedTo: number | null = null;
    let sponsoredCalled = false;
    let regularCalled = false;

    const prepared = await oli.attest.prepareSingleAttestation(
      {
        chain_id: 'eip155:1',
        address: '0x1234567890123456789012345678901234567890',
        owner_project: 'growthepie'
      },
      {
        mode: 'simpleProfile',
        projects: PROJECTS
      }
    );

    const adapter = createMockAdapter({
      async switchNetwork(chainId) {
        switchedTo = chainId;
      },
      async isSponsorshipSupported() {
        return true;
      },
      async sponsoredAttest() {
        sponsoredCalled = true;
        throw new Error('sponsored unavailable');
      },
      async attest() {
        regularCalled = true;
        return {
          status: 'success',
          txHash: '0xregular',
          uids: ['0xuid_fallback']
        };
      }
    });

    const result = await oli.attest.submitSingleOnchain(prepared, adapter);

    assert.equal(switchedTo, 8453);
    assert.equal(sponsoredCalled, true);
    assert.equal(regularCalled, true);
    assert.equal(result.sponsored, false);
    assert.equal(result.txHash, '0xregular');
    assert.deepEqual(result.uids, ['0xuid_fallback']);
    assert.equal(result.status, 'success');
  });

  test('bulk submit normalizes row-level results', async () => {
    const oli = new OLIClient();

    const rows = [
      {
        chain_id: 'eip155:1',
        address: '0x1234567890123456789012345678901234567890',
        owner_project: 'growthepie'
      },
      {
        chain_id: 'eip155:1',
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        owner_project: 'growthepie'
      }
    ];

    const adapter = createMockAdapter({
      async multiAttest() {
        return {
          status: 'success',
          txHash: '0xbulk123',
          uids: ['0xuid_1', '0xuid_2']
        };
      }
    });

    const result = await oli.attest.submitBulkOnchain(rows, adapter);

    assert.equal(result.status, 'success');
    assert.equal(result.txHash, '0xbulk123');
    assert.deepEqual(result.uids, ['0xuid_1', '0xuid_2']);
    assert.deepEqual(
      result.results.map((entry) => ({ row: entry.row, uid: entry.uid, status: entry.status })),
      [
        { row: 0, uid: '0xuid_1', status: 'success' },
        { row: 1, uid: '0xuid_2', status: 'success' }
      ]
    );
  });

  test('bulk submit rejects invalid rows before transport', async () => {
    const oli = new OLIClient();

    const rows = [
      {
        chain_id: 'eip155:1',
        address: 'not-an-address'
      }
    ];

    await assert.rejects(
      () => oli.attest.submitBulkOnchain(rows, createMockAdapter()),
      (error: unknown) => {
        assert.ok(error instanceof AttestValidationError);
        const typed = error as AttestValidationError;
        assert.ok(typed.diagnostics.errors.some((entry) => entry.code === 'ADDRESS_INVALID'));
        return true;
      }
    );
  });
});
