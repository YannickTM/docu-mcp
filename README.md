# DocuMCP

🤖 **An MCP server for intelligent code documentation generation with RAG capabilities**

DocuMCP enables Claude to generate, search, and manage documentation for your codebase using vector embeddings and semantic search. It provides tools for creating user guides, technical documentation, code explanations, and architectural diagrams.

## ✨ Features

- 📚 Generate and update documentation based on your codebase
- 🔍 Semantic search across code, documentation, and diagrams
- 📊 Create and merge architectural diagrams
- 📝 Generate user guides
- 💾 Support for multiple vector databases (LanceDB, ChromaDB, Qdrant)
- 🧠 Flexible embedding providers (built-in or Ollama)

## 🚀 Quick Start

### Installation via NPX (Recommended)

The easiest way to use DocuMCP is to configure Claude Desktop with the published npm package:

Add the following to your Claude Desktop configuration:

- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "docu-mcp": {
      "command": "npx",
      "args": ["@myjungle/docu-mcp-server"]
    }
  }
}
```

That's it! Restart Claude Desktop and DocuMCP will be available.

### Alternative Installation Methods

#### Using Smithery CLI

Install the server via Smithery CLI:

```bash
# Install Smithery CLI if you don't have it
npm install -g @smithery/cli

# Then install the Docu MCP server
npx -y @smithery/cli@latest install @YannickTM/docu-mcp --client claude
```

## 🚀 Manual Start

### 1. Clone and Install

```bash
git clone https://github.com/YannickTM/docu-mcp
cd docu-mcp
npm install
```

### 2. Build the MCP Server

```bash
cd mcp
npm run build
cd ..
```

### 3. Advanced Configuration

Add the following to your Claude Desktop configuration:

- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "docuassistant": {
      "command": "node",
      "env": {
        "VECTOR_DB_PROVIDER": "qdrant",
        "QDRANT_URL": "http://localhost:6333",
        "EMBEDDING_PROVIDER": "ollama",
        "EMBEDDING_MODEL": "bge-m3:latest",
        "EMBEDDING_DIMENSION": "1024",
        "OLLAMA_URL": "http://localhost:11434"
      },
      "args": ["/absolute/path/to/DocuMCP/mcp/dist/index.js"]
    }
  }
}
```

### 4. Start Required Services (if using external providers)

#### For Qdrant:

```bash
cd qdrant
npm run start
```

#### For ChromaDB:

```bash
cd chromadb
npm run start
```

### 5. Restart Claude Desktop

Restart Claude Desktop to load the new configuration.

## 🛠️ Configuration Options

### Vector Database Providers

| Provider     | Description                         | Configuration                                                      |
| ------------ | ----------------------------------- | ------------------------------------------------------------------ |
| **LanceDB**  | File-based local database (default) | `VECTOR_DB_PROVIDER=lance`<br/>`LANCE_PATH=~/lanceDB`              |
| **ChromaDB** | Simple vector database with web UI  | `VECTOR_DB_PROVIDER=chroma`<br/>`CHROMA_URL=http://localhost:8000` |
| **Qdrant**   | Production-grade vector database    | `VECTOR_DB_PROVIDER=qdrant`<br/>`QDRANT_URL=http://localhost:6333` |

### Embedding Providers

| Provider     | Description                           | Configuration                                                                                                                          |
| ------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Built-in** | Uses all-MiniLM-L6-v2 model (default) | `EMBEDDING_PROVIDER=buildin`<br/>`EMBEDDING_MODEL=all-MiniLM-L6-v2`<br/>`EMBEDDING_DIMENSION=384`                                      |
| **Ollama**   | Use any Ollama model                  | `EMBEDDING_PROVIDER=ollama`<br/>`EMBEDDING_MODEL=bge-m3:latest`<br/>`EMBEDDING_DIMENSION=1024`<br/>`OLLAMA_URL=http://localhost:11434` |

## 🔧 Available Tools

DocuMCP provides the following tools to Claude:

- 📁 **File Operations**: `read_file`, `write_file`, `create_directory`, `read_directory`
- 🔎 **Search Tools**: `search_codebase`, `search_documentation`, `search_diagram`, `search_user_guide`
- 📚 **Documentation**: `generate_documentation`, `generate_user_guide`, `explain_code`
- 📊 **Diagrams**: `generate_diagram`, `merge_diagram`
- 🗃️ **Indexing**: `index_file`, `index_directory`
- 🔀 **Merging**: `merge_documentation`

## 📋 Requirements

- Node.js 20.11.24+
- Claude Desktop
- (Optional) Docker for running external vector databases

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️
