---
sidebar_position: 15
---

# Search Diagrams

The `search_diagrams` tool enables semantic search for previously generated diagrams stored in the vector database.

## Overview

This tool provides capabilities to:

- Search for diagrams using natural language queries
- Find diagrams related to concepts, even without exact keyword matches
- Filter results by diagram type, directory, or filename
- Return ranked results with similarity scores
- Retrieve diagram content along with metadata
- Search across both individual diagrams and merged diagrams collections

## Vector Database Integration

The `search_diagrams` tool leverages the vector database to enable semantic search across stored diagrams:

1. When diagrams are generated using the `generate_diagram` tool, they are stored in the vector database
2. Embeddings are created for the diagram content to enable semantic search
3. Metadata such as diagram type, file path, and other attributes are stored alongside the diagram
4. The tool searches both "diagrams" and "merged_diagrams" collections automatically

## Parameters

| Name        | Type               | Required | Default | Description                                                           |
| ----------- | ------------------ | -------- | ------- | --------------------------------------------------------------------- |
| query       | string             | Yes      | -       | Natural language query to search for                                  |
| limit       | number             | No       | 10      | Maximum number of results to return                                   |
| diagramType | string or string[] | No       | -       | Filter by diagram type(s) (e.g., 'component', 'flow', 'architecture') |
| directory   | string             | No       | -       | Filter by directory path                                              |
| filename    | string             | No       | -       | Filter by filename                                                    |

## Response

The tool returns an object with the following properties:

| Property     | Type   | Description                     |
| ------------ | ------ | ------------------------------- |
| query        | string | The original search query       |
| totalResults | number | Total number of diagrams found  |
| results      | array  | Array of diagram search results |

Each result in the array contains:

| Property    | Type   | Description                                                            |
| ----------- | ------ | ---------------------------------------------------------------------- |
| content     | string | The diagram content (typically in mermaid.js format)                   |
| similarity  | number | Similarity score between query and diagram (0-1)                       |
| filePath    | string | Path to the file the diagram was generated from                        |
| filename    | string | Name of the file                                                       |
| extension   | string | File extension                                                         |
| location    | string | Location information including position if available                   |
| title       | string | Title of the diagram if available                                      |
| diagramType | string | Type of diagram (e.g., 'flowchart', 'sequenceDiagram', 'classDiagram') |
| description | string | Description of the diagram if available                                |

## Example

**Request**:

```json
{
  "name": "search_diagrams",
  "arguments": {
    "query": "authentication flow",
    "limit": 5,
    "diagramType": "sequenceDiagram"
  }
}
```

**Response**:

```json
{
  "query": "authentication flow",
  "totalResults": 2,
  "results": [
    {
      "content": "sequenceDiagram\n  participant User\n  participant AuthService\n  participant DB\n  User->>+AuthService: Login Request\n  AuthService->>+DB: Verify Credentials\n  DB-->>-AuthService: User Data\n  AuthService-->>-User: JWT Token",
      "similarity": 0.8745,
      "filePath": "/path/to/AuthService.js",
      "filename": "AuthService.js",
      "extension": ".js",
      "location": "/path/to/AuthService.js",
      "title": "Authentication Flow",
      "diagramType": "sequenceDiagram",
      "description": "Login flow between User, AuthService, and Database"
    },
    {
      "content": "sequenceDiagram\n  participant Client\n  participant API\n  participant Auth\n  Client->>+API: Request /protected\n  API->>+Auth: Validate Token\n  Auth-->>-API: Token Valid\n  API-->>-Client: Protected Data",
      "similarity": 0.7623,
      "filePath": "/path/to/APIController.js",
      "filename": "APIController.js",
      "extension": ".js",
      "location": "/path/to/APIController.js",
      "title": "API Authentication",
      "diagramType": "sequenceDiagram",
      "description": "Protected API endpoint authentication flow"
    }
  ]
}
```

## Search Filters

The `search_diagrams` tool supports several filtering options to narrow your search:

### Filtering by Diagram Type

You can filter results to include only specific diagram types:

```json
{
  "name": "search_diagrams",
  "arguments": {
    "query": "component structure",
    "diagramType": "classDiagram"
  }
}
```

For multiple diagram types:

```json
{
  "name": "search_diagrams",
  "arguments": {
    "query": "state transitions",
    "diagramType": ["stateDiagram", "flowchart"]
  }
}
```

### Filtering by Directory

You can filter results to include only diagrams from a specific directory:

```json
{
  "name": "search_diagrams",
  "arguments": {
    "query": "authentication",
    "directory": "/src/auth"
  }
}
```

### Filtering by Filename

You can filter results to include only diagrams from files with specific filenames:

```json
{
  "name": "search_diagrams",
  "arguments": {
    "query": "login process",
    "filename": "AuthService.js"
  }
}
```

## Implementation Details

The `SearchDiagramTool` is implemented in `/mcp/src/tools/SearchDiagramTool.ts`. Key implementation features include:

- Uses the embedding service to convert the search query into a vector embedding
- Searches across both "diagrams" and "merged_diagrams" collections automatically
- Leverages the vector database service to perform efficient similarity search
- Builds complex filters based on diagram type, directory, and filename
- Combines results from multiple collections and sorts by similarity score
- Handles error cases gracefully, including non-existent collections

## Related Tools

- [Generate Diagram](./generate-diagram.md) - Creates diagrams that can be indexed and searched
- [Search Codebase](./search-codebase.md) - Similar semantic search but for code instead of diagrams
- [Generate Documentation](./generate-documentation.md) - Can include diagrams in its outputs
