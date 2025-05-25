---
sidebar_position: 2
---

# Getting Started

This guide will help you set up and run DocuMCP on your local machine.

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v20 or higher)
- [npm](https://www.npmjs.com/) (v8 or higher)
- [TypeScript](https://www.typescriptlang.org/) (v5 or higher)
- [Docker](https://www.docker.com/) and Docker Compose (optional - only needed for Qdrant)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/YannickTM/docu-mcp.git
   cd docu-mcp
   ```

2. **Select a Vector Database**

   DocuMCP supports multiple vector databases:

   - **LanceDB** (default): Fast local vector database, no additional setup required
   - **ChromaDB**: Simple vector database with user-friendly interface
   - **Qdrant**: Scalable vector database for production environments

   ### Option A: Using LanceDB (Default)

   No additional setup required. LanceDB runs locally and stores data in the `lancedb_data` directory.

   ### Option B: Using ChromaDB

   Start ChromaDB using the provided npm script:

   ```bash
   cd mcp
   npm run pip:chroma
   ```

   This starts ChromaDB and stores data in the `chromadb_data` directory.

   ### Option C: Using Qdrant

   Start the Qdrant container using Docker Compose:

   ```bash
   cd qdrant
   docker-compose up -d
   ```

   This will start Qdrant on port 6333 (REST API) and 6334 (GRPC).

3. **Install dependencies**

   ```bash
   cd mcp
   npm install
   ```

4. **Build the project**

   ```bash
   npm run build
   ```

## Configuration

DocuMCP can be configured using environment variables:

```bash
# Set the vector database provider
VECTOR_DB_PROVIDER=lance  # Options: lance, chroma, qdrant

# Set the embedding provider
EMBEDDING_PROVIDER=buildin  # Options: buildin, ollama

# Set the embedding model (for built-in provider)
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Set the embedding dimension
EMBEDDING_DIMENSION=1024
```

## Running DocuMCP

You can run DocuMCP in different ways:

### 1. Development Mode

```bash
npm run dev
```

This starts the server in watch mode, which automatically recompiles when you make changes.

### 2. Production Mode

```bash
npm run start
```

This runs the compiled server in production mode.

### 3. Test with Example Client

```bash
npm run client
```

This runs a simple client that connects to the server and demonstrates basic functionality.

### 4. Claude Desktop Integration

One of the easiest ways to use DocuMCP is through Claude Desktop, which supports the Model Context Protocol for local tool execution.

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "docu-mcp-server": {
      "command": "node",
      "env": {
        "VECTOR_DB_PROVIDER": "lance",
        "EMBEDDING_PROVIDER": "buildin"
      },
      "args": ["/absolute/path/to/docu-mcp-server/dist/index.js"]
    }
  }
}
```

## Key Features

DocuMCP offers several powerful features:

- **Multiple Vector Database Support**: Choose between LanceDB, ChromaDB, or Qdrant
- **Modular Embedding Providers**: Use built-in embeddings or integrate with Ollama
- **Documentation Generation**: Generate comprehensive documentation for code files
- **Diagram Creation**: Create visual diagrams for code components and relationships
- **Semantic Search**: Search code and documentation using natural language
- **File System Management**: Robust file operations with error handling

## Next Steps

Once you have DocuMCP up and running, you can:

- [Understand the MCP protocol](./fundamentals/mcp.md)
- [Learn about the RAG implementation](./fundamentals/rag.md)
- [Explore the available tools](./mcp/tools/)
