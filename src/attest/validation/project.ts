import type { ProjectRecord } from '../types';
import {
  fetchProjects,
  findSimilarProjects,
  getProjectValidation,
  getSmartProjectSuggestions,
  isProjectFieldSimilar,
  resetProjectsCache,
  resolveProjectsList
} from '../../projects/features';

export { resetProjectsCache, fetchProjects, resolveProjectsList, getSmartProjectSuggestions, getProjectValidation };

// Backward-compatible internal alias used by attestation validation internals.
export function isSimilarValue(value1: string, value2: string, fieldType: string): boolean {
  const normalizedFieldType =
    fieldType === 'name' || fieldType === 'display_name' || fieldType === 'github' || fieldType === 'website'
      ? fieldType
      : 'name';

  return isProjectFieldSimilar(
    value1,
    value2,
    normalizedFieldType as 'name' | 'display_name' | 'github' | 'website'
  );
}

// Backward-compatible internal alias.
export function suggestSimilarProjects(value: string, projects: ProjectRecord[]): ProjectRecord[] {
  return findSimilarProjects(value, projects, 3);
}
