---
sidebar_position: 16
---

# Search Documentation

The `search_documentation` tool enables semantic search for previously generated documentation stored in the vector database.

## Overview

This tool provides capabilities to:

- Search for documentation using natural language queries
- Find documentation related to concepts, not just exact keyword matches
- Filter results by directory, filename, section, or tags
- Return ranked results by similarity scores
- Retrieve documentation content along with metadata and location information
- Search across both individual documentation and merged documentation collections

## Vector Database Integration

The `search_documentation` tool leverages the vector database to enable semantic search across stored documentation:

1. When documentation is generated using the `generate_documentation` tool, it is stored in the vector database
2. Embeddings are created for the documentation content to enable semantic search
3. Metadata such as file path, section, and tags are stored alongside the content
4. The tool searches both "documentation" and "merged_documentation" collections automatically

## Parameters

| Name      | Type               | Required | Default | Description                          |
| --------- | ------------------ | -------- | ------- | ------------------------------------ |
| query     | string             | Yes      | -       | Natural language query to search for |
| limit     | number             | No       | 10      | Maximum number of results to return  |
| directory | string             | No       | -       | Filter by directory path             |
| filename  | string             | No       | -       | Filter by filename                   |
| section   | string             | No       | -       | Filter by document section           |
| tags      | string or string[] | No       | -       | Filter by associated tags            |

## Response

The tool returns an object with the following properties:

| Property     | Type   | Description                                  |
| ------------ | ------ | -------------------------------------------- |
| query        | string | The original search query                    |
| totalResults | number | Total number of documentation segments found |
| results      | array  | Array of documentation search results        |

Each result in the array contains:

| Property   | Type     | Description                                            |
| ---------- | -------- | ------------------------------------------------------ |
| content    | string   | The documentation content                              |
| similarity | number   | Similarity score between query and documentation (0-1) |
| filePath   | string   | Path to the file the documentation was generated from  |
| filename   | string   | Name of the file                                       |
| extension  | string   | File extension                                         |
| location   | string   | Location information including position if available   |
| title      | string   | Title of the documentation section if available        |
| section    | string   | Section name within the document                       |
| tags       | string[] | Associated tags for categorization                     |

## Example

**Request**:

```json
{
  "name": "search_documentation",
  "arguments": {
    "query": "vector database configuration",
    "limit": 5,
    "section": "configuration"
  }
}
```

**Response**:

```json
{
  "query": "vector database configuration",
  "totalResults": 2,
  "results": [
    {
      "content": "## Vector Database Configuration\n\nThe system supports multiple vector database backends including ChromaDB, LanceDB, and Qdrant. Each requires specific configuration steps outlined below...",
      "similarity": 0.8932,
      "filePath": "/docs/configuration/vector-databases.md",
      "filename": "vector-databases.md",
      "extension": ".md",
      "location": "/docs/configuration/vector-databases.md",
      "title": "Vector Database Configuration",
      "section": "configuration",
      "tags": ["setup", "vector-db", "configuration"]
    },
    {
      "content": "### Setting up Qdrant\n\nQdrant requires Docker to be installed on your system. The following steps will guide you through setting up Qdrant as your vector database...",
      "similarity": 0.7845,
      "filePath": "/docs/configuration/qdrant-setup.md",
      "filename": "qdrant-setup.md",
      "extension": ".md",
      "location": "/docs/configuration/qdrant-setup.md",
      "title": "Qdrant Setup Guide",
      "section": "configuration",
      "tags": ["setup", "qdrant", "docker"]
    }
  ]
}
```

## Search Filters

The `search_documentation` tool supports several filtering options to narrow your search:

### Filtering by Section

You can filter results to include only documentation from a specific section:

```json
{
  "name": "search_documentation",
  "arguments": {
    "query": "vector embedding",
    "section": "configuration"
  }
}
```

### Filtering by Tags

You can filter results to include only documentation with specific tags:

```json
{
  "name": "search_documentation",
  "arguments": {
    "query": "setup steps",
    "tags": ["installation", "setup"]
  }
}
```

### Combining Filters

You can combine multiple filters to narrow your search precisely:

```json
{
  "name": "search_documentation",
  "arguments": {
    "query": "configuration steps",
    "section": "getting-started",
    "directory": "/docs/getting-started",
    "tags": "setup"
  }
}
```

## Implementation Details

The `SearchDocumentationTool` is implemented in `/mcp/src/tools/SearchDocumentationTool.ts`. Key implementation features include:

- Uses the embedding service to convert the search query into a vector embedding
- Searches across both "documentation" and "merged_documentation" collections automatically
- Leverages the vector database service to perform efficient similarity search
- Builds complex filters based on directory, filename, section, and tags
- Combines results from multiple collections and sorts by similarity score
- Handles error cases gracefully, including non-existent collections

## Related Tools

- [Generate Documentation](./generate-documentation.md) - Creates documentation that can be indexed and searched
- [Search Codebase](./search-codebase.md) - Similar semantic search but for code instead of documentation
- [Search Diagrams](./search-diagram.md) - Similar semantic search but for diagrams instead of documentation
