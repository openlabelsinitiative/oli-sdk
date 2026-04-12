import { keccak_256 } from 'js-sha3';

function isHexAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Return `true` when `address` is a valid EVM hex address (checksummed, all-lowercase,
 * or all-uppercase).
 * @param address - Address string to test (must be `0x`-prefixed, 42 chars).
 */
export function isValidEvmAddress(address: string): boolean {
  if (!isHexAddress(address)) {
    return false;
  }

  const value = address.slice(2);
  const lower = value.toLowerCase();

  if (value === lower || value === value.toUpperCase()) {
    return true;
  }

  const hash = keccak_256(lower);

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (!/[a-fA-F]/.test(char)) {
      continue;
    }

    const shouldUppercase = Number.parseInt(hash[i], 16) >= 8;
    const isUppercase = char === char.toUpperCase();

    if (shouldUppercase !== isUppercase) {
      return false;
    }
  }

  return true;
}

/**
 * Convert an EVM address to its EIP-55 checksummed form.
 * @param address - `0x`-prefixed 40-hex-char address (any casing).
 * @returns EIP-55 checksummed address.
 * @throws `Error` when the input is not a valid EVM address format.
 */
export function toChecksumAddress(address: string): string {
  if (!isHexAddress(address)) {
    throw new Error('Invalid EVM address');
  }

  const lower = address.slice(2).toLowerCase();
  const hash = keccak_256(lower);

  let result = '0x';
  for (let i = 0; i < lower.length; i += 1) {
    const char = lower[i];
    if (!/[a-f]/.test(char)) {
      result += char;
      continue;
    }

    result += Number.parseInt(hash[i], 16) >= 8 ? char.toUpperCase() : char;
  }

  if (!isValidEvmAddress(result)) {
    throw new Error('Invalid EVM checksum address');
  }

  return result;
}
