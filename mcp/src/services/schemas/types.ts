/**
 * Common schema interfaces and types
 */

/**
 * Collection schema definition for vector databases
 * Used to ensure consistent schemas across different collections
 */
export interface CollectionSchema {
  /** Schema fields with default values */
  fields: Record<string, any>;
  /** Optional description of what this collection contains */
  description?: string;
}

/**
 * Collection schema mapping type
 */
export type CollectionSchemaMap = Record<string, CollectionSchema>;