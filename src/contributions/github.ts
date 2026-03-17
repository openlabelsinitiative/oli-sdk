import {
  GitHubFileChangeRequest,
  GitHubPullRequestResult,
  GitHubRepositoryRef,
  GitHubTokenConfig,
  PullRequestClient
} from './types';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';

type FetchLike = typeof fetch;

type GitHubRepoResponse = {
  default_branch?: string;
};

type GitHubRefResponse = {
  object?: {
    sha?: string;
  };
};

type GitHubPutContentResponse = {
  commit?: {
    sha?: string;
  };
};

type GitHubFileContentResponse = {
  sha?: string;
  content?: string;
  encoding?: string;
  type?: string;
};

type GitHubContentItem = {
  name: string;
  path: string;
  sha: string;
  type: string;
};

type GitHubPullResponse = {
  number?: number;
  html_url?: string;
};

function encodeContentPath(pathValue: string): string {
  return pathValue
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function nowStamp(): string {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

function randomToken(): string {
  return Math.random().toString(36).slice(2, 8);
}

function normalizeBranchPrefix(value: string | undefined): string {
  const fallback = 'oli/contributions';
  const trimmed = (value || fallback).trim().replace(/^\/+|\/+$/g, '');
  return trimmed || fallback;
}

function resolveUserAgent(auth: GitHubTokenConfig): string {
  return auth.userAgent?.trim() || 'oli-sdk';
}

async function resolveToken(auth: GitHubTokenConfig): Promise<string> {
  const staticToken = auth.token?.trim();
  if (staticToken) {
    return staticToken;
  }

  if (auth.getToken) {
    const dynamicToken = (await auth.getToken())?.trim();
    if (dynamicToken) {
      return dynamicToken;
    }
  }

  throw new Error('GitHub token is not configured.');
}

function toUint8Array(content: string | Uint8Array): Uint8Array {
  if (typeof content === 'string') {
    return new TextEncoder().encode(content);
  }
  return content;
}

function base64ToString(base64: string): string {
  const clean = base64.replace(/\s/g, '');
  const maybeBuffer = (
    globalThis as { Buffer?: { from: (data: string, encoding: string) => Uint8Array } }
  ).Buffer;
  if (maybeBuffer) {
    return new TextDecoder().decode(maybeBuffer.from(clean, 'base64'));
  }
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  const maybeBuffer = (
    globalThis as { Buffer?: { from: (data: Uint8Array) => { toString: (encoding: string) => string } } }
  ).Buffer;
  if (maybeBuffer) {
    return maybeBuffer.from(bytes).toString('base64');
  }

  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function encodeContent(
  content: string | Uint8Array,
  encoding: 'utf8' | 'base64' = 'utf8'
): string {
  if (encoding === 'base64') {
    if (typeof content !== 'string') {
      throw new Error(
        'fileContentEncoding="base64" requires fileContent to be a base64 string.'
      );
    }
    const normalized = content.trim();
    if (!normalized) {
      throw new Error('Base64 file content cannot be empty.');
    }
    return normalized;
  }
  return bytesToBase64(toUint8Array(content));
}

export class GitHubPullRequestClient implements PullRequestClient {
  private readonly auth: GitHubTokenConfig;
  private readonly fetchImpl: FetchLike;

  constructor(auth: GitHubTokenConfig, fetchImpl: FetchLike = fetch) {
    this.auth = auth;
    this.fetchImpl = fetchImpl;
  }

  private async githubFetch(
    token: string,
    path: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/vnd.github+json');
    headers.set('X-GitHub-Api-Version', GITHUB_API_VERSION);
    if (!headers.has('User-Agent')) {
      headers.set('User-Agent', resolveUserAgent(this.auth));
    }

    return this.fetchImpl(`${GITHUB_API_BASE}${path}`, {
      ...init,
      headers
    });
  }

  private async readErrorBody(response: Response): Promise<string> {
    try {
      const body = await response.text();
      return body || '(empty response body)';
    } catch {
      return '(unable to read response body)';
    }
  }

  private async getRepository(
    token: string,
    owner: string,
    repo: string
  ): Promise<GitHubRepoResponse | null> {
    const response = await this.githubFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { method: 'GET' }
    );
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const body = await this.readErrorBody(response);
      throw new Error(
        `Failed to read repository ${owner}/${repo}: HTTP ${response.status} ${body}`
      );
    }
    return (await response.json()) as GitHubRepoResponse;
  }

  private async ensureForkReady(
    token: string,
    upstream: GitHubRepositoryRef,
    forkOwner: string
  ): Promise<GitHubRepoResponse> {
    const existingFork = await this.getRepository(token, forkOwner, upstream.repo);
    if (existingFork) {
      return existingFork;
    }

    const createResponse = await this.githubFetch(
      token,
      `/repos/${encodeURIComponent(upstream.owner)}/${encodeURIComponent(
        upstream.repo
      )}/forks`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization: forkOwner })
      }
    );

    if (!createResponse.ok && createResponse.status !== 202) {
      const body = await this.readErrorBody(createResponse);
      throw new Error(
        `Failed to create fork ${forkOwner}/${upstream.repo}: HTTP ${createResponse.status} ${body}`
      );
    }

    const backoff = [800, 1200, 2000, 3200, 5000, 8000];
    for (const waitMs of backoff) {
      await sleep(waitMs);
      const repo = await this.getRepository(token, forkOwner, upstream.repo);
      if (repo) {
        return repo;
      }
    }

    throw new Error(
      `Fork ${forkOwner}/${upstream.repo} is not available yet. Please retry shortly.`
    );
  }

  private async getRefSha(
    token: string,
    owner: string,
    repo: string,
    branch: string
  ): Promise<string> {
    const response = await this.githubFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/git/ref/heads/${encodeURIComponent(branch)}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const body = await this.readErrorBody(response);
      throw new Error(
        `Failed to read branch ref ${owner}/${repo}:${branch}: HTTP ${response.status} ${body}`
      );
    }

    const refData = (await response.json()) as GitHubRefResponse;
    const sha = refData.object?.sha;
    if (!sha) {
      throw new Error(`Branch ref ${owner}/${repo}:${branch} did not return a SHA.`);
    }
    return sha;
  }

  private async createBranch(
    token: string,
    owner: string,
    repo: string,
    baseSha: string,
    options?: { branchPrefix?: string; branchName?: string }
  ): Promise<string> {
    const requestedName = options?.branchName?.trim();

    if (requestedName) {
      // Deterministic naming: oli-contrib-avon, oli-contrib-avon-2, …
      for (let attempt = 1; attempt <= 10; attempt += 1) {
        const candidateName = attempt === 1 ? requestedName : `${requestedName}-${attempt}`;
        const response = await this.githubFetch(
          token,
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ref: `refs/heads/${candidateName}`,
              sha: baseSha
            })
          }
        );

        if (response.ok) {
          return candidateName;
        }

        if (response.status === 422) {
          continue;
        }

        const body = await this.readErrorBody(response);
        throw new Error(
          `Failed to create branch ${candidateName}: HTTP ${response.status} ${body}`
        );
      }

      throw new Error(`Could not create a unique branch name for '${requestedName}'.`);
    }

    // Legacy: timestamp/random behavior
    const prefix = normalizeBranchPrefix(options?.branchPrefix);
    const baseName = `${prefix}/${nowStamp()}-${randomToken()}`;
    let branchName = baseName;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await this.githubFetch(
        token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ref: `refs/heads/${branchName}`,
            sha: baseSha
          })
        }
      );

      if (response.ok) {
        return branchName;
      }

      if (response.status === 422) {
        branchName = `${baseName}-${randomToken()}`;
        continue;
      }

      const body = await this.readErrorBody(response);
      throw new Error(
        `Failed to create branch ${branchName}: HTTP ${response.status} ${body}`
      );
    }

    throw new Error('Could not create a unique branch name.');
  }

  private async getExistingFileSha(
    token: string,
    owner: string,
    repo: string,
    filePath: string,
    branchName: string
  ): Promise<string | null> {
    const response = await this.githubFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/contents/${encodeContentPath(filePath)}?ref=${encodeURIComponent(
        branchName
      )}`,
      { method: 'GET' }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await this.readErrorBody(response);
      throw new Error(
        `Failed to read existing file ${filePath}: HTTP ${response.status} ${body}`
      );
    }

    const json = (await response.json()) as { sha?: string };
    return typeof json.sha === 'string' ? json.sha : null;
  }

  private async upsertFile(
    token: string,
    owner: string,
    repo: string,
    branchName: string,
    filePath: string,
    contentBase64: string,
    commitMessage: string
  ): Promise<string | null> {
    const existingSha = await this.getExistingFileSha(
      token,
      owner,
      repo,
      filePath,
      branchName
    );

    const response = await this.githubFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/contents/${encodeContentPath(filePath)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage,
          content: contentBase64,
          branch: branchName,
          ...(existingSha ? { sha: existingSha } : {})
        })
      }
    );

    if (!response.ok) {
      const body = await this.readErrorBody(response);
      throw new Error(
        `Failed to upsert file ${filePath}: HTTP ${response.status} ${body}`
      );
    }

    const json = (await response.json()) as GitHubPutContentResponse;
    return json.commit?.sha || null;
  }

  private async listDirectory(
    token: string,
    owner: string,
    repo: string,
    dirPath: string,
    ref?: string
  ): Promise<GitHubContentItem[]> {
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const response = await this.githubFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/contents/${encodeContentPath(dirPath)}${query}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? (data as GitHubContentItem[]) : [];
  }

  private async deleteFileOnBranch(
    token: string,
    owner: string,
    repo: string,
    filePath: string,
    sha: string,
    branchName: string,
    commitMessage: string
  ): Promise<void> {
    const response = await this.githubFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/contents/${encodeContentPath(filePath)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage, sha, branch: branchName })
      }
    );

    // Silently ignore 404 (already gone) but swallow other errors to avoid
    // breaking the main PR flow.
    void response;
  }

  private async findOpenPullRequest(
    token: string,
    upstream: GitHubRepositoryRef,
    headRef: string,
    baseBranch: string
  ): Promise<GitHubPullResponse | null> {
    const response = await this.githubFetch(
      token,
      `/repos/${encodeURIComponent(upstream.owner)}/${encodeURIComponent(
        upstream.repo
      )}/pulls?state=open&head=${encodeURIComponent(
        headRef
      )}&base=${encodeURIComponent(baseBranch)}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      return null;
    }

    const pulls = (await response.json()) as GitHubPullResponse[];
    if (!Array.isArray(pulls) || pulls.length === 0) {
      return null;
    }

    return pulls[0] || null;
  }

  private async createPullRequest(
    token: string,
    request: GitHubFileChangeRequest,
    headRef: string,
    baseBranch: string
  ): Promise<GitHubPullResponse> {
    const response = await this.githubFetch(
      token,
      `/repos/${encodeURIComponent(request.upstream.owner)}/${encodeURIComponent(
        request.upstream.repo
      )}/pulls`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: request.pullRequestTitle,
          body: request.pullRequestBody,
          head: headRef,
          base: baseBranch
        })
      }
    );

    if (response.ok) {
      return (await response.json()) as GitHubPullResponse;
    }

    if (response.status === 422) {
      const existing = await this.findOpenPullRequest(
        token,
        request.upstream,
        headRef,
        baseBranch
      );
      if (existing) {
        return existing;
      }
    }

    const body = await this.readErrorBody(response);
    throw new Error(
      `Failed to create pull request: HTTP ${response.status} ${body}`
    );
  }

  /**
   * Fetch the decoded text content and blob SHA of a file from GitHub.
   * Returns `null` if the file does not exist (404).
   */
  async fetchFileContents(
    owner: string,
    repo: string,
    filePath: string,
    ref?: string
  ): Promise<{ content: string; sha: string } | null> {
    const token = await resolveToken(this.auth);
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const response = await this.githubFetch(
      token,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
        repo
      )}/contents/${encodeContentPath(filePath)}${query}`,
      { method: 'GET' }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const body = await this.readErrorBody(response);
      throw new Error(`Failed to fetch file ${filePath}: HTTP ${response.status} ${body}`);
    }

    const json = (await response.json()) as GitHubFileContentResponse;
    const sha = json.sha;
    const encodedContent = json.content;

    if (!sha || !encodedContent || json.encoding !== 'base64') {
      return null;
    }

    return { content: base64ToString(encodedContent), sha };
  }

  async createOrUpdatePullRequest(
    request: GitHubFileChangeRequest
  ): Promise<GitHubPullRequestResult> {
    const token = await resolveToken(this.auth);

    const upstreamRepo = await this.getRepository(
      token,
      request.upstream.owner,
      request.upstream.repo
    );
    if (!upstreamRepo) {
      throw new Error(
        `Upstream repository not found: ${request.upstream.owner}/${request.upstream.repo}`
      );
    }

    const baseBranch =
      request.upstream.baseBranch?.trim() || upstreamRepo.default_branch || 'main';

    const targetOwner = request.targetOwner?.trim() || request.upstream.owner;
    let targetRepo =
      targetOwner === request.upstream.owner
        ? upstreamRepo
        : await this.getRepository(token, targetOwner, request.upstream.repo);

    if (!targetRepo) {
      if (request.autoCreateFork === false) {
        throw new Error(
          `Repository not found for target owner ${targetOwner}/${request.upstream.repo}.`
        );
      }
      targetRepo = await this.ensureForkReady(token, request.upstream, targetOwner);
    }

    const sourceBaseBranch =
      request.sourceBaseBranch?.trim() || targetRepo.default_branch || baseBranch;
    const baseSha = await this.getRefSha(
      token,
      targetOwner,
      request.upstream.repo,
      sourceBaseBranch
    );

    const branchName = await this.createBranch(
      token,
      targetOwner,
      request.upstream.repo,
      baseSha,
      { branchName: request.branchName, branchPrefix: request.branchPrefix }
    );

    const contentBase64 = encodeContent(
      request.fileContent,
      request.fileContentEncoding
    );

    const commitSha = await this.upsertFile(
      token,
      targetOwner,
      request.upstream.repo,
      branchName,
      request.filePath,
      contentBase64,
      request.commitMessage
    );

    if (request.deleteOtherExtensions) {
      const lastSlash = request.filePath.lastIndexOf('/');
      const dir = lastSlash >= 0 ? request.filePath.slice(0, lastSlash) : '.';
      const filename = lastSlash >= 0 ? request.filePath.slice(lastSlash + 1) : request.filePath;
      const dotIndex = filename.lastIndexOf('.');

      if (dotIndex > 0) {
        const slugPrefix = filename.slice(0, dotIndex);
        const currentExt = filename.slice(dotIndex + 1).toLowerCase();
        const items = await this.listDirectory(
          token, targetOwner, request.upstream.repo, dir, branchName
        );

        for (const item of items) {
          if (item.type !== 'file') continue;
          if (!item.name.startsWith(`${slugPrefix}.`)) continue;
          const itemExt = item.name.slice(slugPrefix.length + 1).toLowerCase();
          if (itemExt === currentExt) continue;

          await this.deleteFileOnBranch(
            token, targetOwner, request.upstream.repo,
            item.path, item.sha, branchName,
            `chore: remove ${item.name} (replaced by ${filename})`
          );
        }
      }
    }

    const headRef = `${targetOwner}:${branchName}`;
    const pullRequest = await this.createPullRequest(
      token,
      request,
      headRef,
      baseBranch
    );
    const pullRequestUrl = pullRequest.html_url;
    if (!pullRequestUrl) {
      throw new Error('Pull request response did not include html_url.');
    }

    return {
      pullRequestUrl,
      pullRequestNumber:
        typeof pullRequest.number === 'number' ? pullRequest.number : null,
      branchName,
      filePath: request.filePath,
      head: headRef,
      base: baseBranch,
      targetOwner,
      upstreamOwner: request.upstream.owner,
      upstreamRepo: request.upstream.repo,
      commitSha
    };
  }
}

export function createGitHubPullRequestClient(
  auth: GitHubTokenConfig,
  fetchImpl?: FetchLike
): GitHubPullRequestClient {
  return new GitHubPullRequestClient(auth, fetchImpl);
}
