import type { CollectionSchema } from "./types.js";

/**
 * Schema for diagrams collection
 * Used for storing diagrams generated for code files
 */
export const diagramsSchema: CollectionSchema = {
  description: "Collection for code diagrams with diagram elements and types",
  fields: {
    id: "schema_init",
    vector: [], // Will be filled with appropriate size
    content: "",
    filePath: "",
    description: "",
    type: "diagram",
    diagramType: "",
    diagramElements: [],
    createdAt: "",
  },
};
