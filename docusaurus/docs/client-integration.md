---
sidebar_position: 4
---

# Client Integration

## Connecting to DocuMCP

DocuMCP is designed to be easily integrated with any MCP-compatible client. This guide demonstrates how to connect to the DocuMCP server and use its tools.

## Integration Methods

You can integrate with DocuMCP in several ways:

### 1. Claude Desktop Integration

One of the easiest ways to use DocuMCP is through Claude Desktop, which supports the Model Context Protocol for local tool execution.

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "docu-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/docu-mcp-server/dist/index.js"]
    }
  }
}
```

### 2. Programmatic Client

You can also connect programmatically using the TypeScript MCP client library with a stdio transport:

```typescript
import { Client } from "@modelcontextprotocol/sdk";
import { SpawnClientTransport } from "@modelcontextprotocol/sdk";

async function connectToDocuMCP() {
  // Create a client with spawn transport
  const client = new Client({
    transport: new SpawnClientTransport({
      command: "node",
      args: ["/path/to/mcp/dist/index.js"],
    }),
  });

  await client.connect();

  // List available tools
  const tools = await client.listTools();
  console.log("Available tools:", tools);

  // Execute a tool
  const result = await client.executeTool("read_file", {
    filePath: "/path/to/file.js",
  });

  console.log("Result:", result);
}

connectToDocuMCP();
```

## Available Tools

DocuMCP provides the following categories of tools:

### File System Tools

- `read_file`: Read file content with metadata
- `write_file`: Write content to files
- `read_directory`: List directory contents
- `create_directory`: Create directories

### RAG Tools

- `explain_code`: Analyze and explain code step-by-step
- `generate_documentation`: Create documentation with sequential thinking
- `generate_diagram`: Produce visual diagrams of code architecture

### Search Tools

- `index_file`: Index individual file content into the vector database
- `index_directory`: Index all files in a directory (with filtering)
- `search_codebase`: Perform semantic code search with filters

## Using RAG Capabilities

To utilize the RAG (Retrieval Augmented Generation) capabilities of DocuMCP, follow these steps:

### 1. Index Your Codebase

First, index your codebase to make it searchable:

```typescript
// Index a single file
const indexFileResult = await client.executeTool("index_file", {
  filePath: "/path/to/important/file.js",
});

// Index an entire directory
const indexDirResult = await client.executeTool("index_directory", {
  dirPath: "/path/to/src",
  recursive: true,
  fileExtensions: [".js", ".ts"],
});
```

### 2. Perform Semantic Searches

Once indexed, you can perform semantic searches:

```typescript
// Search the codebase for relevant code
const searchResult = await client.executeTool("search_codebase", {
  query: "authentication implementation",
  limit: 5,
  extension: [".js", ".ts"],
  directory: "src/auth",
});
```

## Environment Configuration

DocuMCP supports configuration through environment variables:

| Variable                 | Description                                   | Default                  |
| ------------------------ | --------------------------------------------- | ------------------------ |
| `EMBEDDING_PROVIDER`     | Provider for embeddings ('local' or 'ollama') | `local`                  |
| `LOCAL_EMBEDDING_MODEL`  | Model name for local embeddings               | `all-MiniLM-L6-v2`       |
| `OLLAMA_EMBEDDING_MODEL` | Model name for Ollama embeddings              | `nomic-embed-text`       |
| `OLLAMA_API_URL`         | URL for Ollama API                            | `http://localhost:11434` |
| `QDRANT_URL`             | URL for Qdrant vector database                | `http://localhost:6333`  |

You can set these variables in a `.env` file at the project root.

## Example Workflow

Here's an example workflow for generating documentation with RAG:

1. Index your codebase for context:

   ```
   await client.executeTool('index_directory', { dirPath: 'src', recursive: true });
   ```

2. Search for relevant modules to document:

   ```
   const results = await client.executeTool('search_codebase', { query: 'authentication system' });
   ```

3. Generate documentation with the retrieved context:
   ```
   await client.executeTool('generate_documentation', {
     filePath: results.results[0].filePath,
     outputPath: 'docs/authentication.md'
   });
   ```

This workflow ensures that the documentation generation has access to relevant code context from the entire codebase, resulting in more comprehensive and accurate documentation.
