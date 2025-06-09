import type { CollectionSchema } from "./types.js";

/**
 * Schema for merged documentation collection
 * Used for storing merged/summarized documentation from multiple sources
 */
export const mergedDocumentationSchema: CollectionSchema = {
  description:
    "Collection for merged documentation from multiple sources with metadata tracking",
  fields: {
    id: "schema_init",
    vector: [], // Will be filled with appropriate size
    content: "",
    type: "merged-documentation",
    chapters: [],
    // Metadata for tracking source documents
    sourceDocumentations: [], // Array of source documentation IDs
    sourceFiles: [], // Array of file paths covered by this merged documentation
    mergedFromCount: 0, // Number of documentations merged
    mergeStrategy: "", // e.g., "summarize", "combine", "synthesize"
    mergeDate: "",
    // Optional metadata for hierarchical merging
    parentMergedDocumentationId: "", // ID of parent merged documentation if this is a higher-level merge
    mergeLevel: 0, // 0 for first-level merges, 1 for merge of merges, etc.
    createdAt: "",
  },
};
