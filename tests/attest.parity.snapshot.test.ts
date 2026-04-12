import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OLIClient } from '../src';

const PROJECTS = [
  { owner_project: 'growthepie', display_name: 'Growthepie' },
  { owner_project: 'uniswap', display_name: 'Uniswap' }
];

function simplifyDiagnostics(result: Awaited<ReturnType<OLIClient['attest']['parseCsv']>>) {
  const serialize = (entries: typeof result.diagnostics.errors) =>
    entries
      .map((entry) => ({
        code: entry.code,
        row: entry.row,
        field: entry.field,
        suggestion: entry.suggestion,
        suggestions: entry.suggestions
      }))
      .sort((a, b) => {
        const keyA = `${a.code}:${a.row ?? -1}:${a.field ?? ''}`;
        const keyB = `${b.code}:${b.row ?? -1}:${b.field ?? ''}`;
        return keyA.localeCompare(keyB);
      });

  return {
    errors: serialize(result.diagnostics.errors),
    warnings: serialize(result.diagnostics.warnings),
    conversions: serialize(result.diagnostics.conversions),
    suggestions: serialize(result.diagnostics.suggestions)
  };
}

test('csv parity snapshot: frontend-like normalization/corrections', async () => {
  const oli = new OLIClient();

  const csv = [
    'origin_key,address,usage_category,paymaster_category,owner_project',
    'mainnet,eip155:1:0x1234567890123456789012345678901234567890,defi,verify,growthpie',
    '1,0xabcdefabcdefabcdefabcdefabcdefabcdefabcd,brdge,tokn,uniswap'
  ].join('\n');

  const parsed = await oli.attest.parseCsv(csv, {
    mode: 'advancedProfile',
    projects: PROJECTS
  });

  const snapshot = {
    rows: parsed.rows,
    diagnostics: simplifyDiagnostics(parsed)
  };

  assert.deepEqual(snapshot, {
    rows: [
      {
        address: '0x1234567890123456789012345678901234567890',
        chain_id: 'eip155:1',
        owner_project: 'growthpie',
        paymaster_category: 'verifying',
        usage_category: 'dex'
      },
      {
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        chain_id: 'eip155:1',
        owner_project: 'uniswap',
        paymaster_category: 'tokn',
        usage_category: 'brdge'
      }
    ],
    diagnostics: {
      errors: [
        {
          code: 'PROJECT_INVALID',
          row: 0,
          field: 'owner_project',
          suggestion: undefined,
          suggestions: ['growthepie']
        }
      ],
      warnings: [],
      conversions: [
        {
          code: 'CATEGORY_ALIAS_CONVERTED',
          row: 0,
          field: 'usage_category',
          suggestion: undefined,
          suggestions: undefined
        },
        {
          code: 'CHAIN_NORMALIZED',
          row: 0,
          field: 'chain_id',
          suggestion: undefined,
          suggestions: undefined
        },
        {
          code: 'CHAIN_NORMALIZED',
          row: 1,
          field: 'chain_id',
          suggestion: undefined,
          suggestions: undefined
        },
        {
          code: 'PAYMASTER_ALIAS_CONVERTED',
          row: 0,
          field: 'paymaster_category',
          suggestion: undefined,
          suggestions: undefined
        }
      ],
      suggestions: [
        {
          code: 'CATEGORY_SUGGESTIONS',
          row: 1,
          field: 'usage_category',
          suggestion: undefined,
          suggestions: ['bridge']
        },
        {
          code: 'PAYMASTER_SUGGESTIONS',
          row: 1,
          field: 'paymaster_category',
          suggestion: undefined,
          suggestions: ['token']
        },
        {
          code: 'PROJECT_SUGGESTIONS',
          row: 0,
          field: 'owner_project',
          suggestion: undefined,
          suggestions: ['growthepie']
        }
      ]
    }
  });
});
