import type {
  BulkOnchainSubmitResult,
  OnchainAttestationRequest,
  OnchainSubmitContext,
  OnchainSubmitResult,
  OnchainTxResult,
  OnchainWalletAdapter
} from '../types';

function normalizeTxResult(result: OnchainTxResult | undefined): OnchainTxResult {
  if (!result) {
    return {
      status: 'submitted',
      uids: []
    };
  }

  return {
    status: result.status,
    txHash: result.txHash,
    uids: Array.isArray(result.uids) ? result.uids : [],
    raw: result.raw
  };
}

async function executeWithFallback(
  executeSponsored: (() => Promise<OnchainTxResult>) | null,
  executeRegular: () => Promise<OnchainTxResult>
): Promise<{ result: OnchainTxResult; sponsored: boolean }> {
  if (!executeSponsored) {
    return {
      result: await executeRegular(),
      sponsored: false
    };
  }

  try {
    return {
      result: await executeSponsored(),
      sponsored: true
    };
  } catch {
    return {
      result: await executeRegular(),
      sponsored: false
    };
  }
}

export async function submitSingleOnchain(
  request: OnchainAttestationRequest,
  walletAdapter: OnchainWalletAdapter,
  context: OnchainSubmitContext
): Promise<OnchainSubmitResult> {
  await walletAdapter.switchNetwork(context.network.chainId);

  const canUseSponsorship =
    typeof walletAdapter.isSponsorshipSupported === 'function'
      ? await walletAdapter.isSponsorshipSupported(context.network.chainId)
      : false;

  const sponsoredExec =
    canUseSponsorship && typeof walletAdapter.sponsoredAttest === 'function'
      ? () => walletAdapter.sponsoredAttest!(request, context)
      : null;

  const { result, sponsored } = await executeWithFallback(sponsoredExec, () => walletAdapter.attest(request, context));
  const normalized = normalizeTxResult(result);

  return {
    status: normalized.status,
    txHash: normalized.txHash,
    uids: normalized.uids ?? [],
    sponsored,
    network: {
      chainId: context.network.chainId,
      name: context.network.name,
      explorerUrl: context.network.explorerUrl
    },
    raw: normalized.raw
  };
}

export async function submitBulkOnchain(
  requests: OnchainAttestationRequest[],
  walletAdapter: OnchainWalletAdapter,
  context: OnchainSubmitContext,
  options: {
    maxRows?: number;
  } = {}
): Promise<BulkOnchainSubmitResult> {
  const maxRows = options.maxRows ?? 50;
  if (requests.length === 0) {
    throw new Error('submitBulkOnchain requires at least one request.');
  }

  if (requests.length > maxRows) {
    throw new Error(`You can only submit up to ${maxRows} attestations at once.`);
  }

  await walletAdapter.switchNetwork(context.network.chainId);

  const canUseSponsorship =
    typeof walletAdapter.isSponsorshipSupported === 'function'
      ? await walletAdapter.isSponsorshipSupported(context.network.chainId)
      : false;

  const sponsoredExec =
    canUseSponsorship && typeof walletAdapter.sponsoredMultiAttest === 'function'
      ? () => walletAdapter.sponsoredMultiAttest!(requests, context)
      : null;

  const { result, sponsored } = await executeWithFallback(sponsoredExec, () => walletAdapter.multiAttest(requests, context));
  const normalized = normalizeTxResult(result);

  const resultRows = requests.map((_, index) => ({
    row: index,
    uid: normalized.uids?.[index],
    status: normalized.status === 'failed' ? 'failed' : 'success'
  }));

  return {
    status: normalized.status,
    txHash: normalized.txHash,
    uids: normalized.uids ?? [],
    sponsored,
    network: {
      chainId: context.network.chainId,
      name: context.network.name,
      explorerUrl: context.network.explorerUrl
    },
    results: resultRows,
    raw: normalized.raw
  };
}
