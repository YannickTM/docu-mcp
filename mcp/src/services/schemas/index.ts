/**
 * Collection schema definitions for vector databases
 *
 * This module centralizes all schema definitions for different collection types
 * to ensure consistent structure across vector database implementations.
 */

// Export schema types
export * from "./types.js";

// Import individual schemas
import { codeChunksSchema } from "./code-chunks.js";
import { documentationSchema } from "./documentation.js";
import { diagramsSchema } from "./diagrams.js";
import { mergedDocumentationSchema } from "./merged-documentation.js";
import { mergedDiagramsSchema } from "./merged-diagrams.js";
import type { CollectionSchemaMap } from "./types.js";

/**
 * All available collection schemas mapped by collection name
 */
export const collectionSchemas: CollectionSchemaMap = {
  code_chunks: codeChunksSchema,
  documentation: documentationSchema,
  diagrams: diagramsSchema,
  merged_documentation: mergedDocumentationSchema,
  merged_diagrams: mergedDiagramsSchema,
};

/**
 * Get a schema for a specific collection
 * @param collectionName The name of the collection
 * @returns The schema for the collection or the default code_chunks schema if not found
 */
export function getCollectionSchema(
  collectionName: string,
): CollectionSchemaMap[string] {
  return collectionSchemas[collectionName] || collectionSchemas.code_chunks;
}

// Export individual schemas
export {
  codeChunksSchema,
  documentationSchema,
  diagramsSchema,
  mergedDocumentationSchema,
  mergedDiagramsSchema,
};
