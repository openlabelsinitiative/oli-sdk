import {
  DEFAULT_PROJECT_VERSION,
  PROJECT_URL_FIELDS,
  ProjectValidationIssue,
  ProjectValidationResult,
  ProjectYamlPayload,
  ValidateProjectPayloadOptions
} from './types';

const DEFAULT_SLUG_PATTERN = /^[a-z0-9-]+$/;

const DUPLICATE_URL_FIELDS = [
  'github',
  'npm',
  'crates',
  'go',
  'pypi',
  'open_collective',
  'defillama'
] as const;

function pushIssue(
  issues: ProjectValidationIssue[],
  issue: ProjectValidationIssue
): void {
  issues.push(issue);
}

function isValidUri(value: string): boolean {
  try {
    const url = new URL(value);
    return Boolean(url.protocol && url.hostname);
  } catch {
    return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractUrlStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isObject(entry)) {
        return '';
      }
      const url = entry.url;
      return typeof url === 'string' ? url.trim() : '';
    })
    .filter(Boolean);
}

function validateUrlEntryArray(
  fieldPath: string,
  value: unknown,
  issues: ProjectValidationIssue[]
): void {
  if (value == null) {
    return;
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, {
      code: 'type',
      path: fieldPath,
      message: `${fieldPath} must be an array of { url } entries.`
    });
    return;
  }

  value.forEach((entry, index) => {
    const path = `${fieldPath}[${index}]`;
    if (!isObject(entry)) {
      pushIssue(issues, {
        code: 'type',
        path,
        message: `${path} must be an object with a "url" field.`
      });
      return;
    }

    const url = entry.url;
    if (typeof url !== 'string' || !url.trim()) {
      pushIssue(issues, {
        code: 'required',
        path: `${path}.url`,
        message: `${path}.url is required.`
      });
      return;
    }

    if (!isValidUri(url.trim())) {
      pushIssue(issues, {
        code: 'format',
        path: `${path}.url`,
        message: `${path}.url must be a valid absolute URI.`
      });
    }
  });
}

function validateSocial(
  value: unknown,
  issues: ProjectValidationIssue[]
): void {
  if (value == null) {
    return;
  }

  if (!isObject(value)) {
    pushIssue(issues, {
      code: 'type',
      path: 'social',
      message: 'social must be an object keyed by platform name.'
    });
    return;
  }

  Object.entries(value).forEach(([platform, platformEntries]) => {
    validateUrlEntryArray(`social.${platform}`, platformEntries, issues);
  });
}

function validateComments(
  value: unknown,
  issues: ProjectValidationIssue[]
): void {
  if (value == null) {
    return;
  }

  if (!Array.isArray(value)) {
    pushIssue(issues, {
      code: 'type',
      path: 'comments',
      message: 'comments must be an array of strings.'
    });
    return;
  }

  value.forEach((entry, index) => {
    if (typeof entry !== 'string') {
      pushIssue(issues, {
        code: 'type',
        path: `comments[${index}]`,
        message: `comments[${index}] must be a string.`
      });
    }
  });
}

function collectDuplicateKeyMap(
  projects: ProjectYamlPayload[],
  currentProjectName: string | undefined
): Map<string, Set<string>> {
  const duplicateMap = new Map<string, Set<string>>();

  const addDuplicateKey = (key: string, projectName: string): void => {
    const current = duplicateMap.get(key);
    if (current) {
      current.add(projectName);
      return;
    }
    duplicateMap.set(key, new Set([projectName]));
  };

  projects.forEach((project) => {
    const projectName =
      typeof project.name === 'string' && project.name.trim()
        ? project.name.trim()
        : '';
    if (!projectName) {
      return;
    }
    if (currentProjectName && currentProjectName === projectName) {
      return;
    }

    if (typeof project.display_name === 'string' && project.display_name.trim()) {
      addDuplicateKey(
        `display_name:${project.display_name.trim().toLowerCase()}`,
        projectName
      );
    }

    DUPLICATE_URL_FIELDS.forEach((field) => {
      extractUrlStrings(project[field]).forEach((url) => {
        addDuplicateKey(`url:${url.toLowerCase()}`, projectName);
      });
    });

    if (!Array.isArray(project.blockchain)) {
      return;
    }
    project.blockchain.forEach((entry) => {
      if (!isObject(entry)) {
        return;
      }
      const addressValue = entry.address;
      const networksValue = entry.networks;
      if (
        typeof addressValue !== 'string' ||
        !addressValue.trim() ||
        !Array.isArray(networksValue)
      ) {
        return;
      }
      networksValue.forEach((network) => {
        if (typeof network !== 'string' || !network.trim()) {
          return;
        }
        addDuplicateKey(
          `chain:${network.toLowerCase()}:${addressValue.toLowerCase()}`,
          projectName
        );
      });
    });
  });

  return duplicateMap;
}

function collectDuplicateIssues(
  payload: ProjectYamlPayload,
  existingProjects: ProjectYamlPayload[],
  currentProjectName: string | undefined,
  issues: ProjectValidationIssue[]
): void {
  const duplicateMap = collectDuplicateKeyMap(existingProjects, currentProjectName);

  const seenDuplicateSignatures = new Set<string>();
  const maybePushDuplicate = (
    path: string,
    key: string,
    message: string
  ): void => {
    const names = duplicateMap.get(key);
    if (!names || names.size === 0) {
      return;
    }

    const signature = `${path}:${key}`;
    if (seenDuplicateSignatures.has(signature)) {
      return;
    }
    seenDuplicateSignatures.add(signature);

    pushIssue(issues, {
      code: 'duplicate',
      path,
      message: `${message} Duplicate in: ${Array.from(names).join(', ')}`
    });
  };

  if (typeof payload.display_name === 'string' && payload.display_name.trim()) {
    maybePushDuplicate(
      'display_name',
      `display_name:${payload.display_name.trim().toLowerCase()}`,
      `display_name "${payload.display_name}" is already used.`
    );
  }

  DUPLICATE_URL_FIELDS.forEach((field) => {
    extractUrlStrings(payload[field]).forEach((url, index) => {
      maybePushDuplicate(
        `${field}[${index}].url`,
        `url:${url.toLowerCase()}`,
        `URL "${url}" is already assigned to another project.`
      );
    });
  });

  if (!Array.isArray(payload.blockchain)) {
    return;
  }

  payload.blockchain.forEach((entry, index) => {
    if (!isObject(entry)) {
      return;
    }
    const addressValue = entry.address;
    const networksValue = entry.networks;
    if (
      typeof addressValue !== 'string' ||
      !addressValue.trim() ||
      !Array.isArray(networksValue)
    ) {
      return;
    }
    networksValue.forEach((network) => {
      if (typeof network !== 'string' || !network.trim()) {
        return;
      }
      maybePushDuplicate(
        `blockchain[${index}]`,
        `chain:${network.toLowerCase()}:${addressValue.toLowerCase()}`,
        `Blockchain address "${addressValue}" on "${network}" is already assigned.`
      );
    });
  });
}

export function validateProjectPayload(
  payload: ProjectYamlPayload,
  options: ValidateProjectPayloadOptions = {}
): ProjectValidationResult {
  const issues: ProjectValidationIssue[] = [];
  const enforceVersion =
    typeof options.enforceVersion === 'number'
      ? options.enforceVersion
      : DEFAULT_PROJECT_VERSION;
  const enforceSlugPattern = options.enforceSlugPattern !== false;

  if (typeof payload.version !== 'number') {
    pushIssue(issues, {
      code: 'type',
      path: 'version',
      message: 'version must be a number.'
    });
  } else if (payload.version !== enforceVersion) {
    pushIssue(issues, {
      code: 'value',
      path: 'version',
      message: `version must be ${enforceVersion}.`
    });
  }

  if (typeof payload.name !== 'string' || !payload.name.trim()) {
    pushIssue(issues, {
      code: 'required',
      path: 'name',
      message: 'name is required.'
    });
  } else if (enforceSlugPattern && !DEFAULT_SLUG_PATTERN.test(payload.name)) {
    pushIssue(issues, {
      code: 'format',
      path: 'name',
      message: 'name must contain only lowercase letters, numbers, and dashes.'
    });
  }

  if (typeof payload.display_name !== 'string' || !payload.display_name.trim()) {
    pushIssue(issues, {
      code: 'required',
      path: 'display_name',
      message: 'display_name is required.'
    });
  }

  if (
    payload.description !== undefined &&
    (typeof payload.description !== 'string' || !payload.description.trim())
  ) {
    pushIssue(issues, {
      code: 'type',
      path: 'description',
      message: 'description must be a non-empty string when provided.'
    });
  }

  PROJECT_URL_FIELDS.forEach((field) => {
    validateUrlEntryArray(field, payload[field], issues);
  });

  validateSocial(payload.social, issues);
  validateComments(payload.comments, issues);

  if (payload.blockchain !== undefined && !Array.isArray(payload.blockchain)) {
    pushIssue(issues, {
      code: 'type',
      path: 'blockchain',
      message: 'blockchain must be an array when provided.'
    });
  }

  if (
    Array.isArray(options.existingProjects) &&
    options.existingProjects.length > 0
  ) {
    collectDuplicateIssues(
      payload,
      options.existingProjects,
      options.currentProjectName,
      issues
    );
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
