import { CHAINS } from './chains';
import { toChecksumAddress } from './address';

export interface Caip10Parts {
  chainId: string;
  address: string;
  isKnownChain: boolean;
}

/**
 * Normalise a raw chain ID string to its canonical CAIP-2 form (e.g. `'eip155:8453'`).
 * Returns `null` when the chain is not in the supported chain list.
 * @param chainId - Raw chain ID string.
 */
export function normalizeChainId(chainId: string): string | null {
  const normalized = chainId.trim().toLowerCase();
  const matchingChain = CHAINS.find((chain) => chain.caip2.toLowerCase() === normalized);
  return matchingChain ? matchingChain.caip2 : null;
}

/**
 * Parse a CAIP-10 string (e.g. `'eip155:8453:0xAbC...'`) into its components.
 * Returns `null` when the string cannot be parsed.
 * @param value - CAIP-10 encoded string.
 */
export function parseCaip10(value: string): Caip10Parts | null {
  if (!value) return null;
  const trimmed = value.trim();
  const parts = trimmed.split(':');
  if (parts.length < 3) return null;

  const chainIdCandidate = `${parts[0]}:${parts[1]}`;
  const address = parts.slice(2).join(':').trim();
  if (!address) return null;

  const normalizedChainId = normalizeChainId(chainIdCandidate);
  return {
    chainId: normalizedChainId ?? chainIdCandidate,
    address,
    isKnownChain: Boolean(normalizedChainId)
  };
}

/**
 * Build a CAIP-10 string from a chain ID and address.
 * EVM addresses are checksummed automatically.
 * @param chainId - CAIP-2 chain identifier (e.g. `'eip155:8453'`).
 * @param address - Account address (e.g. `'0xAbC...'`).
 */
export function buildCaip10(chainId: string, address: string): string {
  const normalizedChainId = normalizeChainId(chainId) ?? chainId;
  const trimmedAddress = address.trim();
  let normalizedAddress = trimmedAddress;

  if (trimmedAddress.startsWith('0x') && trimmedAddress.length === 42) {
    try {
      normalizedAddress = toChecksumAddress(trimmedAddress);
    } catch {
      normalizedAddress = trimmedAddress;
    }
  }

  return `${normalizedChainId}:${normalizedAddress}`;
}
