import { CHAINS, CHAIN_ALIASES } from '../core/chains';

export function convertChainId(value: string): string {
  if (!value || !value.trim()) return value;

  const normalized = value.trim().toLowerCase();

  if (/^eip155:\d+$/.test(normalized)) {
    const chain = CHAINS.find((entry) => entry.caip2.toLowerCase() === normalized);
    return chain ? chain.caip2 : value;
  }

  if (/^\d+$/.test(normalized)) {
    const chainId = `eip155:${normalized}`;
    const chain = CHAINS.find((entry) => entry.caip2 === chainId);
    if (chain) {
      return chain.caip2;
    }
  }

  const byId = CHAINS.find((entry) => entry.id.toLowerCase() === normalized);
  if (byId) return byId.caip2;

  const byName = CHAINS.find((entry) => entry.name.toLowerCase() === normalized);
  if (byName) return byName.caip2;

  const byShortName = CHAINS.find((entry) => entry.shortName.toLowerCase() === normalized);
  if (byShortName) return byShortName.caip2;

  if (CHAIN_ALIASES[normalized]) {
    return CHAIN_ALIASES[normalized];
  }

  return '';
}
