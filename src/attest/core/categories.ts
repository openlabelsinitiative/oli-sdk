export interface Category {
  category_id: string;
  name: string;
  description: string;
}

export interface MainCategory {
  main_category_name: string;
  categories: Category[];
}

export const CATEGORIES: MainCategory[] = [
  {
    main_category_name: 'CeFi',
    categories: [
      { category_id: 'mev', name: 'MEV', description: 'MEV and arbitrage bots' },
      { category_id: 'trading', name: 'Trading', description: 'Contracts focused on market-making, MEV and arbitrage.' },
      { category_id: 'cex', name: 'Centralized Exchange', description: 'Contracts or wallets controlled by centralized exchanges.' }
    ]
  },
  {
    main_category_name: 'DeFi',
    categories: [
      { category_id: 'dex', name: 'Decentralized Exchange', description: 'Contracts routing token swaps through liquidity pools.' },
      { category_id: 'lending', name: 'Lending', description: 'Contracts enabling lending and collateralized borrowing.' },
      { category_id: 'derivative', name: 'Derivative Exchange', description: 'Contracts for derivatives trading.' },
      { category_id: 'staking', name: 'Staking', description: 'Contracts where primary activity is staking.' },
      { category_id: 'index', name: 'Index', description: 'Crypto indexes representing market performance.' },
      { category_id: 'rwa', name: 'Real World Assets', description: 'Contracts for tangible asset management.' },
      { category_id: 'insurance', name: 'Insurance', description: 'Risk management and insurance coverage.' },
      { category_id: 'custody', name: 'Custody', description: 'Secure storage and asset management.' },
      { category_id: 'yield_vaults', name: 'Yield Vaults', description: 'Vault protocols for yield optimization.' }
    ]
  },
  {
    main_category_name: 'NFT',
    categories: [
      { category_id: 'nft_fi', name: 'NFT Finance', description: 'Financialization of NFTs.' },
      { category_id: 'nft_marketplace', name: 'NFT Marketplace', description: 'Contracts for NFT sale/minting.' },
      { category_id: 'non_fungible_tokens', name: 'Non-Fungible Tokens', description: 'Primarily ERC721/ERC1155 contracts.' }
    ]
  },
  {
    main_category_name: 'Social',
    categories: [
      { category_id: 'community', name: 'Community', description: 'Social interaction and education contracts.' },
      { category_id: 'gambling', name: 'Gambling', description: 'Games of chance.' },
      { category_id: 'gaming', name: 'Gaming', description: 'Contracts integrated into games.' },
      { category_id: 'governance', name: 'Governance', description: 'Voting and treasury management.' }
    ]
  },
  {
    main_category_name: 'Token Transfers',
    categories: [
      { category_id: 'native_transfer', name: 'Native Transfer', description: 'Native token transfers.' },
      { category_id: 'stablecoin', name: 'Stablecoin', description: 'ERC20 token contracts pegged to fiat.' },
      { category_id: 'fungible_tokens', name: 'Fungible Tokens', description: 'Standard ERC20 token contracts.' }
    ]
  },
  {
    main_category_name: 'Utility',
    categories: [
      { category_id: 'middleware', name: 'Middleware', description: 'Protocol interoperability.' },
      { category_id: 'erc4337', name: 'Account Abstraction (ERC4337)', description: 'Account abstraction contracts.' },
      { category_id: 'inscriptions', name: 'Inscriptions', description: 'Calldata inscription contracts.' },
      { category_id: 'oracle', name: 'Oracle', description: 'External data feeds.' },
      { category_id: 'depin', name: 'Decentralized Physical Infrastructure', description: 'Decentralized infrastructure.' },
      { category_id: 'developer_tools', name: 'Developer Tool', description: 'Developer support contracts.' },
      { category_id: 'identity', name: 'Identity', description: 'Digital identification contracts.' },
      { category_id: 'privacy', name: 'Privacy', description: 'Privacy-enhancing contracts.' },
      { category_id: 'airdrop', name: 'Airdrop', description: 'Token distribution contracts.' },
      { category_id: 'payments', name: 'Payments', description: 'Payment and transfer contracts.' },
      { category_id: 'donation', name: 'Donation', description: 'Fundraising contracts.' },
      { category_id: 'cybercrime', name: 'Cybercrime', description: 'Malicious contracts and exploits.' },
      { category_id: 'contract_deplyoment', name: 'Contract Deployments', description: 'Contract deployment factories.' },
      { category_id: 'other', name: 'Others', description: 'Miscellaneous utility contracts.' }
    ]
  },
  {
    main_category_name: 'Cross-Chain',
    categories: [
      { category_id: 'cc_communication', name: 'Cross-Chain Communication', description: 'Cross-chain data exchange.' },
      { category_id: 'bridge', name: 'Bridge', description: 'Cross-chain transfer contracts.' },
      { category_id: 'settlement', name: 'Settlement & DA', description: 'Settlement and DA contracts.' }
    ]
  }
];

export const VALID_CATEGORY_IDS = CATEGORIES.flatMap((mainCategory) =>
  mainCategory.categories.map((category) => category.category_id)
);
