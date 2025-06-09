# DocuMCP

🤖 **A comprehensive MCP system for intelligent code documentation generation with RAG capabilities and multi-agent orchestration**

DocuMCP consists of two complementary MCP servers:

1. **DocuMCP Server**: Core documentation generation with vector embeddings and semantic search
2. **DocuMCP Manager**: Agent orchestration for parallel documentation workflows using multiple Claude Code sub-agents

Together, they enable Claude to generate, search, and manage documentation for your codebase at any scale, from single files to entire enterprise applications.

## ✨ Features

### Core Documentation Features

- 📚 Generate and update documentation based on your codebase
- 🔍 Semantic search across code, documentation, and diagrams
- 📊 Create and merge architectural diagrams
- 📝 Generate user guides
- 💾 Support for multiple vector databases (LanceDB, ChromaDB, Qdrant)
- 🧠 Flexible embedding providers (built-in or Ollama)

### Multi-Agent Orchestration (Manager Server)

- 🤖 Spawn multiple Claude Code sub-agents for parallel processing
- 📊 Monitor agent status and retrieve results
- 🔄 Shared vector database across all agents
- ⚡ Scale documentation generation for large codebases
- 💰 Track costs and performance metrics

## 🚀 Quick Start

### Installation via NPX (Recommended)

The easiest way to use DocuMCP is to configure Claude Desktop with the published npm package:

Add the following to your Claude Desktop configuration:

- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

#### For Core DocuMCP Server:

```json
{
  "mcpServers": {
    "docu-mcp": {
      "command": "npx",
      "args": ["-y", "@myjungle/docu-mcp-server"]
    }
  }
}
```

#### For DocuMCP Manager (Agent Orchestration):

```json
{
  "mcpServers": {
    "docu-mcp-manager": {
      "command": "npx",
      "args": ["-y", "@myjungle/docu-mcp-manager"]
    }
  }
}
```

Restart Claude Desktop and both servers will be available.

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

### 2. Build the Servers

```bash
# Build DocuMCP Server
cd mcp
npm run build
cd ..

# Build DocuMCP Manager
cd manager
npm run build
cd ..
```

### 3. Advanced Configuration

Add the following to your Claude Desktop configuration:

- **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

#### Configuration for Both Servers:

```json
{
  "mcpServers": {
    "docu-mcp": {
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
    },
    "docu-mcp-manager": {
      "command": "node",
      "env": {
        "VECTOR_DB_PROVIDER": "qdrant",
        "QDRANT_URL": "http://localhost:6333",
        "EMBEDDING_PROVIDER": "ollama",
        "EMBEDDING_MODEL": "bge-m3:latest",
        "EMBEDDING_DIMENSION": "1024",
        "OLLAMA_URL": "http://localhost:11434",
        "SUB_AGENT_MODEL": "claude-3-7-sonnet-latest"
      },
      "args": ["/absolute/path/to/DocuMCP/manager/dist/index.js"]
    }
  }
}
```

**Important**: Both servers should use the same vector database configuration to enable shared access.

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

### DocuMCP Server Tools

- 📁 **File Operations**: `read_file`, `write_file`, `create_directory`, `read_directory`
- 🔎 **Search Tools**: `search_codebase`, `search_documentation`, `search_diagram`, `search_user_guide`
- 📚 **Documentation**: `generate_documentation`, `generate_user_guide`, `explain_code`
- 📊 **Diagrams**: `generate_diagram`, `merge_diagram`
- 🗃️ **Indexing**: `index_file`, `index_directory`
- 🔀 **Merging**: `merge_documentation`

### DocuMCP Manager Tools (includes all above plus):

- 🤖 **Agent Orchestration**:
  - `spawn_agent`: Create Claude Code sub-agents for documentation tasks
  - `manage_agent`: Monitor, control, and retrieve results from agents

## 📋 Requirements

- Node.js 20.11.24+
- Claude Desktop
- (Optional) Docker for running external vector databases

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️
