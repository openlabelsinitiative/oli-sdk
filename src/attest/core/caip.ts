import type { ChainRegistry } from '../types';
import { resolveChainRegistry } from './chainRegistry';
import { toChecksumAddress } from './address';

export interface Caip10Parts {
  chainId: string;
  address: string;
  isKnownChain: boolean;
}

/**
 * Normalise a raw chain ID string to its canonical CAIP-2 form (e.g. `'eip155:8453'`).
 * Returns `null` when the chain is not in the registry.
 * @param chainId - Raw chain ID string.
 * @param registry - Optional registry; defaults to the built-in chain list.
 */
export function normalizeChainId(chainId: string, registry?: ChainRegistry): string | null {
  const matchingChain = resolveChainRegistry(registry).byCaip2.get(chainId.trim().toLowerCase());
  return matchingChain ? matchingChain.caip2 : null;
}

/**
 * Parse a CAIP-10 string (e.g. `'eip155:8453:0xAbC...'`) into its components.
 * Returns `null` when the string cannot be parsed.
 * `isKnownChain` is `true` when the chain is in the registry.
 * @param value - CAIP-10 encoded string.
 * @param registry - Optional registry; defaults to the built-in chain list.
 */
export function parseCaip10(value: string, registry?: ChainRegistry): Caip10Parts | null {
  if (!value) return null;
  const trimmed = value.trim();
  const parts = trimmed.split(':');
  if (parts.length < 3) return null;

  const chainIdCandidate = `${parts[0]}:${parts[1]}`;
  const address = parts.slice(2).join(':').trim();
  if (!address) return null;

  const normalizedChainId = normalizeChainId(chainIdCandidate, registry);
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
 * @param registry - Optional registry; defaults to the built-in chain list.
 */
export function buildCaip10(chainId: string, address: string, registry?: ChainRegistry): string {
  const normalizedChainId = normalizeChainId(chainId, registry) ?? chainId;
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
