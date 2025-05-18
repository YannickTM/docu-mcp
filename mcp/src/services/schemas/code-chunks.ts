import { CollectionSchema } from "./types.js";

/**
 * Schema for code chunks collection
 * Used for storing code snippets and source code
 */
export const codeChunksSchema: CollectionSchema = {
  description: "Collection for code snippets and source code chunks with metadata",
  fields: {
    id: "schema_init",
    vector: [], // Will be filled with appropriate size
    content: "",
    filePath: "",
    fileName: "",
    fileNameId: "",
    fileType: "",
    chunkIndex: 0,
    language: "",
    startPosition: 0,
    filename: "",
    extension: "",
    directory: "",
    size: 0,
    created: "",
    modified: "",
    accessed: "",
  },
};