export type FormFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'radio' | 'custom';
export type FormFieldVisibility = 'simple' | 'advanced' | 'both';

export interface FormFieldDefinition {
  id: string;
  label: string;
  type: FormFieldType;
  visibility: FormFieldVisibility;
  required?: boolean;
}

export const FORM_FIELDS: FormFieldDefinition[] = [
  { id: 'chain_id', label: 'Chain', type: 'select', visibility: 'simple', required: true },
  { id: 'address', label: 'Address', type: 'text', visibility: 'simple', required: true },
  { id: 'contract_name', label: 'Contract Name', type: 'text', visibility: 'simple' },
  { id: 'owner_project', label: 'Owner Project', type: 'custom', visibility: 'simple' },
  { id: 'usage_category', label: 'Usage Category', type: 'custom', visibility: 'simple' },
  { id: 'version', label: 'Version', type: 'number', visibility: 'advanced' },
  { id: 'is_contract', label: 'Is Contract', type: 'radio', visibility: 'advanced' },
  { id: 'is_factory_contract', label: 'Is Factory Contract', type: 'radio', visibility: 'advanced' },
  { id: 'is_proxy', label: 'Is Proxy', type: 'radio', visibility: 'advanced' },
  { id: 'is_eoa', label: 'Is EOA', type: 'radio', visibility: 'advanced' },
  { id: 'deployment_tx', label: 'Deployment Transaction', type: 'text', visibility: 'advanced' },
  { id: 'deployer_address', label: 'Deployer Address', type: 'text', visibility: 'advanced' },
  { id: 'deployment_date', label: 'Deployment Date', type: 'date', visibility: 'advanced' },
  { id: 'deployment_block', label: 'Deployment Block', type: 'number', visibility: 'advanced' },
  { id: 'is_safe_contract', label: 'Is Multisig', type: 'radio', visibility: 'advanced' },
  { id: 'erc_type', label: 'ERC Type', type: 'multiselect', visibility: 'advanced' },
  { id: 'erc20.name', label: 'ERC20 Name', type: 'text', visibility: 'advanced' },
  { id: 'erc20.symbol', label: 'ERC20 Symbol', type: 'text', visibility: 'advanced' },
  { id: 'erc20.decimals', label: 'ERC20 Decimals', type: 'number', visibility: 'advanced' },
  { id: 'erc721.name', label: 'ERC721 Name', type: 'text', visibility: 'advanced' },
  { id: 'erc721.symbol', label: 'ERC721 Symbol', type: 'text', visibility: 'advanced' },
  { id: 'erc1155.name', label: 'ERC1155 Name', type: 'text', visibility: 'advanced' },
  { id: 'erc1155.symbol', label: 'ERC1155 Symbol', type: 'text', visibility: 'advanced' },
  { id: 'audit', label: 'Audit', type: 'text', visibility: 'advanced' },
  { id: 'contract_monitored', label: 'Smart Contract Monitoring', type: 'text', visibility: 'advanced' },
  { id: 'source_code_verified', label: 'Verified Source Code', type: 'select', visibility: 'advanced' },
  { id: 'code_language', label: 'Programming Language', type: 'select', visibility: 'advanced' },
  { id: 'code_compiler', label: 'Compiler', type: 'text', visibility: 'advanced' },
  { id: 'paymaster_category', label: 'Paymaster Category', type: 'select', visibility: 'advanced' },
  { id: 'is_bundler', label: 'Is Bundler', type: 'radio', visibility: 'advanced' },
  { id: 'is_paymaster', label: 'Is Paymaster', type: 'radio', visibility: 'advanced' },
  { id: 'etf_ticker', label: 'ETF Ticker', type: 'text', visibility: 'advanced' },
  { id: 'track_outflow', label: 'ETF Track Outflow', type: 'radio', visibility: 'advanced' },
  { id: 'is_blacklist.usdc', label: 'USDC Blacklist', type: 'radio', visibility: 'advanced' },
  { id: 'is_blacklist.usdt', label: 'USDT Blacklist', type: 'radio', visibility: 'advanced' },
  { id: '_comment', label: 'Comment', type: 'text', visibility: 'simple' },
  { id: '_source', label: 'Source', type: 'text', visibility: 'simple' }
];

export const REQUIRED_FIELD_IDS = FORM_FIELDS.filter((field) => field.required).map((field) => field.id);
