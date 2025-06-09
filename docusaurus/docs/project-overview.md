---
sidebar_position: 3
---

# Project Overview

## Project Concept

DocuMCP is designed to function as a comprehensive documentation generation system with two complementary components:

1. **DocuMCP Server** - A local development assistant for automatic and contextual documentation of codebases
2. **DocuMCP Manager** - A supervisor server that coordinates multiple documentation agents for large-scale projects

The project follows the high-level concept described below.

### Purpose & Vision

The DocuMCP system aims to:

- Generate automatic and contextual documentation of codebases
- Provide retrieval-augmented generation (RAG) capabilities for enhanced developer productivity
- Seamlessly integrate with local coding assistants like Claude code models
- Leverage detailed documentation and semantic code insights without external dependencies
- Support multiple vector database backends for flexibility in deployment
- Enable multi-agent coordination for comprehensive documentation of large projects
- Facilitate parallel documentation generation through intelligent task distribution

### Core Components

#### Multi-Agent Architecture

- **DocuMCP Manager** orchestrates multiple Claude Code sub-agents
- Sub-agents run in parallel to document different parts of large codebases
- All agents share a common vector database for collaborative documentation
- Intelligent task distribution based on codebase structure and complexity
- Real-time monitoring and management of documentation workflows

#### Retrieval-Augmented Generation (RAG)

- Combines local embedding models and a vector database
- Generates contextually rich documentation dynamically based on semantic queries
- Enhances code understanding by retrieving relevant code snippets and documentation
- Supports searching and creating documentation, diagrams, and code explanations

#### Multi-Backend Vector Database

- Supports multiple vector database backends (ChromaDB, LanceDB, Qdrant)
- Stores semantic embeddings of code, documentation, and diagrams
- Enables efficient semantic similarity searches with advanced filtering
- Provides persistence of embeddings and metadata with configurable storage options

#### API Interface

- Implements the Model Context Protocol for standardized communication
- Exposes tools for file operations, code analysis, documentation generation, and diagram creation
- Facilitates automatic documentation generation in formats such as Markdown (compatible with Docusaurus)
- Supports search operations across code, documentation, and diagrams

### Technical Stack

| Component                  | Implementation                    | Role                                     |
| -------------------------- | --------------------------------- | ---------------------------------------- |
| Programming Language       | TypeScript                        | Main language for both MCP servers       |
| Runtime Environment        | Node.js                           | Server framework                         |
| Protocol                   | Model Context Protocol            | Standardized communication layer         |
| Vector Database            | ChromaDB, LanceDB, Qdrant         | Multi-backend vector DB support (shared) |
| Embedding Generation       | MiniLM (local), Ollama (optional) | Text to vector conversion                |
| Persistence & Storage      | Local filesystem                  | Storing configuration, logs, metadata    |
| Documentation Format       | Markdown                          | Generated documentation format           |
| Code Assistant Integration | Claude-like agent                 | Consumes MCP API for development tasks   |
| Agent Orchestration        | Claude Code sub-processes         | Parallel documentation generation        |

## Current Implementation

The current implementation includes:

### Project Structure

```
/
├── mcp/                  # Core DocuMCP server implementation
│   ├── src/              # Source code
│   │   ├── index.ts      # Main server entry point
│   │   ├── tools/        # MCP tools implementation
│   │   │   ├── ReadFileTool.ts       # File reading utility
│   │   │   ├── WriteFileTool.ts      # File writing utility
│   │   │   ├── ReadDirTool.ts        # Directory listing utility
│   │   │   ├── CreateDirTool.ts      # Directory creation utility
│   │   │   ├── ExplainCodeTool.ts    # Code explanation with sequential thinking
│   │   │   ├── GenerateDiagramTool.ts # Diagram generation with sequential thinking
│   │   │   ├── GenerateDocumentationTool.ts # Documentation generation with sequential thinking
│   │   │   ├── GenerateUserGuideTool.ts # User guide generation with multi-source support
│   │   │   ├── ImproveUserGuideTool.ts # User guide improvement tool (planned)
│   │   │   ├── IndexFileTool.ts      # File indexing for RAG
│   │   │   ├── IndexDirTool.ts       # Directory indexing for RAG
│   │   │   ├── MergeDiagramTool.ts   # Merges multiple diagrams into comprehensive views
│   │   │   ├── MergeDocumentationTool.ts # Consolidates documentation from multiple sources
│   │   │   ├── SearchCodebaseTool.ts # Semantic code search across codebase collection
│   │   │   ├── SearchDiagramTool.ts  # Searches both individual and merged diagrams
│   │   │   ├── SearchDocumentationTool.ts # Searches both individual and merged documentation
│   │   │   └── SearchUserGuideTool.ts # Searches generated user guides with filtering
│   │   ├── services/    # Service providers
│   │   │   ├── embeddings.ts         # Embedding generation providers (local & Ollama)
│   │   │   ├── filesystem.ts         # Centralized filesystem operations provider
│   │   │   ├── vectordb.ts           # Vector database abstraction layer
│   │   │   └── endpoints/            # Vector database backend implementations
│   │   │       ├── db-chroma.ts      # ChromaDB integration
│   │   │       ├── db-lance.ts       # LanceDB integration
│   │   │       └── db-qdrant.ts      # Qdrant integration
│   ├── package.json      # Dependencies
│   └── tsconfig.json     # TypeScript configuration
├── manager/              # DocuMCP Manager server implementation
│   ├── src/              # Source code
│   │   ├── index.ts      # Manager server entry point
│   │   ├── tools/        # Manager-specific tools
│   │   │   ├── SpawnAgentTool.ts     # Creates Claude Code sub-agents
│   │   │   ├── ManageAgentTool.ts    # Monitors and controls agents
│   │   │   └── ...                   # Shared tools from mcp/
│   │   └── services/     # Agent management services
│   │       └── agentManager.ts       # Core agent orchestration logic
│   ├── package.json      # Dependencies
│   └── tsconfig.json     # TypeScript configuration
├── chromadb/             # ChromaDB Docker configuration
│   └── docker-compose.yml # ChromaDB Docker setup
├── qdrant/               # Qdrant vector database configuration
│   └── docker-compose.yml # Qdrant Docker setup
└── docusaurus/          # Documentation site
    ├── docs/            # Documentation content
    └── src/             # Docusaurus site components
```

### MCP Server

The MCP server is implemented using the Model Context Protocol TypeScript SDK with stdio transport:

```typescript
const server = new Server(
  {
    name: "Doku-Assistant",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Register and initialize tools
const explainCodeTool = new CodeExplainer();
const generateDiagramTool = new DiagramGenerator();
const generateDocumentationTool = new DocumentationGenerator();
const readDirTool = new ReadDirTool();
const writeFileTool = new WriteFileTool();
const createDirTool = new CreateDirTool();
const readFileTool = new ReadFileTool();
const indexFileTool = new IndexFileTool();
const indexDirTool = new IndexDirTool();
const searchCodebaseTool = new SearchCodebaseTool();
const searchDiagramTool = new SearchDiagramTool();
const searchDocumentationTool = new SearchDocumentationTool();
const searchUserGuideTool = new SearchUserGuideTool();
const mergeDiagramTool = new MergeDiagramTool();
const mergeDocumentationTool = new MergeDocumentationTool();

// Register tools with the server
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
    SEARCH_DOCUMENTATION_TOOL,
    SEARCH_USER_GUIDE_TOOL,
    MERGE_DIAGRAM_TOOL,
    MERGE_DOCUMENTATION_TOOL,
  ],
}));

// Start the server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Manager Server

The Manager server extends the base DocuMCP functionality with agent orchestration capabilities:

```typescript
const server = new Server(
  {
    name: "Manager-Assistant",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Supervisor-specific tools
const spawnAgentTool = new SpawnAgentTool();
const manageAgentTool = new ManageAgentTool();

// Register both supervisor and documentation tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Supervisor tools
    SPAWN_AGENT_TOOL,
    MANAGE_AGENT_TOOL,
    // Documentation tools (shared with DocuMCP)
    READ_DIR_TOOL,
    WRITE_FILE_TOOL,
    // ... all other DocuMCP tools
  ],
}));
```

#### Agent Management Architecture

The Manager server includes:

- **Agent Manager Service**: Core orchestration logic for spawning and managing Claude Code sub-agents
- **Process Management**: Handles Claude Code process lifecycle with proper resource cleanup
- **Shared Database Access**: All agents use the same vector database configuration
- **Task Distribution**: Intelligent assignment of documentation tasks to sub-agents
- **Result Aggregation**: Collects and consolidates outputs from multiple agents

### Implemented Tools

The current implementation includes the following tools:

#### Agent Orchestration Tools (Manager Server Only)

- **Spawn Agent Tool**: Creates and launches Claude Code sub-agents with configurable parameters
  - Supports custom system prompts and tool restrictions
  - Configurable models, timeouts, and execution modes
  - Returns structured JSON output with cost and performance metrics
  - Enables both fire-and-forget and wait-for-completion modes
- **Manage Agent Tool**: Monitors and controls running agents
  - Check agent status and progress
  - Terminate running agents
  - List all active agents
  - Retrieve agent results and outputs
  - Wait for agent completion with timeout

#### File System Tools

- **Read File Tool**: Reads content from files with metadata
- **Write File Tool**: Writes content to files with directory creation and overwrite protection
- **Read Directory Tool**: Lists directory contents with filtering options
- **Create Directory Tool**: Creates directories with recursive creation support

#### Sequential Thinking Tools

- **Explain Code Tool**: Analyzes and explains code using a step-by-step approach
- **Generate Documentation Tool**: Creates documentation using a sequential thinking process with file path or direct code input
- **Generate Diagram Tool**: Produces visual diagrams of code architecture using sequential thinking with file path or direct code input
- **Generate User Guide Tool**: Creates comprehensive user guides by combining multiple data sources (documentation, diagrams, code)
- **Merge Diagram Tool**: Consolidates multiple related diagrams into comprehensive views
- **Merge Documentation Tool**: Combines documentation from multiple sources into cohesive documents

#### Retrieval-Augmented Generation (RAG) Tools

- **Index File Tool**: Indexes individual file content into the vector database
- **Index Directory Tool**: Recursively indexes all files in a directory with customizable filters
- **Search Codebase Tool**: Performs semantic code search across the codebase collection with filtering capabilities
- **Search Documentation Tool**: Searches both individual and merged documentation collections with advanced filtering
- **Search Diagram Tool**: Searches both individual and merged diagram collections with filtering options
- **Search User Guide Tool**: Searches generated user guides with filtering by audience, topic, and related files

### Vector Database Architecture

The vector database implementation uses a flexible abstraction layer:

#### Core Abstraction Layer

The `/mcp/src/services/vectordb.ts` module provides:

- Unified interface for all vector database operations
- Automatic provider selection based on environment variables
- Type definitions for vector points and database configurations
- Distance metric conversions between different backends

#### Provider Implementations

DocuMCP supports multiple vector database backends:

- **ChromaDB** (`/mcp/src/services/endpoints/db-chroma.ts`):

  - In-memory or persistent storage options
  - Hybrid search capabilities (semantic + keyword)
  - Collection caching for performance

- **LanceDB** (`/mcp/src/services/endpoints/db-lance.ts`):

  - File-based columnar storage
  - Automatic schema inference
  - Vector indexing with IVF-PQ
  - Dynamic vector resizing

- **Qdrant** (`/mcp/src/services/endpoints/db-qdrant.ts`):
  - Production-ready vector database
  - Docker deployment option
  - API key authentication
  - Advanced filtering

#### Collection Types

The system uses multiple collection types:

- `codebase`: For indexed code chunks
- `documentation`: For individual generated documentation
- `diagrams`: For individual generated diagrams
- `merged_documentation`: For consolidated documentation across multiple sources
- `merged_diagrams`: For consolidated diagrams across multiple components
- `user_guides`: For generated user guides tailored to specific audiences

#### Configurability

The vector database provider can be configured via environment variables:

```
VECTOR_DB_PROVIDER=lance  # Options: chroma, lance, qdrant
```

Provider-specific settings:

```
# ChromaDB
CHROMA_URL=http://localhost:8000

# LanceDB
LANCE_PATH=/path/to/lancedb_data

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key  # Optional
```

### Embedding Providers

The system supports multiple embedding providers:

- **Local embedding**: Uses `@xenova/transformers` library with the MiniLM model for generating embeddings locally
- **Ollama embedding**: Optional integration with Ollama API for embedding generation
- Configurable through environment variables for flexibility

#### Embedding Configuration

```
EMBEDDING_PROVIDER=builtin  # Options: builtin, ollama
OLLAMA_BASE_URL=http://localhost:11434  # For Ollama provider
OLLAMA_MODEL=mistral  # Model to use with Ollama
```

### Filesystem Provider

A centralized filesystem utility provider that:

- Standardizes file and directory operations across tools
- Provides consistent error handling and response formatting
- Implements robust file operations with advanced options:
  - Reading files with optional metadata
  - Writing files with directory creation and overwrite protection
  - Creating directories with recursive options
  - Reading directories with recursive, filtering, and extension options
  - Helpful validation methods for checking file and directory existence

### Enhanced File Processing

The sequential thinking tools (Generate Documentation and Generate Diagram) include:

- **Flexible file input options**: Both tools accept either file paths or direct code content
- **Automatic file detection**: The system intelligently determines whether the input is a file path or direct code
- **File content loading**: When a valid file path is provided, the content is automatically loaded for processing
- **Fallback to direct code**: If an input doesn't resolve to a valid file path, it's treated as direct code content
- **Vector database storage**: Completed documentation and diagrams are stored in vector database for future retrieval
- **Helpful console feedback**: The process provides clear feedback about how the input is being handled

### Search Tool Architecture

The search tools provide comprehensive semantic search capabilities across all indexed content:

- **Multi-collection Search**: Search tools automatically query both individual and merged collections
- **Advanced Filtering**: Support for filtering by file extensions, directories, sections, tags, and custom metadata
- **Source Tracking**: User guide searches include complete provenance tracking showing all sources used
- **Unified Interfaces**: All search tools share consistent parameter patterns for ease of use
- **Result Ranking**: Results are automatically sorted by similarity scores for relevance

#### Search Tool Features by Type

- **Codebase Search**: Searches the indexed codebase collection with filters for extensions, directories, and filenames
- **Documentation Search**: Queries both documentation and merged_documentation collections with section and tag filtering
- **Diagram Search**: Searches diagrams and merged_diagrams collections with diagram type filtering
- **User Guide Search**: Specialized search for generated guides with audience and topic targeting

## Implementation Roadmap

The project follows a phased implementation approach:

### Phase A: Core File Operations (Completed)

- ✅ Basic MCP server implementation
- ✅ File system tools (Read, Write, List, Create)
- ✅ Sequential thinking documentation generation
- ✅ Sequential thinking diagram generation
- ✅ Code explanation with sequential thinking

### Phase B: Indexing & RAG (Completed)

- ✅ Implement file and directory indexing tools
- ✅ Implement vector database abstraction layer
- ✅ Implement multiple vector DB backends (ChromaDB, LanceDB, Qdrant)
- ✅ Implement embedding providers (local and Ollama)
- ✅ Implement semantic search capabilities with filtering

### Phase C: Upgrade Sequential Thinking into RAG (In Work)

- ✅ Implement file-based Sequential thinking documentation generation
- ✅ Implement file-based Sequential thinking diagram generation
- ✅ Implement search tools for documentation, diagrams, and user guides
- ✅ Store documentation and diagrams in vector database
- ✅ Implement MergeDiagramTool for consolidating related diagrams
- ✅ Implement MergeDocumentationTool for combining documentation sources
- ✅ Implement GenerateUserGuideTool with multi-source support
- ✅ Implement SearchUserGuideTool with advanced filtering
- 🔄 Implement ImproveUserGuideTool for refining existing documentation

### Phase D: Multi-Agent Orchestration (Completed)

- ✅ Implement DocuMCP Manager server
- ✅ Add SpawnAgentTool for creating Claude Code sub-agents
- ✅ Add ManageAgentTool for agent lifecycle management
- ✅ Implement shared vector database architecture
- ✅ Enable parallel documentation generation workflows

### Phase E: Integration & Polish

- 🔄 Improve error handling and stability
- 🔄 Complete the Docusaurus documentation site
- 🔄 Optimize multi-agent coordination patterns
- 🔄 Add workflow templates for common documentation scenarios
