---
sidebar_position: 1
title: Overview
---

# MCP Tools 

DocuMCP provides a set of tools that can be called by MCP clients to perform specific actions. These tools are designed for various tasks including file operations, search, code analysis, documentation generation, and diagram creation.

## Current Implementation Status

DocuMCP is under active development, with the following tools currently implemented:

- **Read File**: Reads content from files with metadata support
- **Write File**: Writes content to files with configurable options
- **Read Directory**: Lists directory contents with filtering options
- **Create Directory**: Creates new directories with recursive support
- **Index File**: Indexes a file in the vector database for efficient search
- **Index Directory**: Recursively indexes files in a directory for semantic search
- **Search Codebase**: Performs semantic search across indexed code
- **Generate Documentation**: Creates documentation with sequential thinking
- **Search Documentation**: Retrieves previously generated documentation by semantic search
- **Generate Diagram**: Creates diagrams with sequential thinking approach
- **Search Diagrams**: Retrieves previously generated diagrams by semantic search
- **Explain Code**: Analyzes code with sequential thinking approach

Additional tools are in development and will be implemented in future releases.

## Tool Categories

The MCP tools are organized into the following categories:

### File System Tools

Tools for interacting with the filesystem:

- [Read File](./read-file.md): Reads file content with options for encoding and metadata
- [Write File](./write-file.md): Writes content to files with directory creation and overwrite options
- [Read Directory](./read-directory.md): Lists directory contents with recursive and filtering capabilities
- [Create Directory](./create-directory.md): Creates new directories with recursive creation support
- [Index File](./index-file.md): Indexes a file in the vector database for semantic search
- [Index Directory](./index-directory.md): Recursively indexes a directory for search capabilities

### Search Tools

Tools for searching the codebase, documentation, and diagrams:

- [Search Codebase](./search-codebase.md): Searches code using semantic, keyword, or hybrid approaches
- [Search Documentation](./search-documentation.md): Retrieves documentation using semantic search
- [Search Diagrams](./search-diagram.md): Retrieves previously generated diagrams using semantic search

### Documentation Tools

Tools for documentation generation and visualization:

- [Generate Documentation](./generate-documentation.md): Creates comprehensive documentation using sequential thinking
- [Explain Code](./explain-code.md): Analyzes and explains code using sequential thinking
- [Generate Diagram](./generate-diagram.md): Creates architecture or flow diagrams with sequential thinking

## Vector Database Integration

Many of DocuMCP's tools integrate with a vector database for efficient semantic search:

- **Indexing**: Tools like `index_file` and `index_directory` store code chunks with vector embeddings
- **Searching**: `search_codebase`, `search_documentation`, and `search_diagrams` leverage these embeddings for semantic search
- **Storage**: `generate_documentation` and `generate_diagram` store their outputs for later retrieval

The vector database integration supports multiple backends:
- **ChromaDB**: In-memory and persistent vector database with hybrid search
- **LanceDB**: High-performance columnar database optimized for vector search
- **Qdrant**: Production-ready vector database with filtering capabilities

## Embedding Generation

Text is converted to vector embeddings using:
- **Built-in**: Lightweight embedding models like MiniLM for local processing
- **Ollama**: Integration with local Ollama models for higher-quality embeddings
- **Optional API-based**: Support for external embedding services (configurable)

## Implementation Details

All tools follow a consistent pattern:

- Each tool is implemented as a class with a standardized interface
- Inputs are validated using schemas to ensure proper parameters
- Tools include proper error handling with informative messages
- Documentation includes parameters, response format, and examples
- Many tools use sequential thinking for complex reasoning processes

```typescript
// Example tool implementation structure
class ToolImplementation {
  // Process the input and perform the tool's function
  async processOperation(input: any) {
    try {
      // Validate input
      if (!input.requiredParam) {
        throw new Error("Required parameter missing");
      }
      
      // Perform the operation
      const result = await this.performOperation(input);
      
      // Return successful response
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      // Return error response
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                status: "failed"
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
  }
}
```

## Sequential Thinking Approach

Several tools use a sequential thinking approach for complex tasks:

- **Generate Documentation**: Multi-step reasoning for comprehensive documentation
- **Generate Diagram**: Progressive thinking for diagram creation and refinement
- **Explain Code**: Step-by-step code analysis and explanation

This approach enables:
- Breaking complex tasks into logical steps
- Building understanding progressively
- Revising earlier thoughts when new insights emerge
- Branching into alternative approaches
- Dynamic adjustment based on complexity

## MCP Server Integration

The tools are registered with the MCP server in `/mcp/src/index.ts`:

```typescript
// Initialize tools
const readFileTool = new ReadFileTool();
const writeFileTool = new WriteFileTool();
const readDirTool = new ReadDirTool();
const createDirTool = new CreateDirTool();
const indexFileTool = new IndexFileTool();
const indexDirTool = new IndexDirTool();
const searchCodebaseTool = new SearchCodebaseTool();
const explainCodeTool = new CodeExplainer();
const generateDiagramTool = new DigramGenerator();
const searchDiagramTool = new SearchDiagramTool();
const searchDocumentationTool = new SearchDocumentationTool();
const generateDocumentationTool = new DocumentationGenerator();

// Register tools in the request handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    CODE_EXPLAIN_TOOL,
    DIAGRAM_TOOL,
    DOCUMENTATION_TOOL,
    READ_DIR_TOOL,
    WRITE_FILE_TOOL,
    CREATE_DIR_TOOL,
    READ_FILE_TOOL,
    INDEX_FILE_TOOL,
    INDEX_DIR_TOOL,
    SEARCH_CODEBASE_TOOL,
    SEARCH_DIAGRAM_TOOL,
    SEARCH_DOCUMENTATION_TOOL
  ],
}));
```

Tools are then dispatched in the `CallToolRequestSchema` handler to their respective implementation methods.