import { encodeFunctionData } from 'viem';
import type {
  OnchainAttestationRequest,
  OnchainSubmitContext,
  OnchainTxResult,
  OnchainWalletAdapter
} from '../types';
import {
  BASE_CHAIN_IDS,
  getDefaultCoinbasePaymasterUrl,
  isSupportedAttestationNetwork
} from '../core/eas';
import { EAS_ATTEST_ABI } from './easAbi';
import { extractUidsFromReceipt, getTransactionHash, normalizeReceiptStatus, waitForTransactionReceipt } from './utils';

const CALL_STATUS_TIMEOUT_MS = 120_000;
const CALL_STATUS_POLL_INTERVAL_MS = 1_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DynamicWalletClientLike {
  chain?: { id?: number };
  getChainId?: () => Promise<number>;
  writeContract?: (params: Record<string, unknown>) => Promise<string>;
  sendCalls?: (params: Record<string, unknown>) => Promise<unknown>;
  waitForCallsStatus?: (params: { id: string }) => Promise<unknown>;
  request?: (payload: { method: string; params?: unknown[] }) => Promise<unknown>;
  transport?: {
    request?: (payload: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
  switchChain?: (params: { id: number }) => Promise<void>;
}

export interface DynamicPrimaryWalletLike {
  address?: string;
  connector?: { name?: string | null };
  switchNetwork?: (chainId: number) => Promise<void>;
  getWalletClient: () => Promise<DynamicWalletClientLike>;
}

class DynamicWalletAdapter implements OnchainWalletAdapter {
  public readonly name = 'dynamic-wallet-adapter';

  constructor(
    private readonly primaryWallet: DynamicPrimaryWalletLike,
    private readonly options: {
      paymasterUrl?: string;
    } = {}
  ) {}

  private async getWalletClient(): Promise<DynamicWalletClientLike> {
    const client = await this.primaryWallet.getWalletClient();
    if (!client) {
      throw new Error('Dynamic wallet client is unavailable.');
    }
    return client;
  }

  private async rpcRequest(client: DynamicWalletClientLike, method: string, params: unknown[] = []): Promise<unknown> {
    if (typeof client.request === 'function') {
      return client.request({ method, params });
    }

    if (client.transport && typeof client.transport.request === 'function') {
      return client.transport.request({ method, params });
    }

    throw new Error('Dynamic wallet client does not expose an RPC request interface.');
  }

  private resolvePaymasterUrl(context: OnchainSubmitContext): string | undefined {
    return context.paymasterUrl ?? this.options.paymasterUrl ?? getDefaultCoinbasePaymasterUrl();
  }

  private getCallsId(result: unknown): string | null {
    if (typeof result === 'string' && result.trim()) {
      return result;
    }

    if (!result || typeof result !== 'object') {
      return null;
    }

    const payload = result as Record<string, unknown>;
    const id = payload.id ?? payload.callsId ?? payload.callId;
    return typeof id === 'string' && id.trim() ? id : null;
  }

  private extractReceiptsFromCallsStatus(payload: unknown): unknown[] {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const objectPayload = payload as Record<string, unknown>;
    const directReceipts = objectPayload.receipts;
    if (Array.isArray(directReceipts)) {
      return directReceipts;
    }

    const txReceipts = objectPayload.transactionReceipts;
    if (Array.isArray(txReceipts)) {
      return txReceipts;
    }

    const receipts = objectPayload.results;
    if (Array.isArray(receipts)) {
      const collected = receipts
        .map((entry) => (entry && typeof entry === 'object' ? (entry as Record<string, unknown>).receipt : undefined))
        .filter((entry) => entry !== undefined);

      if (collected.length > 0) {
        return collected;
      }
    }

    return [];
  }

  private isCallsStatusTerminal(payload: unknown): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const objectPayload = payload as Record<string, unknown>;
    if (this.extractReceiptsFromCallsStatus(objectPayload).length > 0) {
      return true;
    }

    if (objectPayload.error !== undefined) {
      return true;
    }

    const status = objectPayload.status;
    if (typeof status === 'string') {
      const normalized = status.toLowerCase();
      if (
        normalized === 'confirmed' ||
        normalized === 'completed' ||
        normalized === 'success' ||
        normalized === 'failed' ||
        normalized === 'reverted' ||
        normalized === '0x1' ||
        normalized === '0x0'
      ) {
        return true;
      }

      if (
        normalized === 'pending' ||
        normalized === 'queued' ||
        normalized === 'in_progress' ||
        normalized === 'processing'
      ) {
        return false;
      }
    }

    if (typeof status === 'number') {
      // EIP-5792 implementations commonly use 100 (pending), 200 (confirmed), 500 (failed)
      return status >= 200 || status === 0 || status === 1;
    }

    if (typeof status === 'bigint') {
      return status >= BigInt(200) || status === BigInt(0) || status === BigInt(1);
    }

    return false;
  }

  private normalizeCallsStatus(payload: unknown): 'success' | 'failed' | 'submitted' {
    const receipts = this.extractReceiptsFromCallsStatus(payload);
    if (receipts.length > 0) {
      return normalizeReceiptStatus(receipts[0]);
    }

    if (!payload || typeof payload !== 'object') {
      return 'submitted';
    }

    const status = (payload as Record<string, unknown>).status;
    if (typeof status === 'string') {
      const normalized = status.toLowerCase();
      if (normalized === 'confirmed' || normalized === 'completed' || normalized === 'success' || normalized === '0x1') {
        return 'success';
      }
      if (normalized === 'failed' || normalized === 'reverted' || normalized === '0x0') {
        return 'failed';
      }
    }

    if (typeof status === 'number') {
      if (status === 200 || status === 1) return 'success';
      if (status >= 400 || status === 0) return 'failed';
    }

    if (typeof status === 'bigint') {
      if (status === BigInt(200) || status === BigInt(1)) return 'success';
      if (status >= BigInt(400) || status === BigInt(0)) return 'failed';
    }

    return 'submitted';
  }

  private async waitForCallsStatus(client: DynamicWalletClientLike, callsId: string): Promise<unknown> {
    if (typeof client.waitForCallsStatus === 'function') {
      return client.waitForCallsStatus({ id: callsId });
    }

    const deadline = Date.now() + CALL_STATUS_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const payload = await this.rpcRequest(client, 'wallet_getCallsStatus', [callsId]);
      if (this.isCallsStatusTerminal(payload)) {
        return payload;
      }
      await sleep(CALL_STATUS_POLL_INTERVAL_MS);
    }

    throw new Error(`Timed out waiting for sendCalls status: ${callsId}`);
  }

  async getChainId(): Promise<number> {
    const client = await this.getWalletClient();

    if (typeof client.getChainId === 'function') {
      return client.getChainId();
    }

    if (client.chain?.id) {
      return client.chain.id;
    }

    const chainIdHex = await this.rpcRequest(client, 'eth_chainId');
    if (typeof chainIdHex !== 'string') {
      throw new Error('Unable to determine wallet chain ID.');
    }

    return Number.parseInt(chainIdHex, 16);
  }

  async switchNetwork(chainId: number): Promise<void> {
    if (!isSupportedAttestationNetwork(chainId)) {
      throw new Error(`Unsupported attestation network: ${chainId}`);
    }

    if (typeof this.primaryWallet.switchNetwork === 'function') {
      await this.primaryWallet.switchNetwork(chainId);
      return;
    }

    const client = await this.getWalletClient();
    if (typeof client.switchChain === 'function') {
      await client.switchChain({ id: chainId });
      return;
    }

    throw new Error('Dynamic wallet cannot switch networks programmatically.');
  }

  async isSponsorshipSupported(chainId: number): Promise<boolean> {
    const walletName = this.primaryWallet.connector?.name?.toLowerCase() ?? '';
    const isCoinbase =
      walletName === 'coinbase' ||
      walletName === 'coinbase smart wallet' ||
      walletName === 'coinbase_smart_wallet';

    return isCoinbase && BASE_CHAIN_IDS.includes(chainId as (typeof BASE_CHAIN_IDS)[number]);
  }

  private async executeWrite(
    requestParams: {
      functionName: 'attest' | 'multiAttest';
      args: unknown[];
    },
    context: OnchainSubmitContext,
    sponsored: boolean
  ): Promise<OnchainTxResult> {
    const client = await this.getWalletClient();

    if (typeof client.writeContract !== 'function') {
      throw new Error('Dynamic wallet client does not support contract writes.');
    }

    const writeParams: Record<string, unknown> = {
      address: context.network.easContractAddress,
      abi: EAS_ATTEST_ABI,
      functionName: requestParams.functionName,
      args: requestParams.args,
      value: BigInt(0)
    };

    if (sponsored) {
      const paymasterUrl = this.resolvePaymasterUrl(context);
      if (!paymasterUrl) {
        throw new Error(
          'Sponsorship requested but no paymaster URL is configured. ' +
          'Set OLI_COINBASE_PAYMASTER_URL in your environment or pass paymasterUrl in the adapter/context options.'
        );
      }
      writeParams.capabilities = {
        paymasterService: {
          url: paymasterUrl
        }
      };
    }

    const txHash = await client.writeContract(writeParams);
    const receipt = await waitForTransactionReceipt(client as unknown as Record<string, unknown>, txHash);

    return {
      status: normalizeReceiptStatus(receipt),
      txHash,
      uids: extractUidsFromReceipt(receipt, context.network.easContractAddress),
      raw: receipt
    };
  }

  private async executeSponsoredCall(
    requestParams: {
      functionName: 'attest' | 'multiAttest';
      args: unknown[];
    },
    context: OnchainSubmitContext
  ): Promise<OnchainTxResult> {
    const client = await this.getWalletClient();

    if (typeof client.sendCalls !== 'function') {
      return this.executeWrite(requestParams, context, true);
    }

    const paymasterUrl = this.resolvePaymasterUrl(context);
    if (!paymasterUrl) {
      throw new Error(
        'Sponsorship requested but no paymaster URL is configured. ' +
        'Set OLI_COINBASE_PAYMASTER_URL in your environment or pass paymasterUrl in the adapter/context options.'
      );
    }

    const encodedData = encodeFunctionData({
      abi: EAS_ATTEST_ABI,
      functionName: requestParams.functionName,
      args: requestParams.args as never
    });

    const callsResult = await client.sendCalls({
      calls: [
        {
          to: context.network.easContractAddress,
          data: encodedData,
          value: BigInt(0)
        }
      ],
      capabilities: {
        paymasterService: {
          url: paymasterUrl
        }
      }
    });

    const callsId = this.getCallsId(callsResult);
    const callsStatus = callsId ? await this.waitForCallsStatus(client, callsId) : callsResult;

    const receipts = this.extractReceiptsFromCallsStatus(callsStatus);
    const firstReceipt = receipts[0];

    const txHash =
      (firstReceipt ? getTransactionHash(firstReceipt) : undefined) ??
      getTransactionHash(callsStatus) ??
      getTransactionHash(callsResult);

    const uids = receipts.flatMap((receipt) => extractUidsFromReceipt(receipt, context.network.easContractAddress));

    return {
      status: this.normalizeCallsStatus(callsStatus),
      txHash,
      uids,
      raw: {
        callsResult,
        callsStatus,
        receipts
      }
    };
  }

  async attest(request: OnchainAttestationRequest, context: OnchainSubmitContext): Promise<OnchainTxResult> {
    return this.executeWrite(
      {
        functionName: 'attest',
        args: [
          {
            schema: request.schemaUID,
            data: request.data
          }
        ]
      },
      context,
      false
    );
  }

  async sponsoredAttest(request: OnchainAttestationRequest, context: OnchainSubmitContext): Promise<OnchainTxResult> {
    return this.executeSponsoredCall(
      {
        functionName: 'attest',
        args: [
          {
            schema: request.schemaUID,
            data: request.data
          }
        ]
      },
      context
    );
  }

  async multiAttest(requests: OnchainAttestationRequest[], context: OnchainSubmitContext): Promise<OnchainTxResult> {
    if (requests.length === 0) {
      throw new Error('multiAttest requires at least one request.');
    }

    const schemaUID = requests[0].schemaUID;

    return this.executeWrite(
      {
        functionName: 'multiAttest',
        args: [
          [
            {
              schema: schemaUID,
              data: requests.map((request) => request.data)
            }
          ]
        ]
      },
      context,
      false
    );
  }

  async sponsoredMultiAttest(requests: OnchainAttestationRequest[], context: OnchainSubmitContext): Promise<OnchainTxResult> {
    if (requests.length === 0) {
      throw new Error('sponsoredMultiAttest requires at least one request.');
    }

    const schemaUID = requests[0].schemaUID;

    return this.executeSponsoredCall(
      {
        functionName: 'multiAttest',
        args: [
          [
            {
              schema: schemaUID,
              data: requests.map((request) => request.data)
            }
          ]
        ]
      },
      context
    );
  }
}

/**
 * Create an `OnchainWalletAdapter` from a Dynamic.xyz `primaryWallet` object.
 *
 * Supports both standard `writeContract` flows and EIP-5792 `wallet_sendCalls`
 * for sponsored (fee-less) transactions via Coinbase Paymaster on Base networks.
 *
 * @param primaryWallet - The `useDynamicContext().primaryWallet` value from `@dynamic-labs/sdk-react-core`.
 * @param options.paymasterUrl - Override the Coinbase Paymaster URL used for sponsored calls.
 *   Falls back to the `OLI_COINBASE_PAYMASTER_URL` environment variable.
 * @returns An `OnchainWalletAdapter` compatible with all `AttestClient` submission methods.
 *
 * @example
 * ```ts
 * import { createDynamicWalletAdapter } from '@openlabels/oli-sdk';
 * import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
 *
 * const { primaryWallet } = useDynamicContext();
 * const adapter = createDynamicWalletAdapter(primaryWallet);
 * await attest.submitSingleOnchain(prepared, adapter);
 * ```
 */
export function createDynamicWalletAdapter(
  primaryWallet: DynamicPrimaryWalletLike,
  options: { paymasterUrl?: string } = {}
): OnchainWalletAdapter {
  return new DynamicWalletAdapter(primaryWallet, options);
}
