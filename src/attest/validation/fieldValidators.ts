import { EIP155_CHAIN_ID_PATTERN, resolveChainRegistry } from '../core/chainRegistry';
import { VALID_CATEGORY_IDS } from '../core/categories';
import { isValidEvmAddress as isValidChecksumOrHexEvmAddress } from '../core/address';
import type { ChainRegistry, UsageCategoryRegistry } from '../types';

const VALID_PAYMASTER_CATEGORIES = ['verifying', 'token', 'verifying_and_token'];

/**
 * Return `true` when `value` is a valid EVM address (checksummed or all-lowercase/uppercase).
 * @param value - Address string to test.
 */
export function isValidEvmAddress(value: string): boolean {
  return isValidChecksumOrHexEvmAddress(value.trim());
}

/**
 * Return an error message when `address` is not a valid EVM address, or an empty string when valid.
 * @param address - Value to validate.
 */
export function validateAddress(address: unknown): string {
  if (!address) return 'Address is required';
  if (typeof address !== 'string' || !isValidEvmAddress(address)) {
    return 'Invalid EVM address';
  }
  return '';
}

function isEvmChainId(chainId?: string): boolean {
  return typeof chainId === 'string' && chainId.toLowerCase().startsWith('eip155:');
}

/**
 * Validate an address only when the chain ID is an EIP-155 chain (EVM).
 * Returns an empty string for non-EVM chains where address format may differ.
 *
 * @param address - Address value to validate.
 * @param chainId - CAIP-2 chain identifier (e.g. `'eip155:8453'`).
 */
export function validateAddressForChain(address: unknown, chainId?: string): string {
  if (!address) return 'Address is required';
  if (!chainId || !isEvmChainId(chainId)) {
    return '';
  }
  return validateAddress(address);
}

/**
 * Return an error message when the contract name exceeds 40 characters.
 * @param name - Contract name value.
 */
export function validateContractName(name: unknown): string {
  if (typeof name === 'string' && name.length > 40) {
    return 'Contract name must be 40 characters or less';
  }
  return '';
}

/**
 * Return an error message when `txHash` does not match the `0x`-prefixed 32-byte hex pattern.
 * Returns an empty string when the value is empty (field is optional).
 * @param txHash - Transaction hash value.
 */
export function validateTxHash(txHash: unknown): string {
  if (!txHash) return '';
  const hash = String(txHash);
  return /^0x[a-fA-F0-9]{64}$/.test(hash) ? '' : 'Invalid transaction hash format';
}

/**
 * Return an error message when `url` is not a valid URL starting with `https://` or `www.`.
 * Returns an empty string when the value is empty (field is optional).
 * @param url - URL value to validate.
 */
export function validateURL(url: unknown): string {
  if (!url) return '';
  const value = String(url);
  if (!value.startsWith('https://') && !value.startsWith('www.')) {
    return 'URL must start with https:// or www.';
  }

  try {
    const normalized = value.startsWith('www.') ? `https://${value}` : value;
    new URL(normalized);
    return '';
  } catch {
    return 'Invalid URL format';
  }
}

/**
 * Return `null` when the value is a valid boolean string (`'true'`, `'false'`, or empty).
 * Returns an error message string otherwise.
 * @param value - Value to validate.
 */
export function validateBoolean(value: unknown): string | null {
  const normalized = String(value ?? '');
  return normalized === '' || normalized === 'true' || normalized === 'false' ? null : 'Must be true or false';
}

/**
 * Return `null` when `value` is a valid chain ID, or an error message when invalid.
 *
 * Any EVM chain (`eip155:<n>` or `eip155:any`) is valid, whether or not it is in
 * the registry. Other namespaces (e.g. `starknet:SN_MAIN`) must be in the registry,
 * in canonical form.
 *
 * @param value - CAIP-2 chain ID.
 * @param registry - Optional registry; defaults to the built-in chain list.
 */
export function validateChain(value: string, registry?: ChainRegistry): string | null {
  if (!value || !value.trim()) {
    return 'Chain is required';
  }

  const isValid =
    EIP155_CHAIN_ID_PATTERN.test(value) ||
    resolveChainRegistry(registry).byCaip2.get(value.toLowerCase())?.caip2 === value;
  if (!isValid) {
    return `Invalid chain: "${value}". Must be a valid CAIP-2 chain identifier.`;
  }

  return null;
}

/**
 * Return `null` when `value` is a valid `usage_category`, or an error message when invalid.
 *
 * When `registry` is provided (built with `createUsageCategoryRegistry()`), validation is
 * scoped to `registry.allowedIds` instead of the SDK's static built-in list.
 *
 * @param value    - The `usage_category` string to validate.
 * @param registry - Optional registry to scope validation.
 */
export function validateCategory(value: string, registry?: UsageCategoryRegistry): string | null {
  if (!value) return null;
  const isValid = registry ? registry.allowedIds.has(value) : VALID_CATEGORY_IDS.includes(value);
  return isValid ? null : `Invalid category: "${value}". Please select from available categories.`;
}

export function validatePaymasterCategory(value: string): string | null {
  if (!value) return null;
  return VALID_PAYMASTER_CATEGORIES.includes(value)
    ? null
    : `Invalid paymaster category: "${value}". Please select from available categories (verifying, token, verifying_and_token).`;
}
