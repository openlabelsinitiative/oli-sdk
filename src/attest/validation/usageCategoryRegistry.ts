import yaml from 'js-yaml';
import type { UsageCategoryRecord, UsageCategoryRegistry } from '../types';
import { CATEGORIES, VALID_CATEGORY_IDS } from '../core/categories';
import { levenshteinDistance } from './levenshtein';

/**
 * Default OLI source URL for dynamic usage-category loading.
 * Points to the canonical `usage_category.yml` in the OLI GitHub repository.
 */
export const DEFAULT_USAGE_CATEGORY_SOURCE =
  'https://raw.githubusercontent.com/openlabelsinitiative/OLI/main/1_tag_definitions/values/usage_category.yml';

// Simple module-level TTL cache keyed by source URL
type CacheEntry = { records: UsageCategoryRecord[]; expiresAt: number };
const _fetchCache = new Map<string, CacheEntry>();

function parseOliCategoryYaml(text: string): UsageCategoryRecord[] {
  const raw = yaml.load(text);

  // Support both top-level array and `{ values: [...] }` wrapper
  let items: unknown[] = [];
  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.values)) {
      items = obj.values;
    } else if (Array.isArray(obj.categories)) {
      items = obj.categories;
    }
  }

  return items
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: String(item.tag_id ?? item.id ?? '').trim(),
      name: String(item.name ?? item.tag_id ?? item.id ?? '').trim(),
      description: item.description ? String(item.description).trim() : undefined
    }))
    .filter((r) => r.id.length > 0);
}

/**
 * Fetch the latest `usage_category` definitions from OLI (or a custom source URL).
 *
 * Results are cached in-process for `revalidateSeconds` (default 300 s / 5 min).
 * Pass `revalidateSeconds: 0` to always bypass the cache.
 *
 * @example
 * ```ts
 * const categories = await fetchUsageCategories();
 * // [{ id: 'dex', name: 'Decentralized Exchange', description: '…' }, …]
 * ```
 */
export async function fetchUsageCategories(input?: {
  sourceUrl?: string;
  fetchImpl?: typeof fetch;
  revalidateSeconds?: number;
}): Promise<UsageCategoryRecord[]> {
  const url = input?.sourceUrl ?? DEFAULT_USAGE_CATEGORY_SOURCE;
  const ttlMs = (input?.revalidateSeconds ?? 300) * 1000;

  if (ttlMs > 0) {
    const cached = _fetchCache.get(url);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.records;
    }
  }

  const fetchFn = input?.fetchImpl ?? fetch;
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch usage categories from ${url}: HTTP ${response.status}`
    );
  }

  const text = await response.text();
  const records = parseOliCategoryYaml(text);

  if (ttlMs > 0) {
    _fetchCache.set(url, { records, expiresAt: Date.now() + ttlMs });
  }

  return records;
}

/**
 * Build a `UsageCategoryRegistry` from the OLI source with optional filtering.
 *
 * - Use `allowedIds` to limit the registry to the IDs your host app supports.
 * - Use `filter` for programmatic per-record filtering.
 * - Omit both to create a registry containing all OLI categories.
 *
 * @example
 * ```ts
 * // Registry scoped to the IDs GTP actually uses
 * const registry = await createUsageCategoryRegistry({
 *   allowedIds: ['dex', 'lending', 'bridge', 'staking']
 * });
 *
 * // All OLI categories, refreshed every 10 minutes
 * const registry = await createUsageCategoryRegistry({ revalidateSeconds: 600 });
 * ```
 */
export async function createUsageCategoryRegistry(input?: {
  sourceUrl?: string;
  allowedIds?: string[];
  filter?: (category: UsageCategoryRecord) => boolean;
  fetchImpl?: typeof fetch;
  revalidateSeconds?: number;
}): Promise<UsageCategoryRegistry> {
  const all = await fetchUsageCategories({
    sourceUrl: input?.sourceUrl,
    fetchImpl: input?.fetchImpl,
    revalidateSeconds: input?.revalidateSeconds
  });

  let allowed = all;

  if (input?.allowedIds && input.allowedIds.length > 0) {
    const allowedSet = new Set(input.allowedIds);
    allowed = all.filter((c) => allowedSet.has(c.id));
  }

  if (input?.filter) {
    allowed = allowed.filter(input.filter);
  }

  return {
    all,
    allowed,
    allowedIds: new Set(allowed.map((c) => c.id))
  };
}

/**
 * Validate a `usage_category` value against a registry.
 *
 * Falls back to the SDK's static built-in category list when no registry is
 * provided, so this function is a drop-in replacement for `validateCategory`.
 *
 * Returns `null` when valid, or an error message string when invalid.
 *
 * @param value    - The `usage_category` string to validate.
 * @param registry - Optional registry (built with `createUsageCategoryRegistry`).
 */
export function validateUsageCategory(
  value: string,
  registry?: UsageCategoryRegistry
): string | null {
  if (!value) return null;

  const isValid = registry
    ? registry.allowedIds.has(value)
    : VALID_CATEGORY_IDS.includes(value);

  return isValid
    ? null
    : `Invalid category: "${value}". Please select from available categories.`;
}

/**
 * Get ranked `usage_category` suggestions for an invalid value.
 *
 * Uses `registry.allowed` when provided so suggestions are always scoped to
 * the host app's supported set. Falls back to the SDK's static list otherwise.
 *
 * @param value    - The invalid `usage_category` string entered by the user.
 * @param registry - Optional registry to scope suggestions.
 * @returns Up to 5 ranked category ID strings.
 */
export function getUsageCategorySuggestions(
  value: string,
  registry?: UsageCategoryRegistry
): string[] {
  if (!value) return [];

  const normalizedValue = value.toLowerCase().trim();

  type CatEntry = { id: string; name: string; description: string; mainCategory: string };

  const categories: CatEntry[] = registry
    ? registry.allowed.map((r) => ({
        id: r.id,
        name: r.name.toLowerCase(),
        description: (r.description ?? '').toLowerCase(),
        mainCategory: ''
      }))
    : CATEGORIES.flatMap((mc) =>
        mc.categories.map((c) => ({
          id: c.category_id,
          name: c.name.toLowerCase(),
          description: c.description.toLowerCase(),
          mainCategory: mc.main_category_name.toLowerCase()
        }))
      );

  const scored: { category: string; score: number }[] = [];

  categories.forEach((cat) => {
    let score = 0;

    if (cat.id === normalizedValue) {
      score = 100;
    } else if (cat.name === normalizedValue) {
      score = 95;
    } else if (cat.name.includes(normalizedValue) || normalizedValue.includes(cat.name)) {
      const ratio =
        Math.min(cat.name.length, normalizedValue.length) /
        Math.max(cat.name.length, normalizedValue.length);
      if (ratio > 0.4) {
        score = 80 + ratio * 15;
      }
    } else if (cat.description.includes(normalizedValue)) {
      score = 70;
    } else if (
      cat.mainCategory &&
      (cat.mainCategory.includes(normalizedValue) || normalizedValue.includes(cat.mainCategory))
    ) {
      score = 60;
    } else {
      const dist = levenshteinDistance(normalizedValue, cat.name);
      const sim = 1 - dist / Math.max(normalizedValue.length, cat.name.length);
      if (sim > 0.6) score = sim * 75;

      const idDist = levenshteinDistance(normalizedValue, cat.id);
      const idSim = 1 - idDist / Math.max(normalizedValue.length, cat.id.length);
      if (idSim > 0.6) score = Math.max(score, idSim * 80);
    }

    if (score > 50) {
      scored.push({ category: cat.id, score });
    }
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((e) => e.category);
}

export type { UsageCategoryRecord, UsageCategoryRegistry };
