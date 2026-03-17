import yaml from 'js-yaml';
import {
  DEFAULT_PROJECT_VERSION,
  EditProjectPatch,
  PROJECT_URL_FIELDS,
  ProjectDraftInput,
  ProjectPatchInput,
  ProjectSocialProfile,
  ProjectUrlEntry,
  ProjectYamlPayload
} from './types';

const PROJECT_KEY_ORDER: ReadonlyArray<string> = [
  'version',
  'name',
  'display_name',
  'description',
  'websites',
  'social',
  'github',
  'npm',
  'crates',
  'pypi',
  'go',
  'open_collective',
  'blockchain',
  'defillama',
  'comments'
] as const;

const EMPTY_OBJECT: Record<string, unknown> = {};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return EMPTY_OBJECT;
  }
  return value as Record<string, unknown>;
}

function normalizeText(value: string): string {
  return value.trim();
}

function normalizeTextArray(values: string[] | undefined | null): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.map((item) => item.trim()).filter(Boolean);
}

function toUrlEntries(
  value:
    | string
    | string[]
    | ProjectUrlEntry
    | ProjectUrlEntry[]
    | undefined
    | null
): ProjectUrlEntry[] | undefined {
  if (value == null) {
    return undefined;
  }

  const entries = Array.isArray(value) ? value : [value];
  const normalized: ProjectUrlEntry[] = [];

  entries.forEach((entry) => {
    if (typeof entry === 'string') {
      const url = normalizeText(entry);
      if (url) {
        normalized.push({ url });
      }
      return;
    }

    const record = asRecord(entry);
    const url = typeof record.url === 'string' ? normalizeText(record.url) : '';
    if (url) {
      normalized.push({ url });
    }
  });

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeSocialProfile(
  social?: Record<string, string[]> | null
): ProjectSocialProfile | undefined {
  if (!social || typeof social !== 'object') {
    return undefined;
  }

  const normalized: ProjectSocialProfile = {};
  Object.entries(social).forEach(([platform, values]) => {
    const urls = normalizeTextArray(values);
    if (urls.length === 0) {
      return;
    }
    normalized[platform] = urls.map((url) => ({ url }));
  });

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeComments(
  comments: string | string[] | undefined | null
): string[] | undefined {
  if (comments == null) {
    return undefined;
  }

  const values = Array.isArray(comments)
    ? comments
    : comments
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

  const normalized = values.map((line) => line.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function setOptionalField(
  payload: ProjectYamlPayload,
  key: keyof ProjectYamlPayload,
  value: unknown
): void {
  if (value == null) {
    delete payload[key];
    return;
  }
  if (Array.isArray(value) && value.length === 0) {
    delete payload[key];
    return;
  }
  payload[key] = value as never;
}

export function normalizeProjectSlug(value: string): string {
  return normalizeText(value).toLowerCase();
}

export function ensureProjectFilePath(slug: string): string {
  const normalizedSlug = normalizeProjectSlug(slug);
  if (!normalizedSlug) {
    throw new Error('Project slug cannot be empty.');
  }
  return `data/projects/${normalizedSlug.charAt(0)}/${normalizedSlug}.yaml`;
}

export function reorderProjectPayload(payload: ProjectYamlPayload): ProjectYamlPayload {
  const reordered: ProjectYamlPayload = {} as ProjectYamlPayload;

  PROJECT_KEY_ORDER.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      reordered[key as keyof ProjectYamlPayload] = payload[
        key as keyof ProjectYamlPayload
      ] as never;
    }
  });

  Object.keys(payload).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(reordered, key)) {
      reordered[key] = payload[key];
    }
  });

  return reordered;
}

export function buildProjectPayloadFromDraft(
  draft: ProjectDraftInput
): ProjectYamlPayload {
  const slug = normalizeProjectSlug(draft.name);
  const displayName = normalizeText(draft.displayName);

  const payload: ProjectYamlPayload = {
    version:
      typeof draft.version === 'number' ? draft.version : DEFAULT_PROJECT_VERSION,
    name: slug,
    display_name: displayName
  };

  const description = normalizeText(draft.description || '');
  if (description) {
    payload.description = description;
  }

  PROJECT_URL_FIELDS.forEach((field) => {
    if (field === 'open_collective') {
      return;
    }
    const source = draft[field as Exclude<typeof field, 'open_collective'>];
    const entries = toUrlEntries(source as string[] | undefined);
    if (entries) {
      payload[field] = entries;
    }
  });

  const openCollectiveEntries = toUrlEntries(draft.openCollective);
  if (openCollectiveEntries) {
    payload.open_collective = openCollectiveEntries;
  }

  const social = normalizeSocialProfile(draft.social);
  if (social) {
    payload.social = social;
  }

  if (Array.isArray(draft.blockchain) && draft.blockchain.length > 0) {
    payload.blockchain = draft.blockchain;
  }

  const comments = normalizeComments(draft.comments);
  if (comments) {
    payload.comments = comments;
  }

  if (draft.extra && typeof draft.extra === 'object') {
    Object.entries(draft.extra).forEach(([key, value]) => {
      payload[key] = value;
    });
  }

  return reorderProjectPayload(payload);
}

type PatchArrayField = Exclude<
  keyof ProjectPatchInput,
  | 'version'
  | 'displayName'
  | 'description'
  | 'openCollective'
  | 'social'
  | 'comments'
  | 'extra'
>;

const PATCH_ARRAY_FIELDS: ReadonlyArray<PatchArrayField> = [
  'websites',
  'github',
  'npm',
  'crates',
  'pypi',
  'go',
  'defillama',
  'blockchain'
] as const;

export function applyProjectPatchToPayload(
  basePayload: ProjectYamlPayload,
  patch: ProjectPatchInput,
  options?: { lockedSlug?: string }
): ProjectYamlPayload {
  const payload: ProjectYamlPayload = { ...basePayload };

  payload.name = normalizeProjectSlug(options?.lockedSlug || basePayload.name);

  if (patch.version !== undefined) {
    if (patch.version === null) {
      payload.version = DEFAULT_PROJECT_VERSION;
    } else if (typeof patch.version === 'number') {
      payload.version = patch.version;
    }
  }

  if (patch.displayName !== undefined) {
    const nextValue = normalizeText(patch.displayName || '');
    if (!nextValue) {
      throw new Error('displayName cannot be empty when provided in a patch.');
    }
    payload.display_name = nextValue;
  }

  if (patch.description !== undefined) {
    const nextValue = normalizeText(patch.description || '');
    setOptionalField(payload, 'description', nextValue || null);
  }

  PATCH_ARRAY_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(patch, field)) {
      return;
    }
    const value = patch[field];
    if (field === 'blockchain') {
      setOptionalField(payload, 'blockchain', value);
      return;
    }
    const entries = toUrlEntries(value as string[] | undefined | null);
    setOptionalField(payload, field as keyof ProjectYamlPayload, entries || null);
  });

  if (patch.openCollective !== undefined) {
    const entries = toUrlEntries(patch.openCollective);
    setOptionalField(payload, 'open_collective', entries || null);
  }

  if (patch.social !== undefined) {
    const social = normalizeSocialProfile(patch.social);
    setOptionalField(payload, 'social', social || null);
  }

  if (patch.comments !== undefined) {
    const comments = normalizeComments(patch.comments);
    setOptionalField(payload, 'comments', comments || null);
  }

  if (patch.extra && typeof patch.extra === 'object') {
    Object.entries(patch.extra).forEach(([key, value]) => {
      payload[key] = value;
    });
  }

  return reorderProjectPayload(payload);
}

/**
 * Apply an `EditProjectPatch` to an existing YAML text string.
 *
 * Implements a two-pass approach:
 *  - Pass 1: parse the existing YAML, apply only the specified patch fields
 *    (all unmentioned fields are preserved unchanged).
 *  - Pass 2: re-serialize with canonical key ordering via `serializeProjectYaml`.
 *
 * `social.twitter` and `social.telegram` are merged with the existing social
 * object so that other platforms (farcaster, discord, etc.) are preserved.
 *
 * @param existingYamlText - Current YAML file contents.
 * @param patch - Fields to update.
 * @returns Updated YAML string.
 */
export function patchProjectYamlText(
  existingYamlText: string,
  patch: EditProjectPatch
): string {
  const basePayload = parseProjectYaml(existingYamlText);
  const projectPatch: ProjectPatchInput = {};

  if (patch.displayName !== undefined) {
    projectPatch.displayName = patch.displayName;
  }

  if ('description' in patch) {
    projectPatch.description = patch.description ?? null;
  }

  if ('websites' in patch) {
    projectPatch.websites = patch.websites?.length ? patch.websites : null;
  }

  if ('github' in patch) {
    projectPatch.github = patch.github?.length ? patch.github : null;
  }

  if ('twitter' in patch || 'telegram' in patch) {
    // Merge with existing social so other platforms are preserved.
    const mergedSocial: Record<string, string[]> = {};

    if (basePayload.social) {
      Object.entries(basePayload.social).forEach(([platform, entries]) => {
        if (Array.isArray(entries)) {
          const urls = entries
            .map((e) =>
              e && typeof e === 'object'
                ? (e as ProjectUrlEntry).url
                : String(e)
            )
            .filter(Boolean);
          if (urls.length > 0) {
            mergedSocial[platform] = urls;
          }
        }
      });
    }

    if ('twitter' in patch) {
      if (patch.twitter) {
        mergedSocial['twitter'] = [patch.twitter];
      } else {
        delete mergedSocial['twitter'];
      }
    }

    if ('telegram' in patch) {
      if (patch.telegram) {
        mergedSocial['telegram'] = [patch.telegram];
      } else {
        delete mergedSocial['telegram'];
      }
    }

    projectPatch.social = Object.keys(mergedSocial).length > 0 ? mergedSocial : null;
  }

  const patchedPayload = applyProjectPatchToPayload(basePayload, projectPatch);
  return serializeProjectYaml(patchedPayload);
}

export function parseProjectYaml(yamlText: string): ProjectYamlPayload {
  const parsed = yaml.load(yamlText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Project YAML must parse into an object.');
  }

  const payload = parsed as ProjectYamlPayload;
  return reorderProjectPayload(payload);
}

export function serializeProjectYaml(payload: ProjectYamlPayload): string {
  const ordered = reorderProjectPayload(payload);
  return yaml.dump(ordered, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });
}
