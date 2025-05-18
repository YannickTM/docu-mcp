---
sidebar_position: 7
---

# Index Directory

The `index_directory` tool recursively indexes all files in a directory into the vector database for semantic search capabilities.

## Overview

This tool provides capabilities to:
- Recursively index all files in a directory structure
- Filter files by extension
- Control inclusion of hidden files
- Chunk content with customizable parameters
- Generate embeddings using the configured provider
- Store documents in your selected vector database (LanceDB, ChromaDB, or Qdrant)
- Track progress and detailed results of the indexing process

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| dirPath | string | Yes | - | Path to the directory to be indexed (absolute or relative to the project root) |
| recursive | boolean | No | true | Whether to recursively index subdirectories |
| fileExtensions | string[] | No | - | List of file extensions to include (e.g., [".js", ".ts", ".md"]). If not provided, all files will be indexed. |
| includeHidden | boolean | No | false | Whether to include hidden files and directories |
| chunkSize | number | No | 512 | Size of each chunk in characters |
| chunkOverlap | number | No | 50 | Number of characters to overlap between adjacent chunks |
| collectionName | string | No | "codebase" | Name of the vector database collection to store embeddings |

## Response

The tool returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| success | boolean | Indicates if the operation was successful |
| dirPath | string | The absolute path to the indexed directory |
| recursive | boolean | Whether subdirectories were recursively indexed |
| processedFiles | number | Number of files processed |
| totalChunks | number | Total number of chunks created across all files |
| totalEmbeddingsGenerated | number | Number of embeddings successfully generated |
| totalErrors | number | Number of errors encountered during processing |
| fileResults | array | Detailed results for each processed file (limited to 10 files for large directories) |
| embeddingDimension | number | Dimension of the generated embeddings |
| filteredExtensions | string[] or "all" | The file extensions that were indexed |
| collectionName | string | The vector database collection where embeddings were stored |
| includeHidden | boolean | Whether hidden files were included |
| message | string | A descriptive message about the operation |

## Example Usage

**Request**:
```json
{
  "name": "index_directory",
  "arguments": {
    "dirPath": "src/components",
    "recursive": true,
    "fileExtensions": [".tsx", ".jsx", ".md"],
    "includeHidden": false,
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
  "dirPath": "/absolute/path/to/src/components",
  "recursive": true,
  "processedFiles": 15,
  "totalChunks": 42,
  "totalEmbeddingsGenerated": 42,
  "totalErrors": 0,
  "fileResults": [
    {
      "filePath": "/absolute/path/to/src/components/Button.tsx",
      "totalChunks": 3,
      "embeddingsGenerated": 3,
      "embeddingErrors": 0,
      "storedInDatabase": true,
      "sizeInBytes": 1254
    },
    "... additional file results ..."
  ],
  "embeddingDimension": 384,
  "filteredExtensions": [".tsx", ".jsx", ".md"],
  "collectionName": "ui-components",
  "includeHidden": false,
  "message": "Directory indexed successfully: 15 files with 42 chunks and 42 embeddings"
}
```

## Processing Workflow

The tool implements a comprehensive file processing workflow:

1. **Directory Traversal**:
   - Recursively walks the directory structure (if specified)
   - Filters files based on extensions if provided
   - Respects the hidden file inclusion setting

2. **File Processing**:
   - Reads each file's content and metadata
   - Applies the chunking strategy with configurable size and overlap
   - Handles empty files or whitespace-only content

3. **Embedding Generation**:
   - Generates embeddings for each chunk using the configured provider
   - Tracks successful embedding generation and handles errors
   - Creates rich metadata for each embedding point

4. **Vector Database Storage**:
   - Ensures the specified collection exists, creating it if needed
   - Stores embeddings with complete metadata for optimal retrieval
   - Works with the configured vector database (LanceDB, ChromaDB, or Qdrant)

## Chunking Strategy

The tool applies the same overlapping window approach as the IndexFileTool:

- Files are divided into chunks of the specified size (default: 512 characters)
- Adjacent chunks overlap by the specified amount (default: 50 characters)
- Empty or whitespace-only chunks are filtered out
- Each chunk is processed individually for embedding generation

## Implementation Details

The tool is implemented in TypeScript with several key features:

- **Efficient Directory Traversal**: Uses the filesystem service for recursive directory reading
- **Parallel Processing**: Handles multiple files efficiently with error isolation
- **Rich Metadata**: Preserves file paths, types, and directory structure in metadata
- **Vector Database Abstraction**: Works with multiple vector database providers
- **Result Summarization**: For large directories, summarizes results to prevent excessive output

### Technical Implementation

```typescript
// Core indexing function
async indexDirectory(
  dirPath: string,
  recursive: boolean = true,
  fileExtensions?: string[],
  includeHidden: boolean = false,
  chunkSize: number = 512,
  chunkOverlap: number = 50,
  collectionName: string = "codebase"
) {
  // Get all files in the directory
  const readResult = await filesystem.readDirectory(absolutePath, {
    recursive,
    includeHidden,
    extensions: fileExtensions || [],
  });
  
  // Filter to only include files (not directories)
  const files = readResult.data!.entries
    .filter((entry) => entry.type === "file")
    .map((entry) => path.join(absolutePath, entry.path));
    
  // Ensure collection exists
  if (!(await collectionExists(collectionName))) {
    await createCollection(collectionName, embeddingDimension);
  }
  
  // Process each file
  for (const filePath of files) {
    const result = await this.processFile(
      filePath,
      collectionName,
      chunkSize,
      chunkOverlap
    );
    
    // Track statistics
    fileResults.push(result);
    if (result.totalChunks) totalChunks += result.totalChunks;
    if (result.embeddingsGenerated) totalEmbeddingsGenerated += result.embeddingsGenerated;
    if (result.embeddingErrors) totalErrors += result.embeddingErrors;
  }
  
  // Return comprehensive result
  return {
    success: true,
    dirPath: absolutePath,
    recursive,
    processedFiles: files.length,
    totalChunks,
    totalEmbeddingsGenerated,
    // ...additional result data
  };
}
```

## Configuration

The tool uses environment variables to control the vector database and embedding configuration:

- `VECTOR_DB_PROVIDER`: 'lance', 'chroma', or 'qdrant' (default: 'lance')
- `EMBEDDING_PROVIDER`: 'buildin' or 'ollama' (default: 'buildin')
- `EMBEDDING_MODEL`: Model name for embedding generation
- `EMBEDDING_DIMENSION`: Expected dimension of embeddings

## Error Handling

The tool handles common errors gracefully:

- Directory not found - Returns an error if the directory doesn't exist
- Path not a directory - Returns an error if the path is not a directory
- Permission issues - Returns an error if files can't be accessed
- Empty directory - Returns successfully but with zero processed files
- Embedding errors - Continues processing other chunks/files and reports error count

## Related Tools

- [Index File](./index-file.md) - For indexing individual files
- [Search Codebase](./search-codebase.md) - For searching the indexed content
- [Read Directory](./read-directory.md) - For listing directory contents