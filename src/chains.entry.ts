/**
 * @openlabels/oli-sdk — `/chains` subpath
 *
 * Chain metadata, CAIP-2/CAIP-10 utilities, address helpers, and category
 * data used internally by the attestation pipeline. Re-exported here so
 * consumers can build matching UI or server-side logic without duplicating
 * these constants.
 */

// Chain metadata
export { CHAINS, CHAIN_OPTIONS, CHAIN_ALIASES } from './attest/core/chains';
export type { ChainMetadata } from './attest/core/chains';

// Host-supplied chain registry
export { createChainRegistry, getChainOptions, isKnownChain } from './attest/core/chainRegistry';
export type { ChainInput, ChainRegistry } from './attest/types';

// Chain ID conversion/normalisation (from validation layer)
export { convertChainId } from './attest/validation/chain';

// CAIP-10 utilities
export { parseCaip10, buildCaip10, normalizeChainId } from './attest/core/caip';
export type { Caip10Parts } from './attest/core/caip';

// EVM address utilities
export { isValidEvmAddress, toChecksumAddress } from './attest/core/address';

// Category metadata
export { CATEGORIES, VALID_CATEGORY_IDS } from './attest/core/categories';
export type { Category, MainCategory } from './attest/core/categories';

// Category alias conversion (from validation layer)
export { convertCategoryAlias } from './attest/validation/category';

// Dynamic usage-category registry
export {
  DEFAULT_USAGE_CATEGORY_SOURCE,
  fetchUsageCategories,
  createUsageCategoryRegistry,
  validateUsageCategory,
  getUsageCategorySuggestions
} from './attest/validation/usageCategoryRegistry';
export type { UsageCategoryRecord, UsageCategoryRegistry } from './attest/types';
