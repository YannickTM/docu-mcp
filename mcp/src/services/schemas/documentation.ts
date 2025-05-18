import { CollectionSchema } from "./types.js";

/**
 * Schema for documentation collection
 * Used for storing documentation generated for code files
 */
export const documentationSchema: CollectionSchema = {
  description: "Collection for code documentation with chapter structure",
  fields: {
    id: "schema_init",
    vector: [], // Will be filled with appropriate size
    content: "",
    filePath: "",
    type: "documentation",
    chapters: [],
    createdAt: "",
  },
};