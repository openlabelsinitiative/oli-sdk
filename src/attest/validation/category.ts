import { CATEGORIES, VALID_CATEGORY_IDS } from '../core/categories';
import { levenshteinDistance } from './levenshtein';

const CATEGORY_ALIASES: Record<string, string> = {
  defi: 'dex',
  exchange: 'dex',
  swap: 'dex',
  uniswap: 'dex',
  nft: 'non_fungible_tokens',
  erc721: 'non_fungible_tokens',
  erc1155: 'non_fungible_tokens',
  token: 'fungible_tokens',
  erc20: 'fungible_tokens',
  stable: 'stablecoin',
  usdc: 'stablecoin',
  usdt: 'stablecoin',
  game: 'gaming',
  vote: 'governance',
  dao: 'governance',
  yield: 'yield_vaults',
  farm: 'yield_vaults',
  vault: 'yield_vaults',
  loan: 'lending',
  borrow: 'lending',
  stake: 'staking',
  bridge: 'bridge',
  crosschain: 'cc_communication',
  'cross-chain': 'cc_communication',
  oracle: 'oracle',
  insurance: 'insurance',
  privacy: 'privacy',
  identity: 'identity',
  payment: 'payments',
  donation: 'donation',
  airdrop: 'airdrop',
  exploit: 'cybercrime',
  hack: 'cybercrime',
  scam: 'cybercrime',
  mev: 'mev',
  arbitrage: 'mev',
  bot: 'mev',
  derivative: 'derivative',
  futures: 'derivative',
  options: 'derivative',
  perp: 'derivative',
  perpetual: 'derivative',
  index: 'index',
  etf: 'index',
  marketplace: 'nft_marketplace',
  opensea: 'nft_marketplace',
  mint: 'nft_marketplace',
  gambling: 'gambling',
  bet: 'gambling',
  lottery: 'gambling',
  community: 'community',
  social: 'community',
  middleware: 'middleware',
  abstraction: 'erc4337',
  aa: 'erc4337',
  inscription: 'inscriptions',
  ordinal: 'inscriptions',
  depin: 'depin',
  infrastructure: 'depin',
  developer: 'developer_tools',
  tool: 'developer_tools',
  dev: 'developer_tools',
  custody: 'custody',
  custodial: 'custody',
  rwa: 'rwa',
  'real-world': 'rwa',
  asset: 'rwa',
  cex: 'cex',
  centralized: 'cex',
  settlement: 'settlement',
  da: 'settlement',
  l2: 'settlement',
  layer2: 'settlement',
  rollup: 'settlement',
  deployment: 'contract_deplyoment',
  deploy: 'contract_deplyoment',
  factory: 'contract_deplyoment',
  other: 'other',
  misc: 'other',
  miscellaneous: 'other',
  unknown: 'other'
};

export function convertCategoryAlias(value: string): string {
  if (!value) return value;
  const normalized = value.toLowerCase().trim();
  if (CATEGORY_ALIASES[normalized]) {
    return CATEGORY_ALIASES[normalized];
  }
  if (VALID_CATEGORY_IDS.includes(value)) {
    return value;
  }
  return value;
}

export function getSmartCategorySuggestions(value: string): string[] {
  if (!value) return [];

  const normalizedValue = value.toLowerCase().trim();
  const suggestions: { category: string; score: number }[] = [];

  const allCategories = CATEGORIES.flatMap((mainCategory) =>
    mainCategory.categories.map((category) => ({
      id: category.category_id,
      name: category.name.toLowerCase(),
      description: category.description.toLowerCase(),
      mainCategory: mainCategory.main_category_name.toLowerCase()
    }))
  );

  allCategories.forEach((category) => {
    let score = 0;

    if (category.id === normalizedValue) {
      score = 100;
    } else if (category.name === normalizedValue) {
      score = 95;
    } else if (category.name.includes(normalizedValue) || normalizedValue.includes(category.name)) {
      const ratio = Math.min(category.name.length, normalizedValue.length) / Math.max(category.name.length, normalizedValue.length);
      if (ratio > 0.4) {
        score = 80 + ratio * 15;
      }
    } else if (category.description.includes(normalizedValue)) {
      score = 70;
    } else if (category.mainCategory.includes(normalizedValue) || normalizedValue.includes(category.mainCategory)) {
      score = 60;
    } else {
      const distance = levenshteinDistance(normalizedValue, category.name);
      const similarity = 1 - distance / Math.max(normalizedValue.length, category.name.length);
      if (similarity > 0.6) {
        score = similarity * 75;
      }

      const idDistance = levenshteinDistance(normalizedValue, category.id);
      const idSimilarity = 1 - idDistance / Math.max(normalizedValue.length, category.id.length);
      if (idSimilarity > 0.6) {
        score = Math.max(score, idSimilarity * 80);
      }
    }

    if (score > 50) {
      suggestions.push({ category: category.id, score });
    }
  });

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry) => entry.category);
}
