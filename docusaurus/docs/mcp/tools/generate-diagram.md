---
sidebar_position: 9
---

# Generate Diagram

The `generate_diagram` tool creates visual diagrams of code architecture and component relationships using a sequential thinking approach, with support for vector database storage.

## Overview

This tool provides capabilities to:

- Generate diagrams through a sequential thinking process
- Break down complex visualization tasks into logical steps
- Support multi-stage analysis and diagram refinement
- Allow for revision and branching of thoughts
- Dynamically adjust the complexity of the diagram
- Accept file paths or direct code content for analysis
- Store diagrams in the vector database for later retrieval
- Support various diagram types using mermaid.js syntax

## Sequential Thinking Approach

The Generate Diagram tool uses the same sequential thinking methodology as the Documentation Generator:

1. Breaks down complex diagramming tasks into logical steps
2. Builds understanding progressively through numbered thoughts
3. Allows for revising earlier thoughts when new insights emerge
4. Supports branching into alternative diagramming approaches
5. Provides visibility into the full reasoning process
6. Dynamically adjusts the depth and scope based on complexity

## Parameters

| Name                      | Type    | Required | Default | Description                                                                                                   |
| ------------------------- | ------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| file                      | string  | Yes      | -       | File path or direct code content to analyze                                                                   |
| diagramType               | string  | Yes      | -       | Type of diagram to generate (flowchart, sequenceDiagram, classDiagram, stateDiagram, conceptMap, treeDiagram) |
| needToReadAdditionalFiles | boolean | Yes      | -       | Whether additional files need to be read for context                                                          |
| additionalFilesToRead     | array   | No       | -       | Array of file paths to read for additional context                                                            |
| needToSearch              | boolean | Yes      | -       | Whether semantic search is needed                                                                             |
| semanticSearch            | object  | No       | -       | Semantic search configuration (Note: parameter name has a typo in the implementation)                         |
| semanticSearch.collection | string  | No       | -       | Collection to search in (codebase, documentation, diagram)                                                    |
| semanticSearch.query      | string  | No       | -       | The search query string                                                                                       |
| semanticSearch.filter     | object  | No       | -       | Optional filters for the search                                                                               |
| diagramElements           | array   | No       | -       | Array of elements for the diagram (nodes, edges, containers, annotations)                                     |
| diagram                   | string  | No       | -       | The current diagram content in mermaid.js syntax                                                              |
| thought                   | string  | Yes      | -       | The current thinking step content                                                                             |
| nextThoughtNeeded         | boolean | Yes      | -       | Whether another thought step is needed                                                                        |
| thoughtNumber             | number  | Yes      | -       | Current thought number in sequence                                                                            |
| totalThoughts             | number  | Yes      | -       | Estimated total thoughts needed (minimum 3)                                                                   |
| isRevision                | boolean | No       | false   | Whether this thought revises previous thinking                                                                |
| revisesThought            | number  | No       | -       | Which thought number is being reconsidered                                                                    |
| branchFromThought         | number  | No       | -       | Branching point thought number                                                                                |
| branchId                  | string  | No       | -       | Identifier for the current branch                                                                             |
| needsMoreThoughts         | boolean | No       | false   | If more thoughts are needed beyond initial estimate                                                           |
| readyToIndexTheDiagram    | boolean | Yes      | -       | Whether the diagram is ready to be indexed in the vector database                                             |

## Response

The tool returns an object with the following properties:

| Property                       | Type    | Description                                |
| ------------------------------ | ------- | ------------------------------------------ |
| file                           | string  | The file content being analyzed            |
| contentOfAdditionalFilesToRead | array   | Content of additional files that were read |
| semanticSearchResult           | array   | Results from semantic search if performed  |
| diagramType                    | string  | The type of diagram being generated        |
| diagramElementsLength          | number  | Count of diagram elements defined          |
| thoughtNumber                  | number  | The current thought number                 |
| totalThoughts                  | number  | Current estimate of total thoughts needed  |
| nextThoughtNeeded              | boolean | Whether another thought step is needed     |
| branches                       | array   | List of branch identifiers                 |
| thoughtHistoryLength           | number  | Total count of thoughts processed          |

## Vector Database Integration

When `readyToIndexTheDiagram` is set to `true` and the diagram is complete, the tool:

1. Generates an embedding for the diagram content using the embedding service
2. Creates metadata with file path, diagram type, and diagram elements
3. Stores the diagram in the vector database collection "diagrams"
4. Enables the diagram to be searched and retrieved later

This integration allows for:

- Searching diagrams by content similarity
- Finding diagrams related to specific code components
- Retrieving diagrams for specific diagram types

## Example

**Request (Initial Thought)**:

```json
{
  "name": "generate_diagram",
  "arguments": {
    "file": "/path/to/AuthService.js",
    "diagramType": "sequenceDiagram",
    "needToReadAdditionalFiles": false,
    "needToSearch": false,
    "diagramElements": [],
    "diagram": "",
    "thought": "I'll start by analyzing what kind of diagram would be most appropriate for visualizing the authentication flow. Since we're dealing with interactions between components over time, a sequence diagram would be most suitable.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 5,
    "readyToIndexTheDiagram": false
  }
}
```

**Response**:

```json
{
  "file": "// AuthService code content...",
  "contentOfAdditionalFilesToRead": undefined,
  "semanticSearchResult": undefined,
  "diagramType": "sequenceDiagram",
  "diagramElementsLength": 0,
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true,
  "branches": [],
  "thoughtHistoryLength": 1
}
```

**Request (Middle Thought)**:

```json
{
  "name": "generate_diagram",
  "arguments": {
    "file": "/path/to/AuthService.js",
    "diagramType": "sequenceDiagram",
    "needToReadAdditionalFiles": false,
    "needToSearch": false,
    "diagramElements": [
      {
        "id": "user",
        "type": "node",
        "label": "User",
        "properties": {}
      },
      {
        "id": "authService",
        "type": "node",
        "label": "AuthService",
        "properties": {}
      }
    ],
    "diagram": "sequenceDiagram\n  participant User\n  participant AuthService",
    "thought": "Now I need to identify the key components involved in the authentication flow. From my analysis, I can see we have User, AuthService, and Database as the main participants.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 2,
    "totalThoughts": 5,
    "readyToIndexTheDiagram": false
  }
}
```

**Request (Final Thought)**:

```json
{
  "name": "generate_diagram",
  "arguments": {
    "file": "/path/to/AuthService.js",
    "diagramType": "sequenceDiagram",
    "needToReadAdditionalFiles": false,
    "needToSearch": false,
    "diagramElements": [
      {
        "id": "user",
        "type": "node",
        "label": "User",
        "properties": {}
      },
      {
        "id": "authService",
        "type": "node",
        "label": "AuthService",
        "properties": {}
      },
      {
        "id": "db",
        "type": "node",
        "label": "DB",
        "properties": {}
      },
      {
        "id": "login",
        "type": "edge",
        "label": "Login Request",
        "properties": {},
        "source": "user",
        "target": "authService"
      },
      {
        "id": "verify",
        "type": "edge",
        "label": "Verify Credentials",
        "properties": {},
        "source": "authService",
        "target": "db"
      }
    ],
    "diagram": "sequenceDiagram\n  participant User\n  participant AuthService\n  participant DB\n  User->>+AuthService: Login Request\n  AuthService->>+DB: Verify Credentials\n  DB-->>-AuthService: User Data\n  AuthService-->>-User: JWT Token",
    "thought": "The sequence diagram is now complete. It shows the full authentication flow starting with the user login request, credential verification against the database, and returning the JWT token upon successful authentication.",
    "nextThoughtNeeded": false,
    "thoughtNumber": 5,
    "totalThoughts": 5,
    "readyToIndexTheDiagram": true
  }
}
```

## File Input Flexibility

The `generate_diagram` tool offers flexibility in how you provide the code to analyze:

### File Path Input

You can provide a path to an existing file:

```json
{
  "name": "generate_diagram",
  "arguments": {
    "file": "/path/to/component.jsx"
    // Other parameters...
  }
}
```

The tool will:

1. Check if the path exists
2. Load the file content automatically
3. Use that content for diagram analysis

### Direct Code Input

Alternatively, you can provide the code content directly:

```json
{
  "name": "generate_diagram",
  "arguments": {
    "file": "class AuthService {\n  login(credentials) {\n    // Authentication logic...\n  }\n}"
    // Other parameters...
  }
}
```

When direct code is provided, the tool:

1. Attempts to detect if the string is a valid path
2. If not, it treats the content as direct code for analysis
3. Proceeds with the diagramming process

This flexibility means you can diagram code that:

- Exists in your codebase
- Is being developed but not yet saved
- Is provided by other tools or generators

## Supported Diagram Types

The tool supports multiple diagram types using mermaid.js syntax:

### Component Diagrams (flowchart)

```
graph TD
  A[Main] --> B[Component1]
  A --> C[Component2]
  B --> D[Subcomponent1]
  B --> E[Subcomponent2]
  C --> F[Subcomponent3]
```

### Sequence Diagrams (sequenceDiagram)

```
sequenceDiagram
  participant User
  participant AuthService
  participant DB
  User->>+AuthService: Login Request
  AuthService->>+DB: Verify Credentials
  DB-->>-AuthService: User Data
  AuthService-->>-User: JWT Token
```

### Class Diagrams (classDiagram)

```
classDiagram
  class AuthService {
    +String tokenSecret
    -Number expiryTime
    +generateToken()
    -validateToken()
  }
  class User {
    +login()
    +logout()
  }
  AuthService --> User
```

### State Diagrams (stateDiagram)

```
stateDiagram-v2
  [*] --> Idle
  Idle --> Authenticating: Login Attempt
  Authenticating --> Authenticated: Success
  Authenticating --> Failed: Error
  Failed --> Idle: Retry
  Authenticated --> Idle: Logout
```

### Concept Maps (conceptMap)

```
graph TD
  A[Authentication] -->|involves| B[Credentials]
  A -->|provides| C[Security]
  B -->|includes| D[Username]
  B -->|includes| E[Password]
  C -->|prevents| F[Unauthorized Access]
```

### Tree Diagrams (treeDiagram)

```
graph TD
  A[Root] -->|contains| B[Branch1]
  A -->|contains| C[Branch2]
  B -->|contains| D[Leaf1]
  B -->|contains| E[Leaf2]
  C -->|contains| F[Leaf3]
```

## Implementation Details

The `GenerateDiagramTool` is implemented in `/mcp/src/tools/GenerateDiagramTool.ts`. Key implementation features include:

- Maintains a history of thoughts for tracking the diagram creation process
- Supports branching for exploring alternative diagram approaches
- Validates thought data to ensure proper sequencing
- Formats thought presentation for console display
- Supports revisions to earlier thoughts
- Dynamically adjusts total thought count as needed
- Smart file path detection and content loading
- Integrates with the vector database for storing diagrams
- Generates embeddings for diagram content to enable semantic search

## Diagram Element Structure

The `diagramElements` parameter accepts an array of objects with the following structure:

```json
{
  "id": "unique_id",
  "type": "node|edge|container|annotation",
  "label": "Display Label",
  "properties": {
    "key1": "value1",
    "key2": "value2"
  },
  "source": "source_id", // For edges
  "target": "target_id", // For edges
  "contains": ["child_id1", "child_id2"] // For containers
}
```

These elements help track the diagram structure during the sequential thinking process.

## Additional Features Example

Here's an example that demonstrates the use of additional file reading and semantic search:

**Request with Additional Files and Semantic Search**:

```json
{
  "name": "generate_diagram",
  "arguments": {
    "file": "/path/to/OrderService.js",
    "diagramType": "flowchart",
    "needToReadAdditionalFiles": true,
    "additionalFilesToRead": [
      "/path/to/PaymentService.js",
      "/path/to/InventoryService.js"
    ],
    "needToSearch": true,
    "semanticSearch": {
      "collection": "documentation",
      "query": "order processing workflow",
      "filter": {
        "directory": "/services"
      }
    },
    "diagramElements": [],
    "diagram": "",
    "thought": "I need to understand the entire order processing flow which involves multiple services. Let me read the additional services and search for existing documentation about the workflow.",
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 7,
    "readyToIndexTheDiagram": false
  }
}
```

## Diagram Creation Process

The sequential thinking approach to diagram creation typically follows these steps:

1. **Diagram Type Selection**: Determining the most appropriate diagram type for the visualization need
2. **Component Identification**: Identifying the key components, actors, or entities to include
3. **Relationship Analysis**: Determining how components relate to or interact with each other
4. **Layout Planning**: Organizing components for optimal visual clarity
5. **Detail Addition**: Adding detailed information such as method names, parameters, or labels
6. **Refinement**: Improving the diagram based on new insights or clarity needs
7. **Finalization**: Completing the diagram with all necessary elements
8. **Indexing**: Storing the diagram in the vector database for future retrieval

## Related Tools

- [Generate Documentation](./generate-documentation.md) - Also uses sequential thinking for documentation generation
- [Search Diagram](./search-diagram.md) - For finding previously generated diagrams
- [Explain Code](./explain-code.md) - For understanding the code to be diagrammed
