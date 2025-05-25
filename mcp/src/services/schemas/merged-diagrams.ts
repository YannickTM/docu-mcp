import type { CollectionSchema } from "./types.js";

/**
 * Schema for merged diagrams collection
 * Used for storing merged/summarized diagrams from multiple sources
 */
export const mergedDiagramsSchema: CollectionSchema = {
  description:
    "Collection for merged diagrams from multiple sources with metadata tracking",
  fields: {
    id: "schema_init",
    vector: [], // Will be filled with appropriate size
    content: "",
    type: "merged-diagram",
    diagramType: "",
    diagramElements: [],
    // Metadata for tracking source documents
    sourceDiagrams: [], // Array of source diagram IDs
    sourceFiles: [], // Array of file paths covered by this merged diagram
    mergedFromCount: 0, // Number of diagrams merged
    mergeStrategy: "", // e.g., "summarize", "combine", "synthesize"
    mergeDate: "",
    // Optional metadata for hierarchical merging
    parentMergedDiagramId: "", // ID of parent merged diagram if this is a higher-level merge
    mergeLevel: 0, // 0 for first-level merges, 1 for merge of merges, etc.
    createdAt: "",
  },
};
