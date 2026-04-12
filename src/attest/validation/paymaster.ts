import { levenshteinDistance } from './levenshtein';

export const VALID_PAYMASTER_CATEGORIES = ['verifying', 'token', 'verifying_and_token'];

const PAYMASTER_ALIASES: Record<string, string> = {
  verify: 'verifying',
  verification: 'verifying',
  verifier: 'verifying',
  tokens: 'token',
  token_paymaster: 'token',
  verifying_token: 'verifying_and_token',
  token_and_verifying: 'verifying_and_token',
  both: 'verifying_and_token',
  hybrid: 'verifying_and_token'
};

export function convertPaymasterAlias(value: string): string {
  if (!value) return value;
  const normalized = value.toLowerCase().trim();
  if (PAYMASTER_ALIASES[normalized]) {
    return PAYMASTER_ALIASES[normalized];
  }
  if (VALID_PAYMASTER_CATEGORIES.includes(value)) {
    return value;
  }
  return value;
}

export function getSmartPaymasterSuggestions(value: string): string[] {
  if (!value) return [];

  const normalized = value.toLowerCase().trim();
  const candidates: { category: string; score: number }[] = [];

  VALID_PAYMASTER_CATEGORIES.forEach((category) => {
    let score = 0;
    if (category === normalized) {
      score = 100;
    } else if (category.includes(normalized) || normalized.includes(category)) {
      const ratio = Math.min(category.length, normalized.length) / Math.max(category.length, normalized.length);
      if (ratio > 0.4) {
        score = 80 + ratio * 15;
      }
    } else {
      const distance = levenshteinDistance(normalized, category);
      const similarity = 1 - distance / Math.max(normalized.length, category.length);
      if (similarity > 0.6) {
        score = similarity * 75;
      }
    }

    if (score > 50) {
      candidates.push({ category, score });
    }
  });

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.category);
}
