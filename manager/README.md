# DocuMCP Manager

🤖 **An MCP supervisor server for coordinating documentation generation agents**

DocuMCP Manager is a specialized MCP server designed to coordinate multiple Claude Code sub-agents that use the DocuMCP server for documentation generation. It provides tools for managing documentation workflows across large codebases using shared vector databases and semantic search.

## ✨ Features

- 🎯 Coordinate multiple documentation generation agents
- 🔍 Semantic search across code, documentation, and diagrams
- 📁 File operations and directory management
- 🗃️ Shared vector database across all agents
- 💾 Support for multiple vector databases (LanceDB, ChromaDB, Qdrant)
- 🧠 Flexible embedding providers (built-in or Ollama)

## 🚀 Quick Start

### Installation

The DocuMCP Manager server is designed to work alongside the main DocuMCP server. First ensure you have the DocuMCP server set up, then add the Manager server.

Add the following to your Claude Desktop configuration:

- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "docu-mcp-manager": {
      "command": "node",
      "env": {
        "VECTOR_DB_PROVIDER": "lance",
        "LANCE_PATH": "~/shared-lanceDB",
        "EMBEDDING_PROVIDER": "buildin"
      },
      "args": ["/absolute/path/to/DocuMCP/manager/dist/index.js"]
    }
  }
}
```

**Important**: Ensure the Manager server uses the same vector database configuration as your DocuMCP sub-agents to enable shared access.

## 🚀 Manual Setup

### 1. Build the Manager Server

From the DocuMCP monorepo root:

```bash
cd manager
npm install
npm run build
```

### 2. Configure Shared Vector Database

For agent coordination, all agents must share the same vector database:

#### Example with Qdrant (Production):

```json
{
  "mcpServers": {
    "docu-mcp-manager": {
      "command": "node",
      "env": {
        "VECTOR_DB_PROVIDER": "qdrant",
        "QDRANT_URL": "http://localhost:6333",
        "EMBEDDING_PROVIDER": "ollama",
        "EMBEDDING_MODEL": "bge-m3:latest",
        "EMBEDDING_DIMENSION": "1024",
        "OLLAMA_URL": "http://localhost:11434"
      },
      "args": ["/absolute/path/to/DocuMCP/manager/dist/index.js"]
    }
  }
}
```

### 3. Start Required Services (if using external providers)

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

### 4. Restart Claude Desktop

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

The Manager server provides these tools for coordinating documentation workflows:

- 📁 **File Operations**: `read_file`, `write_file`, `create_directory`, `read_directory`
- 🔎 **Search Tools**: `search_codebase`, `search_documentation`, `search_diagram`, `search_user_guide`
- 🗃️ **Indexing**: `index_file`, `index_directory`
- 🗑️ **Management**: `remove_index_collection`

**Note**: The manager server currently shares the same tool set as DocuMCP. Future versions will add agent coordination tools.

## 🎯 Agent Coordination Strategy

The Manager server is designed to coordinate multiple sub-agents:

1. **Shared Database**: All agents use the same vector database instance
2. **Task Distribution**: Manager assigns documentation tasks to sub-agents
3. **Result Aggregation**: Sub-agent outputs are collected in the shared database
4. **Workflow Orchestration**: Complex documentation generation across large codebases

### Future Enhancements

- Process spawning and management tools
- Task queue implementation
- Inter-agent communication protocols
- Workflow templates for common documentation patterns
- Progress monitoring and reporting

## 📋 Requirements

- Node.js 20.11.24+
- Claude Desktop
- DocuMCP server (for sub-agents)
- (Optional) Docker for running external vector databases

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️
