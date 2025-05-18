---
sidebar_position: 10
---

# Merge Diagram

The `merge_diagram` tool combines multiple diagram entries into a single comprehensive diagram using a sequential thinking approach with semantic search capabilities.

## Overview

This tool enables you to merge two or more existing diagram entries into a unified diagram through a multi-step reasoning process. It's particularly useful for:
- Consolidating related diagrams from different views or components
- Creating comprehensive system architecture diagrams
- Merging specialized diagrams into overview diagrams
- Building hierarchical diagram structures (merge of merges)
- Synthesizing diagrams across modules or features

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| sourceDiagrams | string[] | Yes | - | Array of diagram IDs to merge (minimum 2) |
| mergeStrategy | string | Yes | - | How to merge the diagrams ("summarize", "combine", or "synthesize") |
| diagramType | string | No | - | Type of merged diagram (flowchart, sequenceDiagram, classDiagram, etc.) |
| diagramElements | array | No | - | Optional array of diagram elements in the merge |
| mergedDiagram | string | No | - | Current merged diagram content (accumulates as thinking progresses) |
| needToSearch | boolean | Yes | - | Whether semantic search is needed |
| semanticSearch | object | No | - | Semantic search query across merged diagrams |
| thought | string | Yes | - | The current thinking step content |
| nextThoughtNeeded | boolean | Yes | - | Whether another thought step is needed |
| thoughtNumber | number | Yes | - | Current thought number in sequence |
| totalThoughts | number | Yes | - | Estimated total thoughts needed (minimum 3) |
| isRevision | boolean | No | false | Whether this thought revises previous thinking |
| revisesThought | number | No | - | Which thought number is being reconsidered |
| branchFromThought | number | No | - | Branching point thought number |
| branchId | string | No | - | Identifier for the current branch |
| needsMoreThoughts | boolean | No | false | If more thoughts are needed beyond initial estimate |
| parentMergedDiagramId | string | No | - | ID of parent merged diagram for hierarchical merging |
| mergeLevel | number | No | 0 | Level of merge (0 for first-level, 1+ for merge of merges) |
| readyToIndexTheMergedDiagram | boolean | Yes | - | Whether the merged diagram is ready to be indexed |

### Merge Strategies

- **summarize**: Create a concise summary of the main elements
- **combine**: Merge all elements while removing duplicates
- **synthesize**: Create new insights from the combined diagrams

### Semantic Search

The `semanticSearch` parameter accepts an object with:
- `query`: The search query string
- `filter`: Optional filter object containing:
  - `mergeLevel`: Filter by merge level (0+)
  - `mergeStrategy`: Filter by strategy
  - `diagramType`: Filter by diagram type

## Examples

### Basic Diagram Merge
```json
{
  "name": "merge_diagram",
  "arguments": {
    "sourceDiagrams": ["auth_flow", "data_flow"],
    "mergeStrategy": "combine",
    "needToSearch": false,
    "thought": "I need to merge the authentication flow and data flow diagrams to create a complete system flow visualization.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 5,
    "readyToIndexTheMergedDiagram": false
  }
}
```

### Semantic Search-Enhanced Merge
```json
{
  "name": "merge_diagram",
  "arguments": {
    "sourceDiagrams": ["user_class", "admin_class"],
    "mergeStrategy": "synthesize",
    "diagramType": "classDiagram",
    "needToSearch": true,
    "semanticSearch": {
      "query": "user role permissions",
      "filter": { "diagramType": "classDiagram" }
    },
    "thought": "Let me search for other user-related class diagrams to include in this merge for a complete user system view.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 6,
    "readyToIndexTheMergedDiagram": false
  }
}
```

### Hierarchical Merge (Merge of Merges)
```json
{
  "name": "merge_diagram",
  "arguments": {
    "sourceDiagrams": ["merged_frontend_arch", "merged_backend_arch"],
    "diagramType": "flowchart",
    "mergeStrategy": "summarize",
    "parentMergedDiagramId": "master_architecture",
    "mergeLevel": 1,
    "needToSearch": false,
    "thought": "Now I'll create a high-level architecture overview by merging the already-merged frontend and backend architecture diagrams.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 4,
    "readyToIndexTheMergedDiagram": false
  }
}
```

## Implementation Details

### Validation
The tool validates:
- At least 2 source diagram IDs are provided
- All source diagrams exist in the vector database
- Required fields (title, sourceDiagrams, diagramType) are present
- Diagram type is valid

### Fetching Source Diagrams
1. Retrieves diagram entries from the vector database
2. Validates that all requested diagrams exist
3. Extracts diagram elements and metadata from each diagram

### Semantic Search
When enabled, the tool:
1. Performs searches across diagram collections
2. Filters results based on diagram type and other criteria
3. Integrates relevant diagram elements into the merge process

### Merging Process
The tool uses a sequential thinking approach:
1. Analyzes all source diagrams and their elements
2. Identifies relationships and common components
3. Consolidates diagram elements logically
4. Preserves important relationships and metadata

### Sequential Thinking Process
The tool uses a sequential thinking approach to merge diagrams:
1. Analyzes all source diagrams and their elements through multiple thought steps
2. Identifies relationships and common components progressively
3. Consolidates diagram elements logically with revision capabilities
4. Preserves important relationships and metadata
5. Allows branching and revision of earlier thoughts

### Storage
The merged diagram is stored in the `merged_diagrams` collection with:
- Source tracking (which diagrams were merged)
- Merge metadata (strategy, date, level)
- Vector embeddings for semantic search  
- Hierarchical relationship information (parent-child relationships)
- Complete thought history from the merge process

## Collection Schema

The merged diagram is stored with the following schema:

```typescript
{
  id: string;
  vector: number[];
  content: string;
  type: "merged-diagram";
  diagramType: string;
  diagramElements: DiagramElement[];
  sourceDiagrams: string[];
  sourceFiles: string[];
  mergedFromCount: number;
  mergeStrategy: string;
  mergeDate: string;
  parentMergedDiagramId: string;
  mergeLevel: number;
  createdAt: string;
}
```

Where `DiagramElement` includes:
- `id`: Unique identifier
- `type`: Element type (node, edge, etc.)
- `label`: Display label
- `style`: Visual styling
- `data`: Element-specific data

## Response

The tool returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| sourceDiagrams | array | Array of source diagram IDs that were merged |
| sourceFiles | array | Files associated with the source diagrams |
| mergeStrategy | string | The merge strategy used |
| diagramType | string | Type of the merged diagram |
| mergeLevel | number | Hierarchical merge level (0 for first merge) |
| semanticSearchResult | array | Results from semantic search if performed |
| diagramElements | array | Elements in the merged diagram |
| thoughtNumber | number | The current thought number |
| totalThoughts | number | Current estimate of total thoughts needed |
| nextThoughtNeeded | boolean | Whether another thought step is needed |
| branches | array | List of branch identifiers |
| thoughtHistoryLength | number | Total count of thoughts processed |

## Use Cases

- **Architecture Consolidation**: Merge microservice diagrams into a complete system view
- **Flow Integration**: Combine separate process flows into an end-to-end diagram
- **Class Hierarchy**: Merge related class diagrams into a complete domain model
- **Component Overview**: Consolidate component diagrams from different modules
- **System Documentation**: Create comprehensive diagrams for documentation purposes