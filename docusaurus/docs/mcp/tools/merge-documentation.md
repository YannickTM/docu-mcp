---
sidebar_position: 12
---

# Merge Documentation

The `merge_documentation` tool combines multiple documentation entries into a single comprehensive documentation using a sequential thinking approach with semantic search capabilities.

## Overview

This tool enables you to merge two or more existing documentation entries into a unified document through a multi-step reasoning process. It's particularly useful for:

- Consolidating related documentation from different sources
- Creating comprehensive guides from modular documentation
- Merging duplicated or overlapping content
- Creating hierarchical documentation structures (merge of merges)
- Synthesizing documentation across modules or features

## Parameters

| Name                               | Type     | Required | Default | Description                                                               |
| ---------------------------------- | -------- | -------- | ------- | ------------------------------------------------------------------------- |
| sourceDocumentations               | string[] | Yes      | -       | Array of documentation IDs to merge (minimum 2)                           |
| mergeStrategy                      | string   | Yes      | -       | How to merge the documentations ("summarize", "combine", or "synthesize") |
| chapters                           | array    | No       | -       | Array of chapter titles for the merged documentation                      |
| mergedDocumentation                | string   | No       | -       | Current merged documentation content (accumulates as thinking progresses) |
| needToSearch                       | boolean  | Yes      | -       | Whether semantic search is needed                                         |
| semanticSearch                     | object   | No       | -       | Semantic search query across merged documentations                        |
| thought                            | string   | Yes      | -       | The current thinking step content                                         |
| nextThoughtNeeded                  | boolean  | Yes      | -       | Whether another thought step is needed                                    |
| thoughtNumber                      | number   | Yes      | -       | Current thought number in sequence                                        |
| totalThoughts                      | number   | Yes      | -       | Estimated total thoughts needed (minimum 3)                               |
| isRevision                         | boolean  | No       | false   | Whether this thought revises previous thinking                            |
| revisesThought                     | number   | No       | -       | Which thought number is being reconsidered                                |
| branchFromThought                  | number   | No       | -       | Branching point thought number                                            |
| branchId                           | string   | No       | -       | Identifier for the current branch                                         |
| needsMoreThoughts                  | boolean  | No       | false   | If more thoughts are needed beyond initial estimate                       |
| parentMergedDocumentationId        | string   | No       | -       | ID of parent merged documentation for hierarchical merging                |
| mergeLevel                         | number   | No       | 0       | Level of merge (0 for first-level, 1+ for merge of merges)                |
| readyToIndexTheMergedDocumentation | boolean  | Yes      | -       | Whether the merged documentation is ready to be indexed                   |

### Merge Strategies

- **summarize**: Create a concise summary of the main points
- **combine**: Merge all content while removing duplicates
- **synthesize**: Create new insights from the combined knowledge

### Semantic Search

The `semanticSearch` parameter accepts an object with:

- `query`: The search query string
- `filter`: Optional filter object containing:
  - `mergeLevel`: Filter by merge level (0+)
  - `mergeStrategy`: Filter by strategy

## Examples

### Basic Documentation Merge

```json
{
  "name": "merge_documentation",
  "arguments": {
    "sourceDocumentations": ["api_auth_doc", "api_endpoints_doc"],
    "mergeStrategy": "combine",
    "chapters": ["Introduction", "Authentication", "Endpoints", "Examples"],
    "needToSearch": false,
    "thought": "I need to merge the authentication and endpoints documentation to create a complete API reference.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 5,
    "readyToIndexTheMergedDocumentation": false
  }
}
```

### Semantic Search-Enhanced Merge

```json
{
  "name": "merge_documentation",
  "arguments": {
    "sourceDocumentations": ["setup_guide", "config_guide"],
    "mergeStrategy": "synthesize",
    "needToSearch": true,
    "semanticSearch": {
      "query": "prerequisites installation troubleshooting",
      "filter": {
        "mergeLevel": 0
      }
    },
    "thought": "Let me search for related installation and troubleshooting documentation to include in this comprehensive guide.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 6,
    "readyToIndexTheMergedDocumentation": false
  }
}
```

### Hierarchical Merge (Merge of Merges)

```json
{
  "name": "merge_documentation",
  "arguments": {
    "sourceDocumentations": ["merged_api_docs", "merged_user_docs"],
    "mergeStrategy": "summarize",
    "parentMergedDocumentationId": "master_documentation",
    "mergeLevel": 1,
    "needToSearch": false,
    "thought": "Now I'll create a top-level documentation overview by merging the already-merged API and user documentation.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 4,
    "readyToIndexTheMergedDocumentation": false
  }
}
```

## Implementation Details

### Validation

The tool validates:

- At least 2 source documentation IDs are provided
- All source documentation entries exist in the vector database
- Required fields (title, sourceDocumentations) are present

### Fetching Source Documents

1. Retrieves documentation entries from the vector database
2. Validates that all requested documents exist
3. Extracts metadata and content from each document

### Semantic Search

When enabled, the tool:

1. Performs searches across specified collections
2. Filters results based on provided criteria
3. Integrates relevant content into the merge process

### Merging Process

The tool uses a sequential thinking approach:

1. Analyzes all source documentation
2. Identifies overlapping and unique content
3. Structures the merged content logically
4. Preserves important metadata and references

### Sequential Thinking Process

The tool uses a sequential thinking approach to merge documentation:

1. Analyzes all source documentation through multiple thought steps
2. Identifies overlapping and unique content progressively
3. Structures the merged content logically with revision capabilities
4. Preserves important metadata and references
5. Allows branching and revision of earlier thoughts

### Storage

The merged documentation is stored in the `merged_documentation` collection with:

- Source tracking (which documents were merged)
- Merge metadata (strategy, date, level)
- Vector embeddings for semantic search
- Hierarchical relationship information (parent-child relationships)
- Complete thought history from the merge process

## Collection Schema

The merged documentation is stored with the following schema:

```typescript
{
  id: string;
  vector: number[];
  content: string;
  type: "merged-documentation";
  chapters: Chapter[];
  sourceDocumentations: string[];
  sourceFiles: string[];
  mergedFromCount: number;
  mergeStrategy: string;
  mergeDate: string;
  parentMergedDocumentationId: string;
  mergeLevel: number;
  createdAt: string;
}
```

## Response

The tool returns an object with the following properties:

| Property             | Type    | Description                                        |
| -------------------- | ------- | -------------------------------------------------- |
| sourceDocumentations | array   | Array of source documentation IDs that were merged |
| sourceFiles          | array   | Files associated with the source documentations    |
| mergeStrategy        | string  | The merge strategy used                            |
| mergeLevel           | number  | Hierarchical merge level (0 for first merge)       |
| semanticSearchResult | array   | Results from semantic search if performed          |
| chapters             | array   | Chapters in the merged documentation               |
| thoughtNumber        | number  | The current thought number                         |
| totalThoughts        | number  | Current estimate of total thoughts needed          |
| nextThoughtNeeded    | boolean | Whether another thought step is needed             |
| branches             | array   | List of branch identifiers                         |
| thoughtHistoryLength | number  | Total count of thoughts processed                  |

## Use Cases

- **Documentation Consolidation**: Merge multiple API endpoint docs into a complete reference
- **Guide Creation**: Combine setup, usage, and troubleshooting docs into a comprehensive guide
- **Knowledge Base Building**: Merge various documentation sources into a unified knowledge base
- **Version Management**: Merge documentation from different versions or branches
- **Modular Documentation**: Combine modular pieces into full documentation sets
