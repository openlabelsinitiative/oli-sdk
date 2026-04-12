# Projects Module (`@openlabels/oli-sdk/projects`)

This module exposes frontend-parity project lookup, typo suggestions, and similarity matching logic as reusable SDK APIs.

## Exports

- Data access
  - `fetchProjects()`
  - `resolveProjectsList()`
  - `resetProjectsCache()`
- Validation/suggestions
  - `validateProjectId(value, projects)`
  - `getProjectValidation(value, projects)`
  - `getSmartProjectSuggestions(value, projects)`
- Similarity matching
  - `isProjectFieldSimilar(value1, value2, fieldType)`
  - `findSimilarProjects(value, projects)`
  - `findSimilarProjectMatches(value, fieldType, projects)`

## Example: Owner Project Validation

```ts
import { fetchProjects, validateProjectId } from '@openlabels/oli-sdk/projects';

const projects = await fetchProjects();
const result = validateProjectId('growthpie', projects);

if (!result.valid) {
  console.log(result.suggestions);      // ['growthepie', ...]
  console.log(result.similarProjects);  // display-name hints
}
```

## Example: Similarity Check For Existing Project-Like Data

```ts
import { findSimilarProjectMatches } from '@openlabels/oli-sdk/projects';

const matches = findSimilarProjectMatches('github.com/uniswap', 'github', projects);

if (matches.length > 0) {
  console.log(matches.map((m) => ({
    owner_project: m.project.owner_project,
    confidence: m.confidence
  })));
}
```

## Field Types

`findSimilarProjectMatches(..., fieldType, ...)` supports:

- `'name'`
- `'owner_project'`
- `'display_name'`
- `'github'`
- `'website'`

Use this when building project onboarding/registration forms to prevent near-duplicate entries before submission.
