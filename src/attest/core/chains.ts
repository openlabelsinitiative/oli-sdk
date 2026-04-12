export interface ChainMetadata {
  id: string;
  name: string;
  shortName: string;
  caip2: string;
}

// Mirrors frontend chain list used for attestation validation/csv normalization.
export const CHAINS: ChainMetadata[] = [
  { id: 'arbitrum', name: 'Arbitrum One', shortName: 'Arbitrum', caip2: 'eip155:42161' },
  { id: 'arbitrum_nova', name: 'Arbitrum Nova', shortName: 'Arbitrum Nova', caip2: 'eip155:42170' },
  { id: 'abstract', name: 'Abstract', shortName: 'Abstract', caip2: 'eip155:2741' },
  { id: 'base', name: 'Base', shortName: 'Base', caip2: 'eip155:8453' },
  { id: 'celo', name: 'Celo', shortName: 'Celo', caip2: 'eip155:42220' },
  { id: 'ethereum', name: 'Ethereum', shortName: 'Ethereum L1', caip2: 'eip155:1' },
  { id: 'linea', name: 'Linea', shortName: 'Linea', caip2: 'eip155:59144' },
  { id: 'mantle', name: 'Mantle', shortName: 'Mantle', caip2: 'eip155:5000' },
  { id: 'mode', name: 'Mode Network', shortName: 'Mode', caip2: 'eip155:34443' },
  { id: 'optimism', name: 'OP Mainnet', shortName: 'OP Mainnet', caip2: 'eip155:10' },
  { id: 'scroll', name: 'Scroll', shortName: 'Scroll', caip2: 'eip155:534352' },
  { id: 'swell', name: 'Swellchain', shortName: 'Swellchain', caip2: 'eip155:1923' },
  { id: 'taiko', name: 'Taiko Alethia', shortName: 'Taiko', caip2: 'eip155:167000' },
  { id: 'zksync_era', name: 'ZKsync Era', shortName: 'ZKsync Era', caip2: 'eip155:324' },
  { id: 'zora', name: 'Zora', shortName: 'Zora', caip2: 'eip155:7777777' },
  { id: 'unichain', name: 'Unichain', shortName: 'Unichain', caip2: 'eip155:130' },
  { id: 'polygon', name: 'Polygon', shortName: 'Polygon', caip2: 'eip155:137' },
  { id: 'bnb_chain', name: 'BNB Smart Chain', shortName: 'BNB Chain', caip2: 'eip155:56' },
  { id: 'avalanche', name: 'Avalanche C-Chain', shortName: 'Avalanche', caip2: 'eip155:43114' },
  { id: 'fantom', name: 'Fantom', shortName: 'Fantom', caip2: 'eip155:250' },
  { id: 'polygon_zkevm', name: 'Polygon zkEVM', shortName: 'Polygon zkEVM', caip2: 'eip155:1101' },
  { id: 'gnosis', name: 'Gnosis Chain', shortName: 'Gnosis', caip2: 'eip155:100' },
  { id: 'moonbeam', name: 'Moonbeam', shortName: 'Moonbeam', caip2: 'eip155:1284' },
  { id: 'cronos', name: 'Cronos', shortName: 'Cronos', caip2: 'eip155:25' },
  { id: 'aurora', name: 'Aurora', shortName: 'Aurora', caip2: 'eip155:1313161554' },
  { id: 'zircuit', name: 'Zircuit', shortName: 'Zircuit', caip2: 'eip155:48900' },
  { id: 'starknet', name: 'Starknet', shortName: 'Starknet', caip2: 'starknet:SN_MAIN' },
  { id: 'soneium', name: 'Soneium', shortName: 'Soneium', caip2: 'eip155:1868' },
  { id: 'megaeth_testnet_v2', name: 'MegaETH Testnet v2', shortName: 'Timothy', caip2: 'eip155:6343' },
  { id: 'megaeth', name: 'MegaETH', shortName: 'MegaETH', caip2: 'eip155:4326' },
  { id: 'megaeth_testnet', name: 'MegaETH Testnet v1', shortName: 'Carrot', caip2: 'eip155:6342' },
  { id: 'any', name: 'Any EVM Chain', shortName: 'Any EVM Chain', caip2: 'eip155:any' }
];

export const CHAIN_OPTIONS = CHAINS.map((chain) => ({
  value: chain.caip2,
  label: chain.name
}));

export const CHAIN_ALIASES: Record<string, string> = {
  mainnet: 'eip155:1',
  ethereum: 'eip155:1',
  eth: 'eip155:1',
  optimism: 'eip155:10',
  op: 'eip155:10',
  matic: 'eip155:137',
  polygon: 'eip155:137',
  polygon_pos: 'eip155:137',
  base: 'eip155:8453',
  arbitrum: 'eip155:42161',
  arb: 'eip155:42161',
  arbitrumone: 'eip155:42161',
  arbitrumnova: 'eip155:42170',
  celo: 'eip155:42220',
  linea: 'eip155:59144',
  polygonzkevm: 'eip155:1101',
  gnosis: 'eip155:100',
  moonbeam: 'eip155:1284',
  cronos: 'eip155:25',
  aurora: 'eip155:1313161554',
  zircuit: 'eip155:48900'
};
