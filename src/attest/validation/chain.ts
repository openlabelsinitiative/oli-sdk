import type { ChainRegistry } from '../types';
import { EIP155_CHAIN_ID_PATTERN, resolveChainRegistry } from '../core/chainRegistry';

/**
 * Convert a chain name, numeric EVM chain ID, or CAIP-2 ID to its canonical CAIP-2 form.
 *
 * - Known CAIP-2 IDs (any casing) → canonical form, e.g. `'EIP155:4663'` → `'eip155:4663'`.
 * - Numeric IDs → `eip155:<n>`, whether or not the chain is in the registry.
 * - Names, short names, ids and aliases → looked up in the registry.
 * - Other `namespace:reference` values are returned trimmed so validation can report them.
 * - Unresolvable names → `''`.
 *
 * @param value - Raw chain value, e.g. from a CSV cell.
 * @param registry - Optional registry; defaults to the built-in chain list.
 */
export function convertChainId(value: string, registry?: ChainRegistry): string {
  if (!value || !value.trim()) return value;

  const chains = resolveChainRegistry(registry);
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  const known = chains.byCaip2.get(normalized);
  if (known) return known.caip2;

  if (/^[1-9]\d*$/.test(normalized)) {
    const chainId = `eip155:${normalized}`;
    return chains.byCaip2.get(chainId)?.caip2 ?? chainId;
  }

  if (EIP155_CHAIN_ID_PATTERN.test(normalized)) return normalized;

  const byName = chains.byName.get(normalized);
  if (byName) return byName;

  if (trimmed.includes(':')) return trimmed;

  return '';
}
