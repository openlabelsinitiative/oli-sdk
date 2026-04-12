import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProjectPayloadFromDraft,
  inferLogoExtension,
  submitProjectContribution,
  validateProjectPayload
} from '../src/contributions';
import type {
  GitHubFileChangeRequest,
  GitHubPullRequestResult,
  PullRequestClient,
  ProjectYamlPayload
} from '../src/contributions';

class FakePullRequestClient implements PullRequestClient {
  readonly requests: GitHubFileChangeRequest[] = [];

  async createOrUpdatePullRequest(
    request: GitHubFileChangeRequest
  ): Promise<GitHubPullRequestResult> {
    this.requests.push(request);
    const sequence = this.requests.length;
    const branchName = `test/branch-${sequence}`;
    return {
      pullRequestUrl: `https://example.com/pr/${sequence}`,
      pullRequestNumber: sequence,
      branchName,
      filePath: request.filePath,
      head: `${request.targetOwner || request.upstream.owner}:${branchName}`,
      base: request.upstream.baseBranch || 'main',
      targetOwner: request.targetOwner || request.upstream.owner,
      upstreamOwner: request.upstream.owner,
      upstreamRepo: request.upstream.repo,
      commitSha: `sha-${sequence}`
    };
  }
}

test.describe('contributions module', () => {
  test('buildProjectPayloadFromDraft normalizes slug, comments, and URLs', () => {
    const payload = buildProjectPayloadFromDraft({
      name: 'Example-Project',
      displayName: 'Example Project',
      description: '  Example description  ',
      websites: ['https://example.org', ''],
      github: ['https://github.com/example/project'],
      openCollective: 'https://opencollective.com/example',
      social: {
        twitter: ['https://x.com/example']
      },
      comments: 'first line\n\nsecond line'
    });

    assert.equal(payload.name, 'example-project');
    assert.equal(payload.display_name, 'Example Project');
    assert.equal(payload.description, 'Example description');
    assert.deepEqual(payload.open_collective, [
      { url: 'https://opencollective.com/example' }
    ]);
    assert.deepEqual(payload.comments, ['first line', 'second line']);
    assert.deepEqual(payload.social?.twitter, [{ url: 'https://x.com/example' }]);
  });

  test('validateProjectPayload catches URL/type issues and duplicates', () => {
    const payload = {
      version: 7,
      name: 'example-project',
      display_name: 'Example Project',
      github: [{ url: 'not-a-url' }],
      open_collective: 'https://opencollective.com/example'
    } as unknown as ProjectYamlPayload;

    const existingProjects: ProjectYamlPayload[] = [
      {
        version: 7,
        name: 'existing-project',
        display_name: 'Example Project',
        github: [{ url: 'https://github.com/example/project' }]
      }
    ];

    const validation = validateProjectPayload(payload, { existingProjects });
    assert.equal(validation.valid, false);
    assert.ok(
      validation.issues.some(
        (issue) => issue.path === 'github[0].url' && issue.code === 'format'
      )
    );
    assert.ok(
      validation.issues.some(
        (issue) => issue.path === 'open_collective' && issue.code === 'type'
      )
    );
    assert.ok(
      validation.issues.some(
        (issue) => issue.path === 'display_name' && issue.code === 'duplicate'
      )
    );
  });

  test('submitProjectContribution creates YAML + logo PR requests through one backend client', async () => {
    const payload = buildProjectPayloadFromDraft({
      name: 'example-project',
      displayName: 'Example Project',
      websites: ['https://example.org'],
      github: ['https://github.com/example/project']
    });

    const pullRequestClient = new FakePullRequestClient();

    const result = await submitProjectContribution(
      {
        auth: { token: 'service-token' },
        targetOwner: 'service-bot',
        repositories: {
          projects: { owner: 'upstream-org', repo: 'oss-directory' },
          logos: { owner: 'logo-org', repo: 'gtp-dna' }
        },
        actorLabel: 'integration-test',
        yaml: {
          mode: 'add',
          payload
        },
        logo: {
          fileBytes: new Uint8Array([137, 80, 78, 71]),
          fileName: 'logo.jpeg'
        }
      },
      { pullRequestClient }
    );

    assert.equal(pullRequestClient.requests.length, 2);

    const yamlRequest = pullRequestClient.requests[0];
    const logoRequest = pullRequestClient.requests[1];

    assert.equal(
      yamlRequest.filePath,
      'data/projects/e/example-project.yaml'
    );
    assert.equal(logoRequest.filePath, 'logos/images/example-project.jpg');
    assert.equal(yamlRequest.upstream.owner, 'upstream-org');
    assert.equal(logoRequest.upstream.repo, 'gtp-dna');
    assert.ok(
      typeof yamlRequest.fileContent === 'string' &&
        yamlRequest.fileContent.includes('display_name: Example Project')
    );
    assert.ok(logoRequest.fileContent instanceof Uint8Array);

    assert.equal(result.yaml.filePath, 'data/projects/e/example-project.yaml');
    assert.equal(result.logo?.extension, 'jpg');
    assert.equal(
      result.yaml.pullRequest.pullRequestUrl,
      'https://example.com/pr/1'
    );
    assert.equal(
      result.logo?.pullRequest.pullRequestUrl,
      'https://example.com/pr/2'
    );
  });

  test('inferLogoExtension handles filename and mimeType fallbacks', () => {
    assert.equal(inferLogoExtension('brand.SVG', undefined), 'svg');
    assert.equal(inferLogoExtension(undefined, 'image/webp'), 'webp');
    assert.equal(inferLogoExtension(undefined, 'application/octet-stream'), 'png');
  });
});
