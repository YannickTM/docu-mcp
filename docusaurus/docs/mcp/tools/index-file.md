---
sidebar_position: 6
---

# Index File

The `index_file` tool indexes a file's content into the vector database to enable semantic search capabilities.

## Overview

This tool provides capabilities to:
- Index file contents for semantic search and RAG operations
- Chunk content with customizable size and overlap
- Automatically generate embeddings using the configured provider
- Store embeddings with rich metadata in your selected vector database (LanceDB, ChromaDB, or Qdrant)
- Support for multiple vector database backends

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| filePath | string | Yes | - | Path to the file to be indexed (absolute or relative to the project root) |
| chunkSize | number | No | 512 | Size of each chunk in characters |
| chunkOverlap | number | No | 50 | Number of characters to overlap between adjacent chunks |
| collectionName | string | No | "codebase" | Name of the vector database collection to store embeddings |

## Response

The tool returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| success | boolean | Indicates if the operation was successful |
| filePath | string | The absolute path to the indexed file |
| fileType | string | The file extension/type |
| totalChunks | number | Number of chunks the file was split into |
| embeddingsGenerated | number | Number of embeddings successfully generated |
| embeddingErrors | number | Number of errors during embedding generation |
| embeddingDimension | number | Dimension of the generated embeddings |
| storedInDatabase | boolean | Whether embeddings were successfully stored in the vector database |
| collectionName | string | Vector database collection name where embeddings were stored |
| metadata | object | File metadata including size, creation date, etc. |
| sizeInBytes | number | Size of the file in bytes |
| message | string | A descriptive message about the operation |

## Example Usage

**Request**:
```json
{
  "name": "index_file",
  "arguments": {
    "filePath": "src/components/Button.tsx",
    "chunkSize": 256,
    "chunkOverlap": 25,
    "collectionName": "ui-components"
  }
}
```

**Response**:
```json
{
  "success": true,
  "filePath": "/absolute/path/to/src/components/Button.tsx",
  "fileType": "tsx",
  "totalChunks": 3,
  "embeddingsGenerated": 3,
  "embeddingErrors": 0,
  "embeddingDimension": 384,
  "storedInDatabase": true,
  "collectionName": "ui-components",
  "metadata": {
    "size": 1254,
    "created": "2023-06-15T14:23:45.123Z",
    "modified": "2023-06-15T14:23:45.123Z",
    "accessed": "2023-06-15T16:45:12.345Z",
    "extension": ".tsx",
    "filename": "Button.tsx",
    "directory": "/absolute/path/to/src/components"
  },
  "sizeInBytes": 1254,
  "message": "File indexed successfully with 256 chunk size and 25 overlap"
}
```

## Chunking Strategy

The tool applies an overlapping window approach to divide content into chunks:

- Files are divided into chunks of the specified size (default: 512 characters)
- Adjacent chunks overlap by the specified amount (default: 50 characters) to maintain context
- Empty or whitespace-only chunks are filtered out
- Each chunk is processed individually for embedding generation

## Implementation Details

The implementation:

1. Accepts a file path and validates the file's existence
2. Reads the file content and extracts metadata
3. Chunks the content using the overlapping window approach
4. Generates embeddings for each chunk using the configured embedding provider
5. Stores the embeddings and rich metadata in the selected vector database for later retrieval

The tool includes these key features:

- **Vector Database Abstraction**: Works with multiple vector database providers (LanceDB, ChromaDB, Qdrant)
- **Rich Metadata**: Preserves file metadata for better retrieval context
- **Error Handling**: Gracefully handles missing files, embedding errors, and other exceptions
- **Configurable Chunking**: Allows customization of chunk size and overlap for optimal retrieval

## Configuration

The tool uses environment variables to control the vector database and embedding configuration:

- `VECTOR_DB_PROVIDER`: 'lance', 'chroma', or 'qdrant' (default: 'lance')
- `EMBEDDING_PROVIDER`: 'buildin' or 'ollama' (default: 'buildin')
- `EMBEDDING_MODEL`: Model name for embedding generation (default varies by provider)
- `EMBEDDING_DIMENSION`: Expected dimension of embeddings (auto-detected if not specified)

## Technical Implementation

This tool is fully implemented in TypeScript:

- Main implementation in `/mcp/src/tools/IndexFileTool.ts`
- Embedding generation in `/mcp/src/services/embeddings.ts`
- Vector database integration in `/mcp/src/services/vectordb.ts`
- Database-specific implementations in `/mcp/src/services/endpoints/`

The implementation handles errors gracefully, providing detailed feedback on any issues encountered during the indexing process.

## Related Tools

- [Index Directory](./index-directory.md) - For recursively indexing all files in a directory
- [Search Codebase](./search-codebase.md) - For searching indexed content using semantic search
- [Read File](./read-file.md) - For reading file content