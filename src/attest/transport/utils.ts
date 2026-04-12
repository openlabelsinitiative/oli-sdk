function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRpcRequest(client: Record<string, unknown>): ((payload: { method: string; params?: unknown[] }) => Promise<unknown>) | null {
  const direct = client.request;
  if (typeof direct === 'function') {
    return direct as (payload: { method: string; params?: unknown[] }) => Promise<unknown>;
  }

  const transport = client.transport as { request?: (payload: { method: string; params?: unknown[] }) => Promise<unknown> } | undefined;
  if (transport && typeof transport.request === 'function') {
    return transport.request;
  }

  return null;
}

export async function waitForTransactionReceipt(
  walletClient: Record<string, unknown>,
  txHash: string,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const pollIntervalMs = options.pollIntervalMs ?? 1_500;

  const waitForTransactionReceiptFn = walletClient.waitForTransactionReceipt;
  if (typeof waitForTransactionReceiptFn === 'function') {
    return waitForTransactionReceiptFn.call(walletClient, { hash: txHash });
  }

  const request = getRpcRequest(walletClient);
  if (!request) {
    throw new Error('Wallet client does not expose a receipt polling interface.');
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = await request({
      method: 'eth_getTransactionReceipt',
      params: [txHash]
    });

    if (receipt) {
      return receipt;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for transaction receipt: ${txHash}`);
}

function normalizeStatus(status: unknown): 'success' | 'failed' | 'submitted' {
  if (status === undefined || status === null) {
    return 'submitted';
  }

  if (typeof status === 'string') {
    const normalized = status.toLowerCase();
    if (normalized === '0x1' || normalized === '1' || normalized === 'success' || normalized === 'confirmed') {
      return 'success';
    }
    if (normalized === '0x0' || normalized === '0' || normalized === 'reverted' || normalized === 'failed') {
      return 'failed';
    }
  }

  if (typeof status === 'number') {
    return status === 1 ? 'success' : status === 0 ? 'failed' : 'submitted';
  }

  if (typeof status === 'bigint') {
    return status === BigInt(1) ? 'success' : status === BigInt(0) ? 'failed' : 'submitted';
  }

  return 'submitted';
}

export function normalizeReceiptStatus(receipt: unknown): 'success' | 'failed' | 'submitted' {
  if (!receipt || typeof receipt !== 'object') {
    return 'submitted';
  }

  const data = receipt as Record<string, unknown>;
  if (typeof data.status === 'string' || typeof data.status === 'number' || typeof data.status === 'bigint') {
    return normalizeStatus(data.status);
  }

  return 'submitted';
}

export function extractUidsFromReceipt(receipt: unknown, easAddress: string): string[] {
  if (!receipt || typeof receipt !== 'object') {
    return [];
  }

  const lowerEasAddress = easAddress.toLowerCase();
  const logs = (receipt as { logs?: Array<Record<string, unknown>> }).logs;
  if (!Array.isArray(logs)) {
    return [];
  }

  const uids: string[] = [];

  logs.forEach((log) => {
    const address = typeof log.address === 'string' ? log.address.toLowerCase() : '';
    if (address !== lowerEasAddress) {
      return;
    }

    const data = typeof log.data === 'string' ? log.data : '';
    if (!/^0x[0-9a-fA-F]{64}$/.test(data)) {
      return;
    }

    if (data === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return;
    }

    uids.push(data);
  });

  return uids;
}

export function getTransactionHash(result: unknown): string | undefined {
  if (typeof result === 'string' && result.startsWith('0x')) {
    return result;
  }

  if (!result || typeof result !== 'object') {
    return undefined;
  }

  const objectResult = result as Record<string, unknown>;
  const hash = objectResult.txHash ?? objectResult.hash ?? objectResult.transactionHash;
  return typeof hash === 'string' ? hash : undefined;
}
