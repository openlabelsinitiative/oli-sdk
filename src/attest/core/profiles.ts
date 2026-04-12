import type { AttestationMode, AttestationModeProfile, AttestationModeProfileName } from '../types';
import { FORM_FIELDS } from './formFields';

const simpleAllowed = new Set(
  FORM_FIELDS.filter((field) => field.visibility === 'simple' || field.visibility === 'both').map((field) => field.id)
);

// Bulk form includes is_contract in its base columns, even for simple workflows.
simpleAllowed.add('is_contract');

export const simpleProfile: AttestationModeProfile = {
  id: 'simpleProfile',
  label: 'Simple Profile',
  allowedFields: Array.from(simpleAllowed),
  requiresFields: ['chain_id', 'address']
};

export const advancedProfile: AttestationModeProfile = {
  id: 'advancedProfile',
  label: 'Advanced Profile',
  allowedFields: FORM_FIELDS.map((field) => field.id),
  requiresFields: ['chain_id', 'address']
};

export function resolveModeProfile(mode?: AttestationMode): AttestationModeProfile {
  if (!mode) {
    return simpleProfile;
  }

  if (typeof mode !== 'string') {
    return mode;
  }

  const normalized = mode as AttestationModeProfileName;
  switch (normalized) {
    case 'advancedProfile':
      return advancedProfile;
    case 'simpleProfile':
    default:
      return simpleProfile;
  }
}
