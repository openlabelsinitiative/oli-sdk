export const DEFAULT_PROJECT_VERSION = 7;

export const PROJECT_URL_FIELDS = [
  'websites',
  'github',
  'npm',
  'crates',
  'pypi',
  'go',
  'open_collective',
  'defillama'
] as const;

export type ProjectUrlField = (typeof PROJECT_URL_FIELDS)[number];

export interface ProjectUrlEntry {
  url: string;
  [key: string]: unknown;
}

export interface ProjectSocialProfile {
  farcaster?: ProjectUrlEntry[];
  medium?: ProjectUrlEntry[];
  mirror?: ProjectUrlEntry[];
  telegram?: ProjectUrlEntry[];
  twitter?: ProjectUrlEntry[];
  discord?: ProjectUrlEntry[];
  [platform: string]: ProjectUrlEntry[] | undefined;
}

export interface ProjectYamlPayload {
  version: number;
  name: string;
  display_name: string;
  description?: string;
  websites?: ProjectUrlEntry[];
  social?: ProjectSocialProfile;
  github?: ProjectUrlEntry[];
  npm?: ProjectUrlEntry[];
  crates?: ProjectUrlEntry[];
  pypi?: ProjectUrlEntry[];
  go?: ProjectUrlEntry[];
  open_collective?: ProjectUrlEntry[];
  blockchain?: Array<Record<string, unknown>>;
  defillama?: ProjectUrlEntry[];
  comments?: string[];
  [key: string]: unknown;
}

export interface ProjectDraftInput {
  version?: number;
  name: string;
  displayName: string;
  description?: string;
  websites?: string[];
  social?: Record<string, string[]>;
  github?: string[];
  npm?: string[];
  crates?: string[];
  pypi?: string[];
  go?: string[];
  openCollective?: string | string[];
  blockchain?: Array<Record<string, unknown>>;
  defillama?: string[];
  comments?: string | string[];
  extra?: Record<string, unknown>;
}

export interface ProjectPatchInput {
  version?: number | null;
  displayName?: string | null;
  description?: string | null;
  websites?: string[] | null;
  social?: Record<string, string[]> | null;
  github?: string[] | null;
  npm?: string[] | null;
  crates?: string[] | null;
  pypi?: string[] | null;
  go?: string[] | null;
  openCollective?: string | string[] | null;
  blockchain?: Array<Record<string, unknown>> | null;
  defillama?: string[] | null;
  comments?: string | string[] | null;
  extra?: Record<string, unknown>;
}

export type ProjectValidationIssueCode =
  | 'required'
  | 'type'
  | 'format'
  | 'value'
  | 'duplicate';

export interface ProjectValidationIssue {
  code: ProjectValidationIssueCode;
  path: string;
  message: string;
}

export interface ProjectValidationResult {
  valid: boolean;
  issues: ProjectValidationIssue[];
}

export interface ValidateProjectPayloadOptions {
  enforceVersion?: number;
  enforceSlugPattern?: boolean;
  existingProjects?: ProjectYamlPayload[];
  currentProjectName?: string;
}

export interface GitHubTokenConfig {
  token?: string;
  getToken?: () => Promise<string>;
  userAgent?: string;
}

export interface GitHubRepositoryRef {
  owner: string;
  repo: string;
  baseBranch?: string;
}

export interface GitHubFileChangeRequest {
  upstream: GitHubRepositoryRef;
  targetOwner?: string;
  autoCreateFork?: boolean;
  /**
   * Deterministic branch name. On collision appends -2, -3, etc.
   * Takes precedence over `branchPrefix` when provided.
   */
  branchName?: string;
  /** Legacy: timestamp/random-based branch prefix. Only used if `branchName` is absent. */
  branchPrefix?: string;
  sourceBaseBranch?: string;
  filePath: string;
  fileContent: string | Uint8Array;
  fileContentEncoding?: 'utf8' | 'base64';
  commitMessage: string;
  pullRequestTitle: string;
  pullRequestBody: string;
  /**
   * When true, after writing the file delete sibling files in the same directory
   * whose name starts with the same slug prefix but has a different extension.
   * Useful for logo replacement (e.g. avon.png replaces avon.svg).
   */
  deleteOtherExtensions?: boolean;
}

export interface GitHubPullRequestResult {
  pullRequestUrl: string;
  pullRequestNumber: number | null;
  branchName: string;
  filePath: string;
  head: string;
  base: string;
  targetOwner: string;
  upstreamOwner: string;
  upstreamRepo: string;
  commitSha: string | null;
}

export interface PullRequestClient {
  createOrUpdatePullRequest(
    request: GitHubFileChangeRequest
  ): Promise<GitHubPullRequestResult>;
}

export type ProjectContributionMode = 'add' | 'edit';

export interface ProjectYamlContribution {
  mode: ProjectContributionMode;
  payload: ProjectYamlPayload;
  existingProjectName?: string;
  filePath?: string;
  commitMessage?: string;
  pullRequestTitle?: string;
  pullRequestBody?: string;
}

export interface ProjectLogoContribution {
  mode?: ProjectContributionMode;
  slug?: string;
  fileBytes: Uint8Array | ArrayBuffer;
  fileName?: string;
  mimeType?: string;
  filePath?: string;
  commitMessage?: string;
  pullRequestTitle?: string;
  pullRequestBody?: string;
  /**
   * When true, deletes sibling logo files with other extensions in the same
   * directory on the branch (e.g. writing avon.png deletes avon.svg).
   */
  replaceVariants?: boolean;
}

export interface ProjectContributionRepositories {
  projects: GitHubRepositoryRef;
  logos: GitHubRepositoryRef;
}

/**
 * Branch naming options for contribution pull requests.
 *
 * - `branchName`: deterministic name; on collision appends -2, -3, etc.
 * - `branchPrefix`: legacy timestamp/random prefix (used only when `branchName` is absent).
 */
export interface ContributionBranchOptions {
  branchName?: string;
  branchPrefix?: string;
}

/**
 * Fields that can be patched in `submitProjectEditContribution`.
 * Only the fields explicitly provided are updated; all others are preserved
 * from the existing project YAML.
 */
export interface EditProjectPatch {
  /** Updated display name (required). */
  displayName: string;
  /** Updated description. Pass `null` to remove. */
  description?: string | null;
  /** Updated website URLs. Pass `null` or empty array to remove. */
  websites?: string[] | null;
  /** Updated GitHub URLs. Pass `null` or empty array to remove. */
  github?: string[] | null;
  /** Updated Twitter handle/URL. Pass `null` to remove. */
  twitter?: string | null;
  /** Updated Telegram handle/URL. Pass `null` to remove. */
  telegram?: string | null;
}

/**
 * Input for `submitProjectEditContribution`. Fetches the existing project YAML,
 * applies the patch, and opens a pull request with the updated file.
 */
export interface EditProjectInput {
  /** GitHub authentication config. */
  auth: GitHubTokenConfig;
  /**
   * Override the default target repositories.
   * Defaults to `opensource-observer/oss-directory` (YAML) and
   * `growthepie/gtp-dna` (logos).
   */
  repositories?: Partial<ProjectContributionRepositories>;
  /** Project slug — used to resolve `data/projects/<c>/<slug>.yaml`. */
  slug: string;
  /** Fields to update. All other fields are preserved from the existing file. */
  patch: EditProjectPatch;
  /** Branch naming options. Defaults to timestamp/random when omitted. */
  branch?: ContributionBranchOptions;
  /** GitHub username/org to open the PR from (fork owner). */
  targetOwner?: string;
  /** When `true`, auto-fork the upstream repo if the actor doesn't have one. */
  autoCreateFork?: boolean;
  /** Human-readable label included in the default PR body. */
  actorLabel?: string;
  /** Optional logo to update alongside the YAML. */
  logo?: ProjectLogoContribution;
  /**
   * When `false`, skip YAML validation before submission. Defaults to `true`.
   */
  validateYaml?: boolean;
  /** Existing project list used for duplicate-name validation. */
  existingProjects?: ProjectYamlPayload[];
}

export interface SubmitProjectEditContributionResult {
  yamlText: string;
  filePath: string;
  pullRequest: GitHubPullRequestResult;
  logo: SubmittedProjectLogoResult | null;
}

/**
 * Input for `submitProjectContribution`. Describes all parameters needed to
 * open a GitHub pull request that adds or updates an OSS Directory project entry.
 */
export interface SubmitProjectContributionInput {
  /** GitHub authentication config (personal-access token or token factory). */
  auth: GitHubTokenConfig;
  /** YAML project payload to submit (add or edit mode). */
  yaml: ProjectYamlContribution;
  /** Optional project logo to submit alongside the YAML. */
  logo?: ProjectLogoContribution;
  /**
   * Override the default target repositories.
   * Defaults to `opensource-observer/oss-directory` (YAML) and
   * `growthepie/gtp-dna` (logos).
   */
  repositories?: Partial<ProjectContributionRepositories>;
  /**
   * GitHub username/org to open the PR from (fork owner).
   * When omitted, the authenticated user's own account is used.
   */
  targetOwner?: string;
  /**
   * When `true`, automatically fork the upstream repository if the
   * authenticated user does not already have a fork.
   */
  autoCreateFork?: boolean;
  /** Branch naming options. `branchName` takes precedence over `branchPrefix`. */
  branch?: ContributionBranchOptions;
  /** @deprecated Use `branch.branchPrefix` instead. */
  branchPrefix?: string;
  /**
   * When `false`, skip YAML payload validation before submission.
   * Defaults to `true`.
   */
  validateYaml?: boolean;
  /** Human-readable label included in the default PR body. */
  actorLabel?: string;
  /**
   * Existing project list used for duplicate-name validation.
   * Pass the result of `fetchProjects()` for accurate deduplication.
   */
  existingProjects?: ProjectYamlPayload[];
}

export interface SubmittedProjectYamlResult {
  filePath: string;
  yamlText: string;
  validation: ProjectValidationResult | null;
  pullRequest: GitHubPullRequestResult;
}

export interface SubmittedProjectLogoResult {
  filePath: string;
  extension: string;
  pullRequest: GitHubPullRequestResult;
}

export interface SubmitProjectContributionResult {
  yaml: SubmittedProjectYamlResult;
  logo: SubmittedProjectLogoResult | null;
}
