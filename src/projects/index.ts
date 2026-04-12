export type { ProjectRecord } from '../attest/types';
export type {
  ProjectValidationResult,
  ProjectSimilarityField,
  ProjectSimilarityMatch,
  ResolveProjectsListOptions
} from './features';

export {
  PROJECTS_URL,
  resetProjectsCache,
  fetchProjects,
  resolveProjectsList,
  isProjectFieldSimilar,
  findSimilarProjectMatches,
  findSimilarProjects,
  getSmartProjectSuggestions,
  getProjectValidation,
  validateProjectId
} from './features';
