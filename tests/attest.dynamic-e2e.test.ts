import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OLIClient, createDynamicWalletAdapter } from '../src';

const UID_ONE = `0x${'11'.repeat(32)}`;
const UID_TWO = `0x${'22'.repeat(32)}`;
const TX_HASH = `0x${'aa'.repeat(32)}`;

function createPreparedRows() {
  const oli = new OLIClient();
  return {
    oli,
    single: oli.attest.prepareSingleAttestation(
      {
        chain_id: 'eip155:1',
        address: '0x52908400098527886E0F7030069857D2E4169EE7',
        owner_project: 'growthepie'
      },
      {
        mode: 'simpleProfile',
        projects: [{ owner_project: 'growthepie', display_name: 'Growthepie' }]
      }
    ),
    bulk: [
      {
        chain_id: 'eip155:1',
        address: '0x52908400098527886E0F7030069857D2E4169EE7',
        owner_project: 'growthepie'
      },
      {
        chain_id: 'eip155:1',
        address: '0x8617E340B3D01FA5F11F306F4090FD50E238070D',
        owner_project: 'growthepie'
      }
    ]
  };
}

test.describe('dynamic adapter e2e harness (frontend sponsorship parity)', () => {
  test('uses sendCalls sponsorship path with env paymaster URL + parses uid/txHash', async () => {
    const previousPaymasterUrl = process.env.OLI_COINBASE_PAYMASTER_URL;
    process.env.OLI_COINBASE_PAYMASTER_URL = 'https://example.com/paymaster';

    try {
      const { oli, single } = createPreparedRows();
      const prepared = await single;

      let switchNetworkCount = 0;
      let sendCallsPayload: Record<string, unknown> | null = null;
      let statusPollCount = 0;

      const walletClient = {
        async getChainId() {
          return 8453;
        },
        async sendCalls(payload: Record<string, unknown>) {
          sendCallsPayload = payload;
          return '0xcalls-id';
        },
        async request(payload: { method: string; params?: unknown[] }) {
          if (payload.method === 'wallet_getCallsStatus') {
            statusPollCount += 1;
            if (statusPollCount === 1) {
              return { status: 'PENDING' };
            }
            return {
              status: 'CONFIRMED',
              receipts: [
                {
                  status: '0x1',
                  transactionHash: TX_HASH,
                  logs: [
                    {
                      address: prepared.network.easContractAddress,
                      data: UID_ONE
                    }
                  ]
                }
              ]
            };
          }
          throw new Error(`Unexpected RPC method: ${payload.method}`);
        }
      };

      const primaryWallet = {
        connector: { name: 'Coinbase Smart Wallet' },
        async switchNetwork(chainId: number) {
          assert.equal(chainId, 8453);
          switchNetworkCount += 1;
        },
        async getWalletClient() {
          return walletClient;
        }
      };

      const adapter = createDynamicWalletAdapter(primaryWallet);
      const result = await oli.attest.submitSingleOnchain(prepared, adapter);

      assert.equal(switchNetworkCount, 1);
      assert.equal(result.sponsored, true);
      assert.equal(result.txHash, TX_HASH);
      assert.deepEqual(result.uids, [UID_ONE]);
      assert.equal(result.status, 'success');
      assert.ok(sendCallsPayload);

      const capabilities = (sendCallsPayload as { capabilities?: { paymasterService?: { url?: string } } }).capabilities;
      assert.equal(capabilities?.paymasterService?.url, 'https://example.com/paymaster');
    } finally {
      if (previousPaymasterUrl === undefined) {
        delete process.env.OLI_COINBASE_PAYMASTER_URL;
      } else {
        process.env.OLI_COINBASE_PAYMASTER_URL = previousPaymasterUrl;
      }
    }
  });

  test('falls back to regular transaction when sponsored sendCalls fails', async () => {
    const { oli, single } = createPreparedRows();
    const prepared = await single;

    let regularWriteCalled = false;

    const walletClient = {
      async getChainId() {
        return 8453;
      },
      async sendCalls() {
        throw new Error('Sponsored path failed');
      },
      async writeContract() {
        regularWriteCalled = true;
        return TX_HASH;
      },
      async waitForTransactionReceipt() {
        return {
          status: '0x1',
          transactionHash: TX_HASH,
          logs: [
            {
              address: prepared.network.easContractAddress,
              data: UID_ONE
            }
          ]
        };
      }
    };

    const primaryWallet = {
      connector: { name: 'Coinbase Smart Wallet' },
      async switchNetwork() {
        return;
      },
      async getWalletClient() {
        return walletClient;
      }
    };

    const adapter = createDynamicWalletAdapter(primaryWallet);
    const result = await oli.attest.submitSingleOnchain(prepared, adapter);

    assert.equal(regularWriteCalled, true);
    assert.equal(result.sponsored, false);
    assert.equal(result.txHash, TX_HASH);
    assert.deepEqual(result.uids, [UID_ONE]);
  });

  test('bulk sponsored flow returns normalized per-row results from sendCalls receipts', async () => {
    const { oli, bulk } = createPreparedRows();

    let statusPollCount = 0;

    const walletClient = {
      async getChainId() {
        return 8453;
      },
      async sendCalls() {
        return '0xcalls-bulk';
      },
      async request(payload: { method: string; params?: unknown[] }) {
        if (payload.method === 'wallet_getCallsStatus') {
          statusPollCount += 1;
          if (statusPollCount === 1) {
            return { status: 100 };
          }

          return {
            status: 200,
            transactionReceipts: [
              {
                status: '0x1',
                transactionHash: TX_HASH,
                logs: [
                  { address: '0x0000000000000000000000000000000000000001', data: UID_TWO },
                  { address: '0x4200000000000000000000000000000000000021', data: UID_ONE },
                  { address: '0x4200000000000000000000000000000000000021', data: UID_TWO }
                ]
              }
            ]
          };
        }
        throw new Error(`Unexpected RPC method: ${payload.method}`);
      }
    };

    const primaryWallet = {
      connector: { name: 'Coinbase' },
      async switchNetwork() {
        return;
      },
      async getWalletClient() {
        return walletClient;
      }
    };

    const adapter = createDynamicWalletAdapter(primaryWallet);
    const result = await oli.attest.submitBulkOnchain(bulk, adapter);

    assert.equal(result.sponsored, true);
    assert.equal(result.status, 'success');
    assert.equal(result.txHash, TX_HASH);
    assert.deepEqual(result.uids, [UID_ONE, UID_TWO]);
    assert.deepEqual(
      result.results.map((entry) => ({ row: entry.row, uid: entry.uid, status: entry.status })),
      [
        { row: 0, uid: UID_ONE, status: 'success' },
        { row: 1, uid: UID_TWO, status: 'success' }
      ]
    );
  });
});
