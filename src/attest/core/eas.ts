import type { AttestationNetworkConfig } from '../types';

export const FRONTEND_ATTESTATION_RECIPIENT = '0x0000000000000000000000000000000000000002';
export const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const DEFAULT_ATTESTATION_NETWORK = 8453;

const NETWORK_CONFIG: Record<number, AttestationNetworkConfig> = {
  8453: {
    chainId: 8453,
    name: 'Base',
    easContractAddress: '0x4200000000000000000000000000000000000021',
    schemaUID: '0xcff83309b59685fdae9dad7c63d969150676d51d8eeda66799d1c4898b84556a',
    schemaDefinition: 'string caip10,string tags_json',
    explorerUrl: 'https://base.easscan.org'
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    easContractAddress: '0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458',
    schemaUID: '0xcff83309b59685fdae9dad7c63d969150676d51d8eeda66799d1c4898b84556a',
    schemaDefinition: 'string caip10,string tags_json',
    explorerUrl: 'https://arbitrum.easscan.org'
  }
};

export function isSupportedAttestationNetwork(chainId: number): boolean {
  return typeof NETWORK_CONFIG[chainId] !== 'undefined';
}

export function getAttestationNetworkConfig(chainId: number = DEFAULT_ATTESTATION_NETWORK): AttestationNetworkConfig {
  const config = NETWORK_CONFIG[chainId];
  if (!config) {
    throw new Error(
      `Unsupported attestation network: ${chainId}. Supported networks: ${Object.keys(NETWORK_CONFIG).join(', ')}`
    );
  }
  return config;
}

export function getSupportedAttestationNetworks(): AttestationNetworkConfig[] {
  return Object.values(NETWORK_CONFIG);
}

export const BASE_CHAIN_IDS = [8453, 84532] as const;

function readEnvValue(key: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) {
    return undefined;
  }

  const value = process.env[key];
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function getDefaultCoinbasePaymasterUrl(): string | undefined {
  return (
    readEnvValue('OLI_COINBASE_PAYMASTER_URL') ??
    readEnvValue('NEXT_PUBLIC_COINBASE_PAYMASTER_URL')
  );
}
