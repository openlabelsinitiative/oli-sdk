import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchProjects,
  findSimilarProjectMatches,
  findSimilarProjects,
  getProjectValidation,
  getSmartProjectSuggestions,
  isProjectFieldSimilar,
  resetProjectsCache,
  validateProjectId
} from '../src/projects';
import type { ProjectRecord } from '../src/projects';

const PROJECTS: ProjectRecord[] = [
  {
    owner_project: 'growthepie',
    display_name: 'Growthepie',
    website: 'https://www.growthepie.xyz',
    main_github: 'https://github.com/growthepie'
  },
  {
    owner_project: 'uniswap',
    display_name: 'Uniswap',
    website: 'https://uniswap.org',
    main_github: 'https://github.com/Uniswap'
  },
  {
    owner_project: 'basescan',
    display_name: 'BaseScan',
    website: 'basescan.org',
    main_github: 'https://github.com/blockscout'
  }
];

test.describe('projects module', () => {
  test('returns typo-aware suggestions + validation parity for owner_project', () => {
    const smartSuggestions = getSmartProjectSuggestions('growthpie', PROJECTS);
    assert.deepEqual(smartSuggestions[0], 'growthepie');

    const validation = getProjectValidation('growthpie', PROJECTS);
    assert.equal(validation.valid, false);
    assert.deepEqual(validation.suggestions[0], 'growthepie');

    const aliasValidation = validateProjectId('growthpie', PROJECTS);
    assert.equal(aliasValidation.valid, false);
    assert.deepEqual(aliasValidation.suggestions[0], 'growthepie');
  });

  test('matches website/github values using domain normalization similarity', () => {
    assert.equal(isProjectFieldSimilar('https://www.growthepie.xyz', 'growthepie.xyz', 'website'), true);
    assert.equal(isProjectFieldSimilar('https://github.com/Uniswap', 'github.com/uniswap', 'github'), true);

    const websiteMatches = findSimilarProjectMatches('growthepie.xyz', 'website', PROJECTS);
    assert.ok(websiteMatches.some((match) => match.project.owner_project === 'growthepie'));

    const githubMatches = findSimilarProjectMatches('github.com/uniswap', 'github', PROJECTS);
    assert.ok(githubMatches.length > 0);
    assert.ok(githubMatches.some((match) => match.project.owner_project === 'uniswap'));
  });

  test('findSimilarProjects returns top name/display-name similarity candidates', () => {
    const matches = findSimilarProjects('uniswap labs', PROJECTS);
    assert.ok(matches.length > 0);
    assert.equal(matches[0].owner_project, 'uniswap');
  });

  test('fetchProjects caches responses by default', async () => {
    resetProjectsCache();

    let fetchCount = 0;
    const fakeFetch: typeof fetch = (async () => {
      fetchCount += 1;
      return {
        async json() {
          return {
            data: {
              types: ['owner_project', 'display_name'],
              data: [['growthepie', 'Growthepie']]
            }
          };
        }
      } as unknown as Response;
    }) as typeof fetch;

    const first = await fetchProjects(fakeFetch);
    const second = await fetchProjects(fakeFetch);

    assert.equal(fetchCount, 1);
    assert.equal(first.length, 1);
    assert.deepEqual(first, second);

    resetProjectsCache();
  });
});
