import type { AttestationRowInput, OnchainAttestationRequestData } from '../types';
import { ZERO_BYTES32 } from './eas';
import { buildCaip10 } from './caip';

const EXCLUDED_TAG_FIELDS = new Set(['chain_id', 'address', 'attestation_network']);

function padToWordSize(hex: string): string {
  const remainder = hex.length % 64;
  if (remainder === 0) {
    return hex;
  }
  return hex + '0'.repeat(64 - remainder);
}

function numberToHexWord(value: number | bigint): string {
  const hex = BigInt(value).toString(16);
  return hex.padStart(64, '0');
}

function utf8ToHex(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function encodeDynamicString(value: string): string {
  const data = utf8ToHex(value);
  const len = numberToHexWord(data.length / 2);
  return `${len}${padToWordSize(data)}`;
}

function encodeTwoStrings(first: string, second: string): string {
  const firstEncoded = encodeDynamicString(first);
  const secondEncoded = encodeDynamicString(second);

  const headSizeBytes = 64; // two 32-byte offsets
  const firstOffset = headSizeBytes;
  const secondOffset = headSizeBytes + firstEncoded.length / 2;

  const head = `${numberToHexWord(firstOffset)}${numberToHexWord(secondOffset)}`;
  return `0x${head}${firstEncoded}${secondEncoded}`;
}

export function prepareTags(row: AttestationRowInput): Record<string, unknown> {
  const tags: Record<string, unknown> = {};

  Object.entries(row)
    .filter(([key, value]) => !EXCLUDED_TAG_FIELDS.has(key) && value !== undefined && value !== null && value !== '')
    .forEach(([key, value]) => {
      if (key === 'erc20.decimals' || key === 'version') {
        const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
        if (!Number.isNaN(parsed)) {
          tags[key] = parsed;
        }
        return;
      }

      if (key === 'deployment_date' && typeof value === 'string') {
        tags[key] = value.replace('T', ' ');
        return;
      }

      if (key === 'erc_type') {
        if (Array.isArray(value)) {
          const values = value.map((item) => String(item).trim()).filter(Boolean);
          if (values.length > 0) {
            tags[key] = values;
          }
          return;
        }

        const csvValues = String(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

        if (csvValues.length > 0) {
          tags[key] = csvValues;
        }
        return;
      }

      tags[key] = value;
    });

  return tags;
}

export function prepareEncodedData(chainId: string, address: string, tags: Record<string, unknown>): string {
  const caip10 = buildCaip10(chainId, address);
  return encodeTwoStrings(caip10, JSON.stringify(tags));
}

export function createAttestationRequestData(
  encodedData: string,
  recipient: string,
  options: {
    expirationTime?: bigint;
    revocable?: boolean;
    refUID?: string;
    value?: bigint;
  } = {}
): OnchainAttestationRequestData {
  return {
    recipient,
    expirationTime: options.expirationTime ?? BigInt(0),
    revocable: options.revocable ?? true,
    refUID: options.refUID ?? ZERO_BYTES32,
    data: encodedData,
    value: options.value ?? BigInt(0)
  };
}
