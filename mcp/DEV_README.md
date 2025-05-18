# DocuMCP Server

A Model Context Protocol (MCP) server for intelligent code documentation generation with Retrieval-Augmented Generation (RAG) capabilities.

## Features

- **Multiple Vector Database Support**:

  - LanceDB (default): Fast local vector database
  - ChromaDB: Simple vector database with user-friendly interface
  - Qdrant: Scalable vector database for production environments

- **Modular Embedding Providers**:

  - Built-in embeddings (default): Using the BGE-M3 model
  - Ollama integration: For custom embedding models

- **Documentation Tools**:

  - Generate documentation for code files and directories
  - Search through documentation with semantic queries
  - Create and improve user guides automatically
  - Generate diagrams for visual documentation

- **File System Management**:
  - Robust file operations with error handling
  - Directory traversal and filtering
  - File metadata extraction

## Quick Start

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server in development mode
npm run dev

# Start the server in production mode
npm run start

# Run the example client
npm run client
```

## Project Structure

```
mcp/
├── src/
│   ├── index.ts                  # Server entry point
│   ├── client-example.ts         # Example client
│   ├── services/                 # Core services
│   │   ├── endpoints/            # Service providers
│   │   │   ├── db-chroma.ts      # ChromaDB integration
│   │   │   ├── db-lance.ts       # LanceDB integration
│   │   │   ├── db-qdrant.ts      # Qdrant integration
│   │   │   ├── embeddings-buildin.ts  # Built-in embeddings
│   │   │   └── embeddings-ollama.ts   # Ollama integration
│   │   ├── schemas/              # Data schemas
│   │   │   ├── code-chunks.ts    # Code fragments schema
│   │   │   ├── documentation.ts  # Documentation schema
│   │   │   ├── diagrams.ts       # Diagrams schema
│   │   │   ├── types.ts          # Common types
│   │   │   └── index.ts          # Schema registry
│   │   ├── embeddings.ts         # Embedding service
│   │   ├── filesystem.ts         # Filesystem operations
│   │   └── vectordb.ts           # Vector database service
│   └── tools/                    # MCP Tools
│       ├── CreateDirTool.ts
│       ├── ExplainCodeTool.ts
│       ├── GenerateDiagramTool.ts
│       ├── GenerateDocumentationTool.ts
│       ├── GenerateUserGuideTool.ts
│       ├── ImproveUserGuideTool.ts
│       ├── IndexDirTool.ts
│       ├── IndexFileTool.ts
│       ├── ReadDirTool.ts
│       ├── ReadFileTool.ts
│       ├── SearchCodebaseTool.ts
│       ├── SearchDiagramTool.ts
│       ├── SearchDocumentationTool.ts
│       └── WriteFileTool.ts
├── dist/                         # Compiled output
├── package.json
└── tsconfig.json
```

## Configuration

The server can be configured using environment variables:

```bash
# Set the vector database provider
VECTOR_DB_PROVIDER=lance  # Options: lance, chroma, qdrant

# Set the embedding provider
EMBEDDING_PROVIDER=buildin  # Options: buildin, ollama

# Set the embedding model
EMBEDDING_MODEL=bge-m3

# Set the embedding dimension
EMBEDDING_DIMENSION=1024
```

## Using with Claude Desktop

### Local Development

Add this configuration to your Claude Desktop config file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "docu-mcp-server": {
      "command": "node",
      "env": {
        "<ENV_NAME>":<value>
      }
      "args":["/absolute/path/to/docu-mcp-server/dist/index.js"]
    }
  }
}
```

## Learn More

- [Project Documentation](http://localhost:4000)
- [MCP Framework Documentation](https://mcp-framework.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
