---
sidebar_position: 8
---

# Search Codebase

The `search_codebase` tool searches the indexed codebase for code snippets using semantic search powered by vector embeddings.

## Overview

This tool provides capabilities to:
- Search code using semantic similarity instead of just exact text matches
- Filter results by file extension, directory, or filename
- Control the number of results returned
- Return relevant code snippets with context and location information
- Rank results by similarity score

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| query | string | Yes | - | Natural language or code query to search for |
| limit | number | No | 10 | Maximum number of results to return |
| extension | string or string[] | No | - | Filter results by file extension or array of extensions (e.g., ".js", ".ts") |
| directory | string | No | - | Filter results by directory path |
| filename | string | No | - | Filter results by filename |

## Response

The tool returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| query | string | The original search query |
| totalResults | number | Total number of matching results found |
| results | array | Array of search result objects |

### Search Result Object

Each result in the results array contains:

| Property | Type | Description |
|----------|------|-------------|
| content | string | The content of the matched chunk |
| similarity | number | Relevance score (0-1) indicating match quality |
| filePath | string | Absolute path to the file containing the match |
| filename | string | Name of the file containing the match |
| extension | string | File extension of the matched file |
| location | string | File path with position information where applicable |

## Example

**Request**:
```json
{
  "name": "search_codebase",
  "arguments": {
    "query": "authentication implementation",
    "limit": 5,
    "extension": [".ts", ".js"],
    "directory": "src/services"
  }
}
```

**Response**:
```json
{
  "query": "authentication implementation",
  "totalResults": 2,
  "results": [
    {
      "content": "export async function authenticateUser(credentials: UserCredentials) {\n  // Implementation of user authentication\n  const user = await findUserByEmail(credentials.email);\n  return validatePassword(user, credentials.password);\n}",
      "similarity": 0.9543,
      "filePath": "/absolute/path/to/src/services/auth/authenticate.ts",
      "filename": "authenticate.ts",
      "extension": ".ts",
      "location": "/absolute/path/to/src/services/auth/authenticate.ts:23"
    },
    {
      "content": "export const validateToken = (token: string): boolean => {\n  // Implementation of token validation\n  try {\n    // ...\n  } catch (error) {\n    return false;\n  }\n}",
      "similarity": 0.8731,
      "filePath": "/absolute/path/to/src/services/auth/token.ts",
      "filename": "token.ts",
      "extension": ".ts", 
      "location": "/absolute/path/to/src/services/auth/token.ts:15"
    }
  ]
}
```

## How It Works

### Semantic Search

This tool uses semantic search with vector embeddings to find results based on meaning, not just text matches:

1. Your search query is converted into an embedding vector using the same model used for indexing
2. The vector database finds the closest matches to your query by calculating similarity between vectors
3. Results are ranked by their similarity score (higher is better)
4. Metadata and snippets from the matching chunks are returned in the results

Benefits of semantic search:
- Find conceptually related code even with different terminology
- Use natural language questions as search queries
- Discover connections across the codebase based on semantic meaning
- Get results ranked by relevance

### Filtering Capabilities

The search can be refined using these filters:

- **Extension filtering**: Limit results to specific file types (e.g., only TypeScript files)
- **Directory filtering**: Search only within a specific directory path
- **Filename filtering**: Search only within files with specific names
- **Collection selection**: Search in specific vector database collections (e.g., separate collections for frontend and backend code)

## Implementation Details

The tool works with the existing vector database infrastructure:

- Supports multiple vector database backends (LanceDB, ChromaDB, Qdrant)
- Uses the same embedding provider configured for the system
- Searches in the "codebase" collection created with the `index_file` and `index_directory` tools
- Applies filters using the vector database's native filtering capabilities
- Handles errors gracefully, including missing collections

Key implementation files:
- Main implementation in `/mcp/src/tools/SearchCodebaseTool.ts` 
- Uses embedding service from `/mcp/src/services/embeddings.ts`
- Leverages vector database abstraction in `/mcp/src/services/vectordb.ts`
- Database-specific implementations in `/mcp/src/services/endpoints/`

## Configuration

The tool uses these environment variables from the main configuration:

- `VECTOR_DB_PROVIDER`: Determines which vector database to search (default: 'lance')
- `EMBEDDING_PROVIDER`: Controls how query embeddings are generated (default: 'buildin')
- `EMBEDDING_MODEL`: Specifies the model to use for embedding generation

## Related Tools

- [Index File](./index-file.md) - For indexing individual files for search
- [Index Directory](./index-directory.md) - For indexing entire directories for search
- [Search Documentation](./search-documentation.md) - For searching generated documentation