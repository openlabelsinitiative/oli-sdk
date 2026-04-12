/**
 * Main OLI Client class
 */

import { DataFetcher } from './fetcher';
import { DEFAULT_API_CONFIG } from './types/common';
import type { OLIConfig, LabelDisplayConfig, LabelFilterConfig, ResolvedAPIConfig, APIConfig } from './types/common';
import type { TagDefinitions, ValueSets } from './types/tags';
import type { IOLIClient } from './types/client';
import * as helpers from './helpers';
import { RestClient } from './rest';
import { AttestClient } from './attest';

/**
 * Main OLI SDK Client
 * 
 * @template TCustomTags - Optional interface to define custom tag types for improved type safety
 * 
 * @example
 * ```typescript
 * // Without custom tags (uses default types)
 * const oli = new OLIClient();
 * 
 * // With custom tags for type safety
 * interface MyProjectTags {
 *   my_custom_field: string;
 *   my_numeric_field: number;
 * }
 * 
 * const oli = new OLIClient<MyProjectTags>();
 * ```
 */
export class OLIClient<TCustomTags extends Record<string, unknown> = Record<string, unknown>> implements IOLIClient {
  
  /** Tag definitions (loaded dynamically from GitHub) */
  public tagDefinitions: TagDefinitions = {};
  
  /** Value sets for tags (loaded dynamically) */
  public valueSets: ValueSets = {};
  
  /** Display configuration */
  public readonly displayConfig: LabelDisplayConfig;
  
  /** Filter configuration */
  public readonly filterConfig: LabelFilterConfig;
  
  /** REST API configuration */
  public readonly apiConfig: ResolvedAPIConfig;

  /** Helper utilities */
  public readonly helpers = helpers;

  /** Data fetcher instance */
  public readonly fetcher: DataFetcher;
  
  /** REST client instance (primary API surface) */
  public readonly api: RestClient<TCustomTags>;
  public readonly rest: RestClient<TCustomTags>;
  public readonly attest: AttestClient;
  
  /** Initialization state */
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Create a new OLI client instance
   * 
   * @param config - Configuration options
   * 
   * @example
   * ```typescript
   * // Use default network (Base)
   * const oli = new OLIClient();
   * await oli.init();
   */
  constructor(config: OLIConfig = {}) {
    // Store configurations
    this.displayConfig = config.display || {
      nameFields: ['contract_name', 'address_name', 'erc20.name', 'name'],
      addressFormat: 'short',
      dateFormat: 'relative',
      showRevoked: false
    };
    this.filterConfig = config.filters || {};
    this.apiConfig = this.resolveApiConfig(config.api);

    // Initialize sub-modules
    this.fetcher = new DataFetcher(this);
    this.api = new RestClient<TCustomTags>(this);
    this.rest = this.api;
    this.attest = new AttestClient();
  }

  /**
   * Initialize the client by loading tag definitions and value sets.
   * This must be called before using the client.
   * 
   * @returns Promise that resolves when initialization is complete
   * 
   * @example
   * ```typescript
   * const oli = new OLIClient();
   * await oli.init();
   * console.log('OLI client ready!');
   * ```
   */
  async init(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._performInit();
    await this.initPromise;
    this.initPromise = null;
  }

  /**
   * Internal initialization logic
   */
  private async _performInit(): Promise<void> {
    try {
      // Load tag definitions
      this.tagDefinitions = await this.fetcher.getOLITags();
      
      // Load value sets
      this.valueSets = await this.fetcher.getOLIValueSets();
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize OLI client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Refresh tag definitions and value sets from GitHub.
   * Use this to get the latest definitions without creating a new client.
   * 
   * @example
   * ```typescript
   * await oli.refresh();
   * console.log('Tag definitions refreshed!');
   * ```
   */
  async refresh(): Promise<void> {
    this.tagDefinitions = await this.fetcher.getOLITags();
    this.valueSets = await this.fetcher.getOLIValueSets();
  }

  /**
   * Check if the client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure the client is initialized, throw error if not
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('OLI client not initialized. Call await oli.init() first.');
    }
  }

  /**
   * Get a specific tag definition by tag_id
   * 
   * @param tagId - The tag_id to retrieve
   * @returns Tag definition or undefined if not found
   */
  getTag(tagId: string): TagDefinitions[string] | undefined {
    this.ensureInitialized();
    return this.tagDefinitions[tagId];
  }

  /**
   * Get all available tag IDs
   * 
   * @returns Array of tag IDs
   */
  getTagIds(): string[] {
    this.ensureInitialized();
    return Object.keys(this.tagDefinitions);
  }

  /**
   * Get valid values for a specific tag
   * 
   * @param tagId - The tag_id to get values for
   * @returns Array of valid values or undefined if tag has no value set
   */
  getValidValues(tagId: string): any[] | undefined {
    this.ensureInitialized();
    return this.valueSets[tagId];
  }

  /**
   * Validate a value for a specific tag
   * 
   * @param tagId - The tag_id to validate against
   * @param value - The value to validate
   * @returns True if valid or tag has no restrictions
   */
  validateValue(tagId: string, value: any): boolean {
    this.ensureInitialized();
    return this.fetcher.isValidValue(tagId, value);
  }

  /**
   * Resolve REST API configuration with default values.
   */
  private resolveApiConfig(apiConfig?: APIConfig): ResolvedAPIConfig {
    return {
      baseUrl: apiConfig?.baseUrl ?? DEFAULT_API_CONFIG.baseUrl,
      apiKey: apiConfig?.apiKey ?? DEFAULT_API_CONFIG.apiKey,
      defaultHeaders: {
        ...DEFAULT_API_CONFIG.defaultHeaders,
        ...(apiConfig?.defaultHeaders ?? {})
      },
      timeoutMs: apiConfig?.timeoutMs ?? DEFAULT_API_CONFIG.timeoutMs,
      retries: apiConfig?.retries ?? DEFAULT_API_CONFIG.retries,
      enableDeduplication: apiConfig?.enableDeduplication ?? DEFAULT_API_CONFIG.enableDeduplication,
      enableCache: apiConfig?.enableCache ?? DEFAULT_API_CONFIG.enableCache,
      cacheTtl: apiConfig?.cacheTtl ?? DEFAULT_API_CONFIG.cacheTtl,
      staleWhileRevalidate: apiConfig?.staleWhileRevalidate ?? DEFAULT_API_CONFIG.staleWhileRevalidate
    };
  }
}
