---
sidebar_position: 13
---

# Generate User Guide

The `generate_user_guide` tool creates comprehensive user guides by leveraging semantic search across multiple documentation collections using a sequential thinking approach.

## Overview

This tool provides capabilities to:
- Generate user guides tailored to specific audiences
- Search across multiple collections (documentation, diagrams, merged docs, codebase)
- Support multi-step reasoning and content synthesis  
- Allow for revision and branching of thoughts
- Build guides iteratively with cross-collection context understanding
- Track sources from different collections
- Store the final user guide in the vector database for later retrieval

## Sequential Thinking Approach

Like other sequential thinking tools, this tool uses an approach that:

1. Breaks down user guide creation into logical reasoning steps
2. Searches across multiple collections for relevant content
3. Builds understanding progressively through numbered thoughts
4. Allows for revising earlier thoughts when new information emerges
5. Supports branching into alternative reasoning paths
6. Dynamically adjusts the number of steps based on complexity
7. Synthesizes content from various sources
8. Stores the final guide in a searchable vector database

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| topic | string | Yes | - | The main topic or title for the user guide |
| targetAudience | string | Yes | - | The intended audience (e.g., developers, end-users, administrators) |
| userGuide | string | No | - | Current user guide version (accumulates as thinking progresses) |
| sections | array | No | - | Array of section titles to include in the guide |
| thought | string | Yes | - | The current thinking step content |
| nextThoughtNeeded | boolean | Yes | - | Whether another thought step is needed |
| thoughtNumber | number | Yes | - | Current thought number in sequence |
| totalThoughts | number | Yes | - | Estimated total thoughts needed |
| needToSearch | boolean | Yes | - | Whether semantic search is needed |
| semanticSearch | array | No | - | Array of search queries across different collections |
| relatedFiles | array | No | - | Files referenced in the user guide |
| usedDocumentation | array | No | - | Documentation IDs used as sources |
| usedDiagrams | array | No | - | Diagram IDs used as sources |
| usedMergedDocumentation | array | No | - | Merged documentation IDs used as sources |
| usedMergedDiagrams | array | No | - | Merged diagram IDs used as sources |
| usedCodebase | array | No | - | Codebase files used as sources |
| isRevision | boolean | No | false | Whether this thought revises previous thinking |
| revisesThought | number | No | - | Which thought number is being reconsidered |
| branchFromThought | number | No | - | Branching point thought number |
| branchId | string | No | - | Identifier for the current branch |
| needsMoreThoughts | boolean | No | false | If more thoughts are needed beyond initial estimate |
| readyToIndexTheUserGuide | boolean | Yes | - | Whether user guide is ready to be stored in the database |

## Semantic Search

The `semanticSearch` parameter accepts an array of search queries, each specifying:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| collection | string | Yes | Collection to search (see available collections below) |
| query | string | Yes | The search query |
| filter | object | No | Optional filters for the search |

### Available Collections

- `documentation` - Individual documentation files
- `diagrams` - Visual diagrams and their descriptions
- `merged_documentation` - Combined documentation from multiple sources
- `merged_diagrams` - Combined diagrams from multiple sources
- `codebase` - Actual code files and comments
- `user_guides` - Existing user guides (to avoid duplication)

### Collection-Specific Filters

Common filters:
- `filename` - Filter by filename
- `directory` - Filter by directory

Collection-specific filters:
- For diagrams: `diagramType` (flowchart, sequenceDiagram, classDiagram, etc.)
- For merged collections: `mergeStrategy` (summarize, combine, synthesize) and `mergeLevel` (0+)

## Response

The tool returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| topic | string | The main topic of the user guide |
| targetAudience | string | The intended audience |
| semanticSearchResult | array | Results from semantic searches across collections |
| sections | array | List of sections in the guide |
| relatedFiles | array | Files referenced in the guide |
| usedSources | object | Object containing arrays of sources from each collection |
| thoughtNumber | number | The current thought number |
| totalThoughts | number | Current estimate of total thoughts needed |
| nextThoughtNeeded | boolean | Whether another thought step is needed |
| branches | array | List of branch identifiers |
| thoughtHistoryLength | number | Total count of thoughts processed |

## Database Storage

When `readyToIndexTheUserGuide` is set to `true`, the tool:

1. Generates an embedding for the user guide using the configured embedding provider
2. Creates metadata including topic, audience, sections, and source references
3. Stores the embedding and metadata in the "user_guides" collection in the vector database
4. Makes the guide searchable via semantic search

This enables semantic search and retrieval of user guides based on meaning, not just keywords.

## Example

**Request (Initial Thought with Multi-Collection Search)**:
```json
{
  "name": "generate_user_guide",
  "arguments": {
    "topic": "Getting Started with DocuMCP",
    "targetAudience": "developers",
    "userGuide": "",
    "sections": ["Installation", "Configuration", "Basic Usage", "API Reference"],
    "thought": "I'll create a comprehensive getting started guide for developers. Let me search across different collections to gather relevant information.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 6,
    "needToSearch": true,
    "semanticSearch": [
      {
        "collection": "documentation",
        "query": "installation setup configuration",
        "filter": {
          "directory": "/docs"
        }
      },
      {
        "collection": "codebase",
        "query": "main entry point initialization",
        "filter": {
          "directory": "/src"
        }
      },
      {
        "collection": "diagrams",
        "query": "architecture overview flow",
        "filter": {
          "diagramType": "flowchart"
        }
      }
    ],
    "readyToIndexTheUserGuide": false
  }
}
```

**Response**:
```json
{
  "topic": "Getting Started with DocuMCP",
  "targetAudience": "developers",
  "semanticSearchResult": [
    {
      "collection": "documentation",
      "content": "# Installation\n\nTo install DocuMCP, run:\n```bash\nnpm install docu-mcp\n```",
      "similarity": 0.8923,
      "filePath": "/docs/installation.md"
    },
    {
      "collection": "codebase",
      "content": "// Main entry point\nclass DocuMCP {\n  constructor(config) {\n    // Initialize with config\n  }\n}",
      "similarity": 0.8456,
      "filePath": "/src/index.ts"
    },
    {
      "collection": "diagrams",
      "content": "flowchart TD\n  A[User] --> B[DocuMCP]\n  B --> C[Vector DB]\n  B --> D[LLM]",
      "similarity": 0.8234,
      "diagramType": "flowchart"
    }
  ],
  "sections": ["Installation", "Configuration", "Basic Usage", "API Reference"],
  "thoughtNumber": 1,
  "totalThoughts": 6,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 1
}
```

**Final Request (User Guide Ready)**:
```json
{
  "name": "generate_user_guide",
  "arguments": {
    "topic": "Getting Started with DocuMCP",
    "targetAudience": "developers",
    "userGuide": "# Getting Started with DocuMCP\n\nA comprehensive guide for developers to get started with DocuMCP - a Model Context Protocol server for intelligent code documentation.\n\n## Installation\n\n```bash\nnpm install -g docu-mcp\n```\n\n## Configuration\n\nCreate a configuration file `docu-mcp.config.json`:\n\n```json\n{\n  \"vectorDB\": {\n    \"provider\": \"lance\",\n    \"path\": \"./data\"\n  },\n  \"embedding\": {\n    \"provider\": \"buildin\",\n    \"model\": \"all-MiniLM-L6-v2\"\n  }\n}\n```\n\n## Basic Usage\n\n```javascript\nimport { DocuMCP } from 'docu-mcp';\n\nconst docu = new DocuMCP({\n  vectorDB: 'lance',\n  embeddingProvider: 'buildin'\n});\n\n// Index documentation\nconst result = await docu.indexFile('/path/to/code.js');\n\n// Search documentation\nconst docs = await docu.searchDocumentation('authentication');\n```\n\n## API Reference\n\n### Core Methods\n\n- `indexFile(path)` - Index a single file\n- `indexDirectory(path)` - Recursively index a directory\n- `searchDocumentation(query)` - Search indexed documentation\n- `generateDocumentation(file)` - Generate documentation for a file\n\n## Architecture Overview\n\n[Flowchart showing User -> DocuMCP -> Vector DB & LLM]\n\n## Next Steps\n\n- Explore advanced configuration options\n- Learn about custom embedding providers\n- Set up Claude Desktop integration",
    "sections": ["Installation", "Configuration", "Basic Usage", "API Reference", "Architecture Overview", "Next Steps"],
    "thought": "I've completed the getting started guide with all essential sections. The guide combines information from documentation, codebase, and diagrams to provide a comprehensive introduction for developers. It's now ready to be indexed.",
    "nextThoughtNeeded": false,
    "thoughtNumber": 6,
    "totalThoughts": 6,
    "needToSearch": false,
    "relatedFiles": ["/docs/installation.md", "/src/index.ts", "/docs/api-reference.md"],
    "usedDocumentation": ["doc_1234567890", "doc_1234567891"],
    "usedDiagrams": ["diagram_1234567892"],
    "usedCodebase": ["/src/index.ts", "/src/config.ts"],
    "readyToIndexTheUserGuide": true
  }
}
```

## Implementation Details

The tool is implemented in TypeScript with these key features:

- **Multi-Collection Search**: Searches across all available collections in a single request
- **Source Tracking**: Maintains separate arrays for each type of source used
- **Thought History**: Maintains a record of all thinking steps
- **Branching Support**: Allows exploration of alternative documentation approaches
- **Validation**: Ensures all required parameters are provided
- **Vector Database Integration**: Stores completed guides with embeddings for search
- **Multiple Vector Database Support**: Works with LanceDB, ChromaDB, or Qdrant

### Integration with Vector Database

The user guide tool integrates with the vector database system to store and retrieve guides:

```typescript
// When user guide is ready to be indexed
if (data.readyToIndexTheUserGuide && data.userGuide) {
  // Get embedding dimension from configuration
  const embeddingDimension = getEmbeddingDimension();
  
  // Ensure collection exists
  if (!(await collectionExists("user_guides"))) {
    const created = await createCollection("user_guides", embeddingDimension);
    if (!created) {
      throw new Error(`Failed to create collection user_guides`);
    }
  }
  
  // Generate embedding for the user guide content
  const result = await createEmbedding(data.userGuide);
  
  // Create metadata for the user guide
  const metadata = {
    content: data.userGuide,
    topic: data.topic,
    targetAudience: data.targetAudience,
    type: "user_guide",
    sections: data.sections || [],
    relatedFiles: data.relatedFiles || [],
    generatedFrom: {
      documentation: data.usedDocumentation || [],
      diagrams: data.usedDiagrams || [],
      mergedDocumentation: data.usedMergedDocumentation || [],
      mergedDiagrams: data.usedMergedDiagrams || [],
      codebase: data.usedCodebase || [],
    },
    createdAt: new Date().toISOString(),
  };
  
  // Create a point for vector database
  const pointId = Date.now() + Math.floor(Math.random() * 1000);
  const point = createPoint(pointId, result.embedding, metadata);
  
  // Add to the user_guides collection
  const success = await upsertPoints("user_guides", [point]);
}
```

## Usage Patterns

The sequential thinking approach with multi-collection search is particularly useful for:

1. **Onboarding Documentation**: Creating getting started guides for new users
2. **Feature Tutorials**: Building comprehensive tutorials for specific features
3. **API Documentation**: Generating developer-focused API guides
4. **Troubleshooting Guides**: Creating step-by-step problem-solving documentation
5. **Cross-Referenced Guides**: Building guides that link documentation, diagrams, and code
6. **Audience-Specific Content**: Tailoring guides for different user groups

## Related Tools

- [Generate Documentation](./generate-documentation.md) - For generating documentation for individual files
- [Merge Documentation](./merge-documentation.md) - For combining multiple documentation sources
- [Search Documentation](./search-documentation.md) - For searching indexed documentation
- [Generate Diagram](./generate-diagram.md) - For creating visual representations
- [Search Codebase](./search-codebase.md) - For finding relevant code snippets