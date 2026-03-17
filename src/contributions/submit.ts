import { createGitHubPullRequestClient } from './github';
import {
  DEFAULT_PROJECT_VERSION,
  GitHubFileChangeRequest,
  ProjectContributionMode,
  ProjectContributionRepositories,
  ProjectValidationResult,
  PullRequestClient,
  SubmitProjectContributionInput,
  SubmitProjectContributionResult
} from './types';
import { ensureProjectFilePath, normalizeProjectSlug, serializeProjectYaml } from './yaml';
import { validateProjectPayload } from './validator';

const DEFAULT_REPOSITORIES: ProjectContributionRepositories = {
  projects: {
    owner: 'opensource-observer',
    repo: 'oss-directory',
    baseBranch: 'main'
  },
  logos: {
    owner: 'growthepie',
    repo: 'gtp-dna',
    baseBranch: 'main'
  }
};

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const ALLOWED_LOGO_EXTENSIONS = new Set([
  'png',
  'svg',
  'webp',
  'jpg',
  'jpeg',
  'gif'
]);

type SubmitProjectContributionDependencies = {
  pullRequestClient?: PullRequestClient;
  fetchImpl?: typeof fetch;
};

function resolveRepositories(
  repositories: SubmitProjectContributionInput['repositories']
): ProjectContributionRepositories {
  return {
    projects: {
      owner: repositories?.projects?.owner || DEFAULT_REPOSITORIES.projects.owner,
      repo: repositories?.projects?.repo || DEFAULT_REPOSITORIES.projects.repo,
      baseBranch:
        repositories?.projects?.baseBranch || DEFAULT_REPOSITORIES.projects.baseBranch
    },
    logos: {
      owner: repositories?.logos?.owner || DEFAULT_REPOSITORIES.logos.owner,
      repo: repositories?.logos?.repo || DEFAULT_REPOSITORIES.logos.repo,
      baseBranch:
        repositories?.logos?.baseBranch || DEFAULT_REPOSITORIES.logos.baseBranch
    }
  };
}

function isAllowedLogoExtension(value: string): boolean {
  return ALLOWED_LOGO_EXTENSIONS.has(value.toLowerCase());
}

function normalizeLogoBytes(value: Uint8Array | ArrayBuffer): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  return new Uint8Array(value);
}

function buildValidationErrorMessage(validation: ProjectValidationResult): string {
  const issueLines = validation.issues
    .slice(0, 12)
    .map((issue) => `- [${issue.code}] ${issue.path}: ${issue.message}`);
  const hasMore = validation.issues.length > issueLines.length;

  return [
    `Project payload validation failed with ${validation.issues.length} issue(s).`,
    ...issueLines,
    hasMore ? '- ...' : ''
  ]
    .filter(Boolean)
    .join('\n');
}

function defaultYamlPullRequestTitle(
  mode: ProjectContributionMode,
  displayName: string,
  slug: string
): string {
  const label = displayName || slug;
  return mode === 'edit' ? `Update ${label} project` : `Add ${label} project`;
}

function defaultYamlPullRequestBody(
  mode: ProjectContributionMode,
  slug: string,
  filePath: string,
  actorLabel: string
): string {
  return [
    mode === 'edit'
      ? 'Updated OSS-directory project metadata via OLI SDK.'
      : 'Added OSS-directory project metadata via OLI SDK.',
    '',
    `- slug: \`${slug}\``,
    `- file: \`${filePath}\``,
    `- source: ${actorLabel}`
  ].join('\n');
}

function defaultLogoPullRequestTitle(
  mode: ProjectContributionMode,
  displayName: string,
  slug: string
): string {
  const label = displayName || slug;
  return mode === 'edit' ? `Update logo for ${label}` : `Add logo for ${label}`;
}

function defaultLogoPullRequestBody(
  mode: ProjectContributionMode,
  slug: string,
  filePath: string,
  actorLabel: string
): string {
  return [
    mode === 'edit'
      ? 'Updated project logo via OLI SDK.'
      : 'Added project logo via OLI SDK.',
    '',
    `- slug: \`${slug}\``,
    `- file: \`${filePath}\``,
    `- source: ${actorLabel}`
  ].join('\n');
}

function normalizeGitHubFileRequest(
  request: Omit<
    GitHubFileChangeRequest,
    'targetOwner' | 'autoCreateFork' | 'branchName' | 'branchPrefix'
  >,
  input: SubmitProjectContributionInput
): GitHubFileChangeRequest {
  return {
    ...request,
    targetOwner: input.targetOwner,
    autoCreateFork: input.autoCreateFork,
    branchName: input.branch?.branchName,
    branchPrefix: input.branch?.branchPrefix || input.branchPrefix
  };
}

export function inferLogoExtension(
  fileName?: string,
  mimeType?: string
): string {
  const fileExtension = (fileName || '')
    .trim()
    .toLowerCase()
    .split('.')
    .pop();
  if (fileExtension && isAllowedLogoExtension(fileExtension)) {
    return fileExtension === 'jpeg' ? 'jpg' : fileExtension;
  }

  const fromMimeType = EXTENSIONS_BY_MIME_TYPE[(mimeType || '').toLowerCase()];
  if (fromMimeType && isAllowedLogoExtension(fromMimeType)) {
    return fromMimeType;
  }

  return 'png';
}

/**
 * Submit a project YAML (and optional logo) to the OSS Directory via GitHub
 * pull requests.
 *
 * Performs the following steps:
 * 1. Validates the YAML payload (unless `input.validateYaml` is `false`).
 * 2. Serialises the payload to YAML text.
 * 3. Opens (or updates) a pull request for the YAML file in the projects repo.
 * 4. If `input.logo` is provided, opens (or updates) a second pull request for
 *    the logo file in the logos repo.
 *
 * @param input - Contribution parameters including auth, YAML payload, and optional logo.
 * @param dependencies - Internal dependency overrides (useful for testing).
 * @returns URLs and metadata for the opened pull requests.
 * @throws `Error` when YAML validation fails (lists up to 12 issues in the message).
 *
 * @example
 * ```ts
 * const result = await submitProjectContribution({
 *   auth: { token: process.env.GITHUB_TOKEN },
 *   yaml: {
 *     mode: 'add',
 *     payload: { version: 7, name: 'my-project', display_name: 'My Project' }
 *   }
 * });
 * console.log(result.yaml.pullRequest.pullRequestUrl);
 * ```
 */
export async function submitProjectContribution(
  input: SubmitProjectContributionInput,
  dependencies: SubmitProjectContributionDependencies = {}
): Promise<SubmitProjectContributionResult> {
  const actorLabel =
    input.actorLabel?.trim() || 'OLI SDK project contribution workflow';
  const repositories = resolveRepositories(input.repositories);
  const projectSlug = normalizeProjectSlug(input.yaml.payload.name);
  const displayName =
    typeof input.yaml.payload.display_name === 'string'
      ? input.yaml.payload.display_name.trim()
      : projectSlug;

  const shouldValidate = input.validateYaml !== false;
  const validation = shouldValidate
    ? validateProjectPayload(input.yaml.payload, {
        enforceVersion: DEFAULT_PROJECT_VERSION,
        enforceSlugPattern: true,
        existingProjects: input.existingProjects,
        currentProjectName:
          input.yaml.existingProjectName ||
          (input.yaml.mode === 'edit' ? projectSlug : undefined)
      })
    : null;

  if (validation && !validation.valid) {
    throw new Error(buildValidationErrorMessage(validation));
  }

  const yamlText = serializeProjectYaml(input.yaml.payload);
  const yamlFilePath = input.yaml.filePath || ensureProjectFilePath(projectSlug);

  const pullRequestClient =
    dependencies.pullRequestClient ||
    createGitHubPullRequestClient(input.auth, dependencies.fetchImpl);

  const yamlPullRequest = await pullRequestClient.createOrUpdatePullRequest(
    normalizeGitHubFileRequest(
      {
        upstream: repositories.projects,
        filePath: yamlFilePath,
        fileContent: yamlText,
        fileContentEncoding: 'utf8',
        commitMessage:
          input.yaml.commitMessage ||
          defaultYamlPullRequestTitle(input.yaml.mode, displayName, projectSlug),
        pullRequestTitle:
          input.yaml.pullRequestTitle ||
          defaultYamlPullRequestTitle(input.yaml.mode, displayName, projectSlug),
        pullRequestBody:
          input.yaml.pullRequestBody ||
          defaultYamlPullRequestBody(
            input.yaml.mode,
            projectSlug,
            yamlFilePath,
            actorLabel
          )
      },
      input
    )
  );

  let logoResult: SubmitProjectContributionResult['logo'] = null;
  if (input.logo) {
    const logoSlug = normalizeProjectSlug(input.logo.slug || projectSlug);
    const logoMode = input.logo.mode || input.yaml.mode;
    const logoExtension = inferLogoExtension(input.logo.fileName, input.logo.mimeType);
    const logoFilePath =
      input.logo.filePath || `logos/images/${logoSlug}.${logoExtension}`;
    const logoBytes = normalizeLogoBytes(input.logo.fileBytes);

    const logoPullRequest = await pullRequestClient.createOrUpdatePullRequest(
      normalizeGitHubFileRequest(
        {
          upstream: repositories.logos,
          filePath: logoFilePath,
          fileContent: logoBytes,
          fileContentEncoding: 'utf8',
          deleteOtherExtensions: input.logo.replaceVariants === true,
          commitMessage:
            input.logo.commitMessage ||
            defaultLogoPullRequestTitle(logoMode, displayName, logoSlug),
          pullRequestTitle:
            input.logo.pullRequestTitle ||
            defaultLogoPullRequestTitle(logoMode, displayName, logoSlug),
          pullRequestBody:
            input.logo.pullRequestBody ||
            defaultLogoPullRequestBody(
              logoMode,
              logoSlug,
              logoFilePath,
              actorLabel
            )
        },
        input
      )
    );

    logoResult = {
      filePath: logoFilePath,
      extension: logoExtension,
      pullRequest: logoPullRequest
    };
  }

  return {
    yaml: {
      filePath: yamlFilePath,
      yamlText,
      validation,
      pullRequest: yamlPullRequest
    },
    logo: logoResult
  };
}

export const DEFAULT_CONTRIBUTION_REPOSITORIES = DEFAULT_REPOSITORIES;
