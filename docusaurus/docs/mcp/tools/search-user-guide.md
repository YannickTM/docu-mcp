---
sidebar_position: 17
---

# Search User Guide

The `search_user_guide` tool enables semantic search for previously generated user guides stored in the vector database.

## Overview

This tool provides capabilities to:

- Search for user guides using natural language queries
- Find guides tailored for specific audiences
- Filter results by target audience, topic, or related files
- Return ranked results with similarity scores
- Retrieve full user guide content with metadata
- Track the source materials used to generate each guide

## Vector Database Integration

The `search_user_guide` tool leverages the vector database to enable semantic search across stored user guides:

1. When user guides are generated using the `generate_user_guide` tool, they are stored in the "user_guides" collection
2. Embeddings are created for the guide content to enable semantic search
3. Metadata such as target audience, topics, and source materials are stored alongside the content
4. The tool provides comprehensive provenance tracking for all guides

## Parameters

| Name           | Type   | Required | Default | Description                                                                     |
| -------------- | ------ | -------- | ------- | ------------------------------------------------------------------------------- |
| query          | string | Yes      | -       | Natural language query to search for                                            |
| limit          | number | No       | 10      | Maximum number of results to return                                             |
| targetAudience | string | No       | -       | Filter by intended audience (e.g., 'developers', 'end-users', 'administrators') |
| topic          | string | No       | -       | Filter by user guide topic                                                      |
| relatedFile    | string | No       | -       | Filter by files referenced in the guide                                         |

## Response

The tool returns an object with the following properties:

| Property     | Type   | Description                        |
| ------------ | ------ | ---------------------------------- |
| query        | string | The original search query          |
| totalResults | number | Total number of user guides found  |
| results      | array  | Array of user guide search results |

Each result in the array contains:

| Property       | Type     | Description                                          |
| -------------- | -------- | ---------------------------------------------------- |
| content        | string   | The full user guide content                          |
| similarity     | number   | Similarity score between query and guide (0-1)       |
| topic          | string   | The main topic of the user guide                     |
| targetAudience | string   | The intended audience for the guide                  |
| sections       | string[] | List of sections in the guide                        |
| relatedFiles   | string[] | Files referenced in the guide                        |
| generatedFrom  | object   | Sources used to generate the guide                   |
| location       | string   | Reference location (format: `user_guide: { topic }`) |
| createdAt      | string   | Timestamp when the guide was created                 |

### GeneratedFrom Object

The `generatedFrom` object tracks all sources used to create the guide:

| Property            | Type     | Description                     |
| ------------------- | -------- | ------------------------------- |
| documentation       | string[] | Documentation files used        |
| diagrams            | string[] | Diagram files used              |
| mergedDocumentation | string[] | Merged documentation files used |
| mergedDiagrams      | string[] | Merged diagram files used       |
| codebase            | string[] | Codebase files used             |

## Example

**Request**:

```json
{
  "name": "search_user_guide",
  "arguments": {
    "query": "getting started with authentication",
    "limit": 5,
    "targetAudience": "developers"
  }
}
```

**Response**:

```json
{
  "query": "getting started with authentication",
  "totalResults": 2,
  "results": [
    {
      "content": "# Authentication Setup Guide for Developers\n\nThis guide will walk you through setting up authentication in your application...",
      "similarity": 0.9234,
      "topic": "Authentication Setup",
      "targetAudience": "developers",
      "sections": [
        "Prerequisites",
        "Basic Setup",
        "Advanced Configuration",
        "Testing"
      ],
      "relatedFiles": ["/src/auth/AuthService.js", "/src/auth/JWT.js"],
      "generatedFrom": {
        "documentation": ["/docs/auth/README.md"],
        "diagrams": ["/diagrams/auth-flow.mermaid"],
        "mergedDocumentation": [],
        "mergedDiagrams": [],
        "codebase": ["/src/auth/AuthService.js"]
      },
      "location": "user_guide:Authentication Setup",
      "createdAt": "2023-10-15T14:30:00Z"
    },
    {
      "content": "# OAuth 2.0 Integration Guide\n\nThis guide covers OAuth 2.0 implementation for developers...",
      "similarity": 0.8567,
      "topic": "OAuth Integration",
      "targetAudience": "developers",
      "sections": ["Overview", "Provider Setup", "Implementation", "Security"],
      "relatedFiles": ["/src/auth/OAuth.js", "/src/config/oauth.config.js"],
      "generatedFrom": {
        "documentation": ["/docs/auth/oauth.md"],
        "diagrams": ["/diagrams/oauth-flow.mermaid"],
        "mergedDocumentation": [],
        "mergedDiagrams": [],
        "codebase": ["/src/auth/OAuth.js"]
      },
      "location": "user_guide:OAuth Integration",
      "createdAt": "2023-10-14T10:00:00Z"
    }
  ]
}
```

## Search Filters

The `search_user_guide` tool supports several filtering options to narrow your search:

### Filtering by Target Audience

Filter results for guides written for specific audiences:

```json
{
  "name": "search_user_guide",
  "arguments": {
    "query": "installation and setup",
    "targetAudience": "administrators"
  }
}
```

### Filtering by Topic

Find guides on specific topics:

```json
{
  "name": "search_user_guide",
  "arguments": {
    "query": "database configuration",
    "topic": "Database Setup"
  }
}
```

### Filtering by Related Files

Find guides that reference specific files:

```json
{
  "name": "search_user_guide",
  "arguments": {
    "query": "API usage",
    "relatedFile": "/src/api/APIController.js"
  }
}
```

### Combining Filters

You can combine multiple filters to find exactly what you need:

```json
{
  "name": "search_user_guide",
  "arguments": {
    "query": "deployment process",
    "targetAudience": "developers",
    "topic": "Deployment",
    "relatedFile": "/deploy/docker-compose.yml"
  }
}
```

## Implementation Details

The `SearchUserGuideTool` is implemented in `/mcp/src/tools/SearchUserGuideTool.ts`. Key implementation features include:

- Uses the embedding service to convert the search query into a vector embedding
- Searches in the "user_guides" collection
- Leverages the vector database service to perform efficient similarity search
- Builds complex filters based on target audience, topic, and related files
- Provides comprehensive source tracking through the generatedFrom object
- Handles error cases gracefully, including missing collections

Key features of the implementation:

- Maintains full provenance of guide generation
- Supports multi-criteria filtering
- Returns results sorted by relevance
- Provides detailed metadata for each guide

## Related Tools

- [Generate User Guide](./generate-user-guide.md) - Creates user guides that can be indexed and searched
- [Search Documentation](./search-documentation.md) - Similar semantic search but for raw documentation
- [Search Codebase](./search-codebase.md) - Similar semantic search but for code
- [Search Diagrams](./search-diagram.md) - Similar semantic search but for diagrams
