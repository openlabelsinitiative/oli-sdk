# Contributions Module (`@openlabels/oli-sdk/contributions`)

This module streamlines project onboarding/edit flows so end users do not need to handle GitHub forks, commits, or pull requests.

Use it from a backend route with a developer-configured GitHub credential (service account PAT or token provider).

## What It Handles

- canonical project payload building and YAML serialization
- project payload validation (schema-style checks + duplicate checks when you provide existing project data)
- automatic PR creation for:
  - `oss-directory` YAML (`data/projects/<letter>/<slug>.yaml`)
  - `gtp-dna` logo file (`logos/images/<slug>.<ext>`)

## Exports

- YAML/payload helpers
  - `buildProjectPayloadFromDraft(draft)`
  - `applyProjectPatchToPayload(base, patch, options?)`
  - `parseProjectYaml(text)`
  - `serializeProjectYaml(payload)`
  - `reorderProjectPayload(payload)`
  - `normalizeProjectSlug(slug)`
  - `ensureProjectFilePath(slug)`
- Validation
  - `validateProjectPayload(payload, options?)`
- GitHub PR client
  - `GitHubPullRequestClient`
  - `createGitHubPullRequestClient(auth, fetchImpl?)`
- End-to-end orchestration
  - `submitProjectContribution(input, dependencies?)`
  - `inferLogoExtension(fileName?, mimeType?)`
  - `DEFAULT_CONTRIBUTION_REPOSITORIES`

## Backend Usage

```ts
import {
  buildProjectPayloadFromDraft,
  submitProjectContribution
} from '@openlabels/oli-sdk/contributions';

const payload = buildProjectPayloadFromDraft({
  name: 'example-project',
  displayName: 'Example Project',
  description: 'Example description',
  websites: ['https://example.org'],
  github: ['https://github.com/example/example-project'],
  social: {
    twitter: ['https://x.com/example']
  }
});

const result = await submitProjectContribution({
  auth: {
    token: process.env.GITHUB_SERVICE_TOKEN
  },
  targetOwner: process.env.GITHUB_WORKING_OWNER, // optional
  yaml: {
    mode: 'add',
    payload
  },
  logo: {
    fileBytes: new Uint8Array([/* binary logo bytes */]),
    fileName: 'logo.png',
    mimeType: 'image/png'
  },
  actorLabel: 'My backend workflow'
});

console.log(result.yaml.pullRequest.pullRequestUrl);
console.log(result.logo?.pullRequest.pullRequestUrl);
```

## Notes

- This workflow intentionally skips automatic logo fetching. It only submits user-provided logo bytes.
- If `targetOwner` differs from upstream repo owner, the PR client can auto-create/use a fork.
- Validation defaults to project `version: 7` and slug format `^[a-z0-9-]+$`.
