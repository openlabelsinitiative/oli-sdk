import { createGitHubPullRequestClient, GitHubPullRequestClient } from './github';
import {
  DEFAULT_PROJECT_VERSION,
  EditProjectInput,
  ProjectContributionRepositories,
  ProjectValidationResult,
  SubmitProjectEditContributionResult,
  SubmittedProjectLogoResult
} from './types';
import {
  ensureProjectFilePath,
  normalizeProjectSlug,
  parseProjectYaml,
  patchProjectYamlText,
  serializeProjectYaml
} from './yaml';
import { validateProjectPayload } from './validator';
import { inferLogoExtension } from './submit';

const DEFAULT_EDIT_REPOSITORIES: ProjectContributionRepositories = {
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

type EditDependencies = {
  githubClient?: GitHubPullRequestClient;
  fetchImpl?: typeof fetch;
};

function resolveEditRepositories(
  input: EditProjectInput
): ProjectContributionRepositories {
  return {
    projects: {
      owner:
        input.repositories?.projects?.owner ||
        DEFAULT_EDIT_REPOSITORIES.projects.owner,
      repo:
        input.repositories?.projects?.repo ||
        DEFAULT_EDIT_REPOSITORIES.projects.repo,
      baseBranch:
        input.repositories?.projects?.baseBranch ||
        DEFAULT_EDIT_REPOSITORIES.projects.baseBranch
    },
    logos: {
      owner:
        input.repositories?.logos?.owner ||
        DEFAULT_EDIT_REPOSITORIES.logos.owner,
      repo:
        input.repositories?.logos?.repo ||
        DEFAULT_EDIT_REPOSITORIES.logos.repo,
      baseBranch:
        input.repositories?.logos?.baseBranch ||
        DEFAULT_EDIT_REPOSITORIES.logos.baseBranch
    }
  };
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

function normalizeLogoBytes(value: Uint8Array | ArrayBuffer): Uint8Array {
  return value instanceof Uint8Array ? value : new Uint8Array(value);
}

/**
 * Fetch the current YAML text for a project slug from GitHub.
 *
 * Uses `ensureProjectFilePath(slug)` to resolve the canonical path, then
 * fetches the file from the configured projects repository. Returns `null`
 * when the file does not exist.
 *
 * @param auth     GitHub auth config.
 * @param slug     Project slug.
 * @param options  Optional repository override and fetch implementation.
 */
export async function fetchExistingProjectYaml(
  auth: EditProjectInput['auth'],
  slug: string,
  options?: {
    repository?: EditProjectInput['repositories'];
    fetchImpl?: typeof fetch;
  }
): Promise<{ content: string; sha: string; filePath: string } | null> {
  const repo = {
    owner:
      options?.repository?.projects?.owner ||
      DEFAULT_EDIT_REPOSITORIES.projects.owner,
    repo:
      options?.repository?.projects?.repo ||
      DEFAULT_EDIT_REPOSITORIES.projects.repo,
    baseBranch:
      options?.repository?.projects?.baseBranch ||
      DEFAULT_EDIT_REPOSITORIES.projects.baseBranch
  };

  const normalizedSlug = normalizeProjectSlug(slug);
  const filePath = ensureProjectFilePath(normalizedSlug);

  const client = createGitHubPullRequestClient(auth, options?.fetchImpl);
  const result = await client.fetchFileContents(
    repo.owner,
    repo.repo,
    filePath,
    repo.baseBranch
  );

  if (!result) {
    return null;
  }

  return { ...result, filePath };
}

/**
 * Fetch the existing project YAML, apply the provided patch, and open a
 * pull request with the updated file.
 *
 * The canonical file path is resolved via `ensureProjectFilePath(slug)` so
 * the frontend does not need to duplicate that logic.
 *
 * Supports:
 * - Deterministic PR branch names (`input.branch.branchName`)
 * - Logo variant replacement (`input.logo.replaceVariants`)
 *
 * @returns `{ yamlText, filePath, pullRequest, logo }`
 */
export async function submitProjectEditContribution(
  input: EditProjectInput,
  dependencies: EditDependencies = {}
): Promise<SubmitProjectEditContributionResult> {
  const actorLabel = input.actorLabel?.trim() || 'OLI SDK project edit workflow';
  const repositories = resolveEditRepositories(input);
  const slug = normalizeProjectSlug(input.slug);
  const filePath = ensureProjectFilePath(slug);

  const githubClient =
    dependencies.githubClient ||
    createGitHubPullRequestClient(input.auth, dependencies.fetchImpl);

  // Fetch existing YAML from the canonical path
  const existingFile = await githubClient.fetchFileContents(
    repositories.projects.owner,
    repositories.projects.repo,
    filePath,
    repositories.projects.baseBranch
  );

  if (!existingFile) {
    throw new Error(
      `Project YAML not found at ${filePath} in ` +
        `${repositories.projects.owner}/${repositories.projects.repo}.`
    );
  }

  // Two-pass patch: apply fields → canonical serialization
  const yamlText = patchProjectYamlText(existingFile.content, input.patch);

  // Optional validation
  if (input.validateYaml !== false) {
    const patchedPayload = parseProjectYaml(yamlText);
    const validation = validateProjectPayload(patchedPayload, {
      enforceVersion: DEFAULT_PROJECT_VERSION,
      enforceSlugPattern: true,
      existingProjects: input.existingProjects,
      currentProjectName: slug
    });
    if (!validation.valid) {
      throw new Error(buildValidationErrorMessage(validation));
    }
  }

  const displayName =
    parseProjectYaml(yamlText).display_name || slug;

  const branchName = input.branch?.branchName;
  const branchPrefix = input.branch?.branchPrefix;

  const yamlPullRequest = await githubClient.createOrUpdatePullRequest({
    upstream: repositories.projects,
    targetOwner: input.targetOwner,
    autoCreateFork: input.autoCreateFork,
    branchName,
    branchPrefix,
    filePath,
    fileContent: yamlText,
    fileContentEncoding: 'utf8',
    commitMessage: `Update ${displayName} project`,
    pullRequestTitle: `Update ${displayName} project`,
    pullRequestBody: [
      'Updated OSS-directory project metadata via OLI SDK.',
      '',
      `- slug: \`${slug}\``,
      `- file: \`${filePath}\``,
      `- source: ${actorLabel}`
    ].join('\n')
  });

  let logoResult: SubmittedProjectLogoResult | null = null;

  if (input.logo) {
    const logoSlug = normalizeProjectSlug(input.logo.slug || slug);
    const logoExtension = inferLogoExtension(input.logo.fileName, input.logo.mimeType);
    const logoFilePath =
      input.logo.filePath || `logos/images/${logoSlug}.${logoExtension}`;
    const logoBytes = normalizeLogoBytes(input.logo.fileBytes);
    const logoMode = input.logo.mode || 'edit';

    const logoPullRequest = await githubClient.createOrUpdatePullRequest({
      upstream: repositories.logos,
      targetOwner: input.targetOwner,
      autoCreateFork: input.autoCreateFork,
      branchName,
      branchPrefix,
      filePath: logoFilePath,
      fileContent: logoBytes,
      fileContentEncoding: 'utf8',
      deleteOtherExtensions: input.logo.replaceVariants === true,
      commitMessage:
        input.logo.commitMessage || `Update logo for ${displayName}`,
      pullRequestTitle:
        input.logo.pullRequestTitle || `Update logo for ${displayName}`,
      pullRequestBody:
        input.logo.pullRequestBody ||
        [
          logoMode === 'edit'
            ? 'Updated project logo via OLI SDK.'
            : 'Added project logo via OLI SDK.',
          '',
          `- slug: \`${logoSlug}\``,
          `- file: \`${logoFilePath}\``,
          `- source: ${actorLabel}`
        ].join('\n')
    });

    logoResult = {
      filePath: logoFilePath,
      extension: logoExtension,
      pullRequest: logoPullRequest
    };
  }

  return {
    yamlText,
    filePath,
    pullRequest: yamlPullRequest,
    logo: logoResult
  };
}

export { serializeProjectYaml, parseProjectYaml, ensureProjectFilePath };
