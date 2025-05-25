---
sidebar_position: 11
---

# Generate Documentation

The `generate_documentation` tool creates comprehensive documentation using a sequential thinking approach that methodically builds understanding through a series of reasoning steps.

## Overview

This tool provides capabilities to:

- Generate detailed documentation using a sequential thinking process
- Support multi-step reasoning and exploration of code
- Allow for revision and branching of thoughts
- Build documentation iteratively with deep context understanding
- Track thought processes through numbered steps
- Store the final documentation in the vector database for later retrieval
- Accept file paths or direct code content for analysis

## Sequential Thinking Approach

Unlike traditional documentation generators, this tool uses a sequential thinking approach that:

1. Breaks down complex documentation tasks into logical reasoning steps
2. Builds understanding progressively through numbered thoughts
3. Allows for revising earlier thoughts when new information emerges
4. Supports branching into alternative reasoning paths
5. Provides visibility into the full reasoning process
6. Dynamically adjusts the number of steps based on complexity
7. Stores the final documentation in a searchable vector database

## Parameters

| Name                         | Type    | Required | Default | Description                                                                           |
| ---------------------------- | ------- | -------- | ------- | ------------------------------------------------------------------------------------- |
| file                         | string  | Yes      | -       | File path or direct code content to analyze                                           |
| documentation                | string  | No       | -       | Current documentation version (accumulates as thinking progresses)                    |
| chapters                     | array   | No       | -       | Array of chapter titles to include in the documentation                               |
| needToReadAdditionalFiles    | boolean | Yes      | -       | Whether additional files need to be read for context                                  |
| additionalFilesToRead        | array   | No       | -       | Array of file paths to read for additional context                                    |
| needToSearch                 | boolean | Yes      | -       | Whether semantic search is needed                                                     |
| semanticSearch               | object  | No       | -       | Semantic search configuration (Note: parameter name has a typo in the implementation) |
| semanticSearch.collection    | string  | No       | -       | Collection to search in (codebase, documentation, diagram)                            |
| semanticSearch.query         | string  | No       | -       | The search query string                                                               |
| semanticSearch.filter        | object  | No       | -       | Optional filters for the search                                                       |
| thought                      | string  | Yes      | -       | The current thinking step content                                                     |
| nextThoughtNeeded            | boolean | Yes      | -       | Whether another thought step is needed                                                |
| thoughtNumber                | number  | Yes      | -       | Current thought number in sequence                                                    |
| totalThoughts                | number  | Yes      | -       | Estimated total thoughts needed (minimum 3)                                           |
| isRevision                   | boolean | No       | false   | Whether this thought revises previous thinking                                        |
| revisesThought               | number  | No       | -       | Which thought number is being reconsidered                                            |
| branchFromThought            | number  | No       | -       | Branching point thought number                                                        |
| branchId                     | string  | No       | -       | Identifier for the current branch                                                     |
| needsMoreThoughts            | boolean | No       | false   | If more thoughts are needed beyond initial estimate                                   |
| readyToIndexTheDocumentation | boolean | Yes      | -       | Whether documentation is ready to be stored in the database                           |

## Response

The tool returns an object with the following properties:

| Property                       | Type    | Description                                 |
| ------------------------------ | ------- | ------------------------------------------- |
| file                           | string  | The file content being analyzed             |
| contentOfAdditionalFilesToRead | array   | Content of additional files that were read  |
| semanticSearchResult           | array   | Results from semantic search if performed   |
| chapters                       | array   | List of chapter titles in the documentation |
| thoughtNumber                  | number  | The current thought number                  |
| totalThoughts                  | number  | Current estimate of total thoughts needed   |
| nextThoughtNeeded              | boolean | Whether another thought step is needed      |
| branches                       | array   | List of branch identifiers                  |
| thoughtHistoryLength           | number  | Total count of thoughts processed           |

## Database Storage

When `readyToIndexTheDocumentation` is set to `true`, the tool:

1. Generates an embedding for the documentation using the configured embedding provider
2. Creates metadata including file path, type, chapters, and creation date
3. Stores the embedding and metadata in the "documentation" collection in the vector database
4. Makes the documentation searchable via the `search_documentation` tool

This enables semantic search and retrieval of documentation based on meaning, not just keywords.

## Example

**Request (Initial Thought)**:

```json
{
  "name": "generate_documentation",
  "arguments": {
    "file": "/path/to/Button.jsx",
    "documentation": "",
    "chapters": ["Overview", "Props", "Usage Examples"],
    "needToReadAdditionalFiles": false,
    "needToSearch": false,
    "thought": "Let's analyze what kind of documentation we need to generate for the Button component. I'll need to examine the component's props, usage patterns, and possible variations.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 5,
    "readyToIndexTheDocumentation": false
  }
}
```

**Response**:

```json
{
  "file": "// Button component code content...",
  "contentOfAdditionalFilesToRead": undefined,
  "semanticSearchResult": undefined,
  "chapters": ["Overview", "Props", "Usage Examples"],
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 1
}
```

**Final Request (Documentation Ready)**:

````json
{
  "name": "generate_documentation",
  "arguments": {
    "file": "/path/to/Button.jsx",
    "documentation": "# Button Component\n\n## Overview\n\nA versatile button component that supports various styles and states.\n\n## Props\n\n| Prop | Type | Default | Description |\n|------|------|---------|-------------|\n| variant | 'primary' \\| 'secondary' \\| 'outline' | 'primary' | Visual style of the button |\n| size | 'small' \\| 'medium' \\| 'large' | 'medium' | Size of the button |\n| disabled | boolean | false | Whether the button is disabled |\n| onClick | (event: React.MouseEvent) => void | - | Function called when button is clicked |\n| children | React.ReactNode | - | Content to display inside the button |\n\n## Usage Examples\n\n```jsx\n// Primary button (default)\n<Button onClick={handleClick}>Click Me</Button>\n\n// Secondary button\n<Button variant=\"secondary\" size=\"large\">Secondary Action</Button>\n\n// Outline button\n<Button variant=\"outline\" disabled={isDisabled}>Outline Button</Button>\n```",
    "chapters": ["Overview", "Props", "Usage Examples"],
    "needToReadAdditionalFiles": false,
    "needToSearch": false,
    "thought": "I've completed the documentation with all required sections: Overview, Props with detailed type information, and Usage Examples showing different variants. The documentation is now ready to be indexed for future reference.",
    "nextThoughtNeeded": false,
    "thoughtNumber": 5,
    "totalThoughts": 5,
    "readyToIndexTheDocumentation": true
  }
}
````

## File Input Flexibility

The `generate_documentation` tool accepts both file paths and direct code content:

### File Path Input

You can provide a path to an existing file:

```json
{
  "file": "/path/to/component.jsx"
}
```

The tool will:

1. Check if the path exists
2. Load the file content automatically
3. Use that content for documentation analysis

### Direct Code Input

Alternatively, you can provide the code content directly:

```json
{
  "file": "class Button extends React.Component {\n  render() {\n    // Component implementation...\n  }\n}"
}
```

The tool will detect that this is code content rather than a file path and use it directly.

## Implementation Details

The tool is implemented in TypeScript with these key features:

- **Thought History**: Maintains a record of all thinking steps
- **Branching Support**: Allows exploration of alternative documentation approaches
- **Validation**: Ensures all required parameters are provided
- **File Path Detection**: Automatically loads file content when a valid path is provided
- **Vector Database Integration**: Stores completed documentation with embeddings for search
- **Multiple Vector Database Support**: Works with LanceDB, ChromaDB, or Qdrant

### Integration with Vector Database

The documentation tool integrates with the vector database system to store and retrieve documentation:

```typescript
// When documentation is ready to be indexed
if (data.readyToIndexTheDocumentation && data.file && data.documentation) {
  // Import required services
  const { createEmbedding, getEmbeddingDimension } = await import(
    "../services/embeddings.js"
  );
  const { upsertPoints, createPoint, collectionExists, createCollection } =
    await import("../services/vectordb.js");

  // Get embedding dimension from configuration
  const embeddingDimension = getEmbeddingDimension();

  // Ensure collection exists
  if (!(await collectionExists("documentation"))) {
    const created = await createCollection("documentation", embeddingDimension);
    if (!created) {
      throw new Error(`Failed to create collection documentation`);
    }
  }

  // Generate embedding for the documentation content
  const result = await createEmbedding(data.documentation);

  // Create metadata for the document
  const metadata = {
    content: data.documentation,
    filePath: data.file,
    type: "documentation",
    chapters: data.chapters || [],
    createdAt: new Date().toISOString(),
  };

  // Create a point for vector database
  const point = createPoint(
    `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Generate a unique ID
    result.embedding,
    metadata,
  );

  // Add to the documentation collection
  const success = await upsertPoints("documentation", [point]);
}
```

## Example with Additional Files and Search

Here's an example that demonstrates using additional file reading and semantic search:

```json
{
  "name": "generate_documentation",
  "arguments": {
    "file": "/path/to/APIClient.js",
    "documentation": "",
    "chapters": ["Overview", "Configuration", "Methods", "Error Handling"],
    "needToReadAdditionalFiles": true,
    "additionalFilesToRead": [
      "/path/to/APIConfig.js",
      "/path/to/ErrorHandler.js"
    ],
    "needToSearch": true,
    "semanticSearch": {
      "collection": "documentation",
      "query": "REST API client patterns",
      "filter": {
        "directory": "/api"
      }
    },
    "thought": "I need to generate documentation for the API client. Let me read the configuration and error handling files for context, and search for existing API patterns we might want to align with.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 7,
    "readyToIndexTheDocumentation": false
  }
}
```

## Usage Patterns

The sequential thinking approach is particularly useful for:

1. **Complex Codebases**: When documentation requires deep understanding of interdependent components
2. **Exploratory Analysis**: When the structure of the documentation needs to be discovered through analysis
3. **Incremental Building**: When documentation should be built up in logically connected steps
4. **Documentation with Chapters**: When the documentation should include distinct, organized sections
5. **Searchable Knowledge Base**: When documentation should be stored for later retrieval and search

## Related Tools

- [Search Documentation](./search-documentation.md) - For searching indexed documentation using semantic search
- [Generate Diagram](./generate-diagram.md) - Also uses sequential thinking for diagram generation
- [Explain Code](./explain-code.md) - For explaining specific code snippets in detail
- [Index File](./index-file.md) - For indexing code files in the vector database
