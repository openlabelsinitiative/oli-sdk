import type { ProjectRecord } from '../attest/types';
import { levenshteinDistance } from '../attest/validation/levenshtein';

export const PROJECTS_URL = 'https://api.growthepie.com/v1/labels/projects.json';

export type ProjectSimilarityField = 'name' | 'owner_project' | 'display_name' | 'github' | 'website';

export interface ProjectValidationResult {
  valid: boolean;
  suggestions: string[];
  similarProjects: string[];
}

export interface ProjectSimilarityMatch {
  project: ProjectRecord;
  confidence: 'exact' | 'similar';
  field: ProjectSimilarityField;
}

export interface ResolveProjectsListOptions {
  projects?: ProjectRecord[];
  fetchProjects?: () => Promise<ProjectRecord[]>;
}

let projectsCache: ProjectRecord[] = [];
let pendingProjectsFetch: Promise<ProjectRecord[]> | null = null;

function transformProjectData(data: unknown): ProjectRecord[] {
  if (
    !data ||
    typeof data !== 'object' ||
    !('data' in data) ||
    typeof (data as Record<string, unknown>).data !== 'object' ||
    (data as { data?: { data?: unknown[]; types?: string[] } }).data?.data === undefined
  ) {
    return [];
  }

  const typed = data as { data?: { data?: unknown[]; types?: string[] } };
  const rows = typed.data?.data;
  const types = typed.data?.types;

  if (!Array.isArray(rows) || !Array.isArray(types)) {
    return [];
  }

  return rows
    .filter((row): row is unknown[] => Array.isArray(row))
    .map((row) => {
      const record: Record<string, unknown> = {};
      types.forEach((type, index) => {
        if (row[index] !== null && row[index] !== undefined) {
          record[type] = row[index];
        }
      });
      return record as ProjectRecord;
    });
}

function normalizeUrlCandidate(url: string): string {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const hostname = new URL(normalized).hostname;
    return hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase().replace(/^www\./, '');
  }
}

function toFieldType(fieldType: ProjectSimilarityField): ProjectSimilarityField {
  if (fieldType === 'owner_project') {
    return 'name';
  }
  return fieldType;
}

function fieldToProjectProperty(fieldType: ProjectSimilarityField): keyof ProjectRecord | null {
  switch (fieldType) {
    case 'name':
    case 'owner_project':
      return 'owner_project';
    case 'display_name':
      return 'display_name';
    case 'github':
      return 'main_github';
    case 'website':
      return 'website';
    default:
      return null;
  }
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  if (typeof value === 'string') {
    return [value];
  }

  return [];
}

export function isProjectFieldSimilar(value1: string, value2: string, fieldType: ProjectSimilarityField): boolean {
  const normalizedType = toFieldType(fieldType);
  const v1 = value1.toLowerCase().trim();
  const v2 = value2.toLowerCase().trim();

  if (!v1 || !v2) {
    return false;
  }

  if (v1 === v2) {
    return true;
  }

  if (normalizedType === 'website' || normalizedType === 'github') {
    const d1 = normalizeUrlCandidate(v1);
    const d2 = normalizeUrlCandidate(v2);
    if (d1 === d2) {
      return true;
    }

    const t1 = d1.split('.').slice(0, -1).join('.');
    const t2 = d2.split('.').slice(0, -1).join('.');
    if (t1 && t2 && t1 === t2) {
      return true;
    }
  }

  if (normalizedType === 'name' || normalizedType === 'display_name') {
    if (v1.includes(v2) || v2.includes(v1)) {
      const ratio = Math.min(v1.length, v2.length) / Math.max(v1.length, v2.length);
      if (ratio > 0.8) {
        return true;
      }
    }

    const tokenize = (value: string) => value.split(/[^a-z0-9]+/).filter((token) => token.length > 0);
    const tokens1 = tokenize(v1);
    const tokens2 = tokenize(v2);
    const common = tokens1.filter((token) => tokens2.includes(token));

    if (common.length > 0 && common.length >= Math.min(tokens1.length, tokens2.length) * 0.7) {
      return true;
    }
  }

  return false;
}

function suggestSimilarProjects(value: string, projects: ProjectRecord[], limit: number): ProjectRecord[] {
  const normalized = value.toLowerCase().trim();
  if (!normalized) {
    return [];
  }

  return projects
    .filter((project) => {
      const owner = typeof project.owner_project === 'string' ? project.owner_project : '';
      const display = typeof project.display_name === 'string' ? project.display_name : '';
      return isProjectFieldSimilar(owner, normalized, 'name') || isProjectFieldSimilar(display, normalized, 'display_name');
    })
    .slice(0, limit);
}

export function findSimilarProjects(value: string, projects: ProjectRecord[], limit = 3): ProjectRecord[] {
  return suggestSimilarProjects(value, projects, limit);
}

export function findSimilarProjectMatches(
  value: string,
  fieldType: ProjectSimilarityField,
  projects: ProjectRecord[],
  limit = 5
): ProjectSimilarityMatch[] {
  if (!value || projects.length === 0) {
    return [];
  }

  const field = fieldToProjectProperty(fieldType);
  if (!field) {
    return [];
  }

  const normalizedSearchValue = value.toLowerCase().trim();
  const exactMatches: ProjectSimilarityMatch[] = [];
  const similarMatches: ProjectSimilarityMatch[] = [];

  projects.forEach((project) => {
    const values = asStringArray(project[field]);
    if (values.length === 0) {
      return;
    }

    const hasExactMatch = values.some((candidate) => candidate.toLowerCase().trim() === normalizedSearchValue);
    if (hasExactMatch) {
      exactMatches.push({
        project,
        confidence: 'exact',
        field: fieldType
      });
      return;
    }

    const hasSimilarMatch = values.some((candidate) => isProjectFieldSimilar(candidate, normalizedSearchValue, fieldType));
    if (hasSimilarMatch) {
      similarMatches.push({
        project,
        confidence: 'similar',
        field: fieldType
      });
    }
  });

  const preferred = exactMatches.length > 0 ? exactMatches : similarMatches;
  return preferred.slice(0, limit);
}

export function getSmartProjectSuggestions(value: string, projects: ProjectRecord[], limit = 5): string[] {
  if (!value || projects.length === 0) {
    return [];
  }

  const normalized = value.toLowerCase().trim();
  const suggestions: { project: string; score: number }[] = [];

  projects.forEach((project) => {
    if (!project.owner_project || typeof project.owner_project !== 'string') {
      return;
    }

    const owner = project.owner_project.toLowerCase();
    const display = typeof project.display_name === 'string' ? project.display_name.toLowerCase() : '';
    let score = 0;

    if (owner === normalized || display === normalized) {
      score = 100;
    } else if (owner.includes(normalized) || normalized.includes(owner)) {
      const ratio = Math.min(owner.length, normalized.length) / Math.max(owner.length, normalized.length);
      if (ratio > 0.5) {
        score = 80 + ratio * 20;
      }
    } else if (display && (display.includes(normalized) || normalized.includes(display))) {
      const ratio = Math.min(display.length, normalized.length) / Math.max(display.length, normalized.length);
      if (ratio > 0.5) {
        score = 70 + ratio * 20;
      }
    } else {
      const ownerDistance = levenshteinDistance(normalized, owner);
      const ownerSimilarity = 1 - ownerDistance / Math.max(normalized.length, owner.length);
      if (ownerSimilarity > 0.6) {
        score = ownerSimilarity * 80;
      }

      if (display) {
        const displayDistance = levenshteinDistance(normalized, display);
        const displaySimilarity = 1 - displayDistance / Math.max(normalized.length, display.length);
        if (displaySimilarity > 0.6) {
          score = Math.max(score, displaySimilarity * 70);
        }
      }
    }

    if (score > 40) {
      suggestions.push({ project: project.owner_project, score });
    }
  });

  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.project);
}

export function getProjectValidation(value: string, projects: ProjectRecord[]): ProjectValidationResult {
  if (!value) {
    return { valid: true, suggestions: [], similarProjects: [] };
  }

  const validIds = new Set(projects.map((project) => project.owner_project).filter(Boolean));
  if (validIds.has(value)) {
    return { valid: true, suggestions: [], similarProjects: [] };
  }

  const smartSuggestions = getSmartProjectSuggestions(value, projects);
  if (smartSuggestions.length > 0) {
    const suggestionsSet = new Set(smartSuggestions);
    const similarProjects = projects
      .filter((project) => project.owner_project && suggestionsSet.has(project.owner_project))
      .map((project) => project.display_name || project.owner_project)
      .filter((name): name is string => typeof name === 'string');

    return {
      valid: false,
      suggestions: smartSuggestions,
      similarProjects
    };
  }

  const similar = suggestSimilarProjects(value, projects, 3);
  return {
    valid: false,
    suggestions: similar
      .map((project) => project.owner_project)
      .filter((project): project is string => typeof project === 'string'),
    similarProjects: similar
      .map((project) => project.display_name || project.owner_project)
      .filter((name): name is string => typeof name === 'string')
  };
}

export function validateProjectId(value: string, projects: ProjectRecord[]): ProjectValidationResult {
  return getProjectValidation(value, projects);
}

export function resetProjectsCache(): void {
  projectsCache = [];
  pendingProjectsFetch = null;
}

export async function fetchProjects(fetcher: typeof fetch = fetch): Promise<ProjectRecord[]> {
  if (projectsCache.length > 0) {
    return projectsCache;
  }

  if (pendingProjectsFetch) {
    return pendingProjectsFetch;
  }

  pendingProjectsFetch = fetcher(PROJECTS_URL)
    .then((response) => response.json())
    .then((data) => {
      projectsCache = transformProjectData(data);
      pendingProjectsFetch = null;
      return projectsCache;
    })
    .catch(() => {
      pendingProjectsFetch = null;
      return [];
    });

  return pendingProjectsFetch;
}

export async function resolveProjectsList(options: ResolveProjectsListOptions = {}): Promise<ProjectRecord[]> {
  if (Array.isArray(options.projects)) {
    return options.projects;
  }

  if (typeof options.fetchProjects === 'function') {
    try {
      return await options.fetchProjects();
    } catch {
      return [];
    }
  }

  return fetchProjects();
}
