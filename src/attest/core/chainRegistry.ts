import type { ChainInput, ChainRegistry } from '../types';
import { CHAINS, CHAIN_ALIASES, type ChainMetadata } from './chains';

/** `eip155:any` or `eip155:<positive integer>` — any EVM chain, known or not. */
export const EIP155_CHAIN_ID_PATTERN = /^eip155:(any|[1-9]\d*)$/;

/** Generic CAIP-2 shape (`namespace:reference`), per the CAIP-2 spec. */
const CAIP2_PATTERN = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}$/;

function toChainMetadata(input: ChainInput): ChainMetadata {
  const caip2 = String(input.caip2 ?? '').trim();
  const name = String(input.name ?? '').trim();

  if (!CAIP2_PATTERN.test(caip2)) {
    throw new TypeError(`createChainRegistry: invalid CAIP-2 chain ID "${caip2}" for chain "${name}".`);
  }
  if (!name) {
    throw new TypeError(`createChainRegistry: chain "${caip2}" is missing a name.`);
  }

  return {
    id: input.id?.trim() || caip2,
    name,
    shortName: input.shortName?.trim() || name,
    caip2
  };
}

/**
 * Build a `ChainRegistry` from host-supplied chains (e.g. growthepie's master.json)
 * merged with the SDK's built-in chain list.
 *
 * - Host chains take precedence over built-ins with the same CAIP-2 ID.
 * - Name lookups (used by `convertChainId`) resolve in order: id, name, shortName, alias.
 * - Pass `includeBuiltIn: false` to use only the host chains.
 *
 * Validation does not depend on the registry for EVM chains: any `eip155:<n>` is
 * accepted. The registry supplies names/labels, non-EVM chains, and the
 * "recognised chain" check behind the `CHAIN_UNRECOGNIZED` warning.
 *
 * @example
 * ```ts
 * const chainRegistry = createChainRegistry({
 *   chains: Object.entries(master.chains).map(([key, chain]) => ({
 *     id: key,
 *     name: chain.name,
 *     caip2: `eip155:${chain.evm_chain_id}`
 *   }))
 * });
 * await attest.validateBulk(rows, { chainRegistry });
 * ```
 */
export function createChainRegistry(
  input: {
    chains?: ChainInput[];
    /** Extra lookup names → CAIP-2 ID, e.g. `{ rh: 'eip155:4663' }`. */
    aliases?: Record<string, string>;
    /** Merge the SDK's built-in `CHAINS` and `CHAIN_ALIASES` (default `true`). */
    includeBuiltIn?: boolean;
  } = {}
): ChainRegistry {
  const includeBuiltIn = input.includeBuiltIn ?? true;
  const candidates = [...(input.chains ?? []).map(toChainMetadata), ...(includeBuiltIn ? CHAINS : [])];

  const chains: ChainMetadata[] = [];
  const byCaip2 = new Map<string, ChainMetadata>();
  candidates.forEach((chain) => {
    const key = chain.caip2.toLowerCase();
    if (!byCaip2.has(key)) {
      byCaip2.set(key, chain);
      chains.push(chain);
    }
  });

  const byName = new Map<string, string>();
  const addNames = (entries: Array<[string, string]>) => {
    entries.forEach(([name, caip2]) => {
      const key = name.trim().toLowerCase();
      if (key && !byName.has(key)) {
        byName.set(key, byCaip2.get(caip2.trim().toLowerCase())?.caip2 ?? caip2.trim());
      }
    });
  };

  addNames(chains.map((chain) => [chain.id, chain.caip2]));
  addNames(chains.map((chain) => [chain.name, chain.caip2]));
  addNames(chains.map((chain) => [chain.shortName, chain.caip2]));
  addNames(Object.entries(input.aliases ?? {}));
  if (includeBuiltIn) {
    addNames(Object.entries(CHAIN_ALIASES));
  }

  return { chains, byCaip2, byName };
}

const BUILT_IN_CHAIN_REGISTRY = createChainRegistry();

/** Return `registry`, or the SDK's built-in registry when none is given. */
export function resolveChainRegistry(registry?: ChainRegistry): ChainRegistry {
  return registry ?? BUILT_IN_CHAIN_REGISTRY;
}

/**
 * Return `true` when the CAIP-2 chain ID is in the registry (case-insensitive).
 * @param chainId - CAIP-2 chain identifier (e.g. `'eip155:8453'`).
 * @param registry - Optional registry; defaults to the built-in chain list.
 */
export function isKnownChain(chainId: string, registry?: ChainRegistry): boolean {
  return resolveChainRegistry(registry).byCaip2.has(chainId.trim().toLowerCase());
}

/**
 * Dropdown options (`{ value: caip2, label: name }`) for the registry's chains.
 * Equivalent to `CHAIN_OPTIONS` when called without a registry.
 */
export function getChainOptions(registry?: ChainRegistry): Array<{ value: string; label: string }> {
  return resolveChainRegistry(registry).chains.map((chain) => ({ value: chain.caip2, label: chain.name }));
}
