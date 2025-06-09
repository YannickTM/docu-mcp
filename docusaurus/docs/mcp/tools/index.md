---
sidebar_position: 1
title: Overview
---

# MCP Tools

DocuMCP provides two complementary sets of tools through its two MCP servers:

1. **DocuMCP Server**: Core documentation generation tools for file operations, search, code analysis, documentation generation, and diagram creation
2. **DocuMCP Manager**: Agent orchestration tools for coordinating multiple documentation agents, plus all the DocuMCP server tools

## Current Implementation Status

DocuMCP is under active development, with the following tools currently implemented:

### Core Documentation Tools (Available in both servers)

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
- **Search User Guide**: Searches generated user guides with filtering
- **Explain Code**: Analyzes code with sequential thinking approach
- **Generate User Guide**: Creates user-friendly guides from multiple sources
- **Merge Documentation**: Consolidates documentation from multiple sources
- **Merge Diagrams**: Combines related diagrams into comprehensive views

### Agent Orchestration Tools (Manager server only)

- **Spawn Agent**: Creates and launches Claude Code sub-agents for parallel documentation tasks
- **Manage Agent**: Monitors, controls, and retrieves results from running agents

Additional tools are in development and will be implemented in future releases.

## Tool Categories

The MCP tools are organized into the following categories:

### Agent Orchestration Tools (Manager Server Only)

Tools for managing multiple documentation agents:

- **Spawn Agent**: Creates Claude Code sub-agents with:
  - Configurable system prompts and tool restrictions
  - Model selection (default: claude-3-7-sonnet, optional: opus models)
  - Fire-and-forget or wait-for-completion modes
  - Structured JSON output with cost and performance metrics
  - Automatic DocuMCP server integration for all sub-agents
- **Manage Agent**: Controls agent lifecycle with:
  - Status checking and progress monitoring
  - Agent termination capabilities
  - List all active agents
  - Retrieve results and outputs
  - Wait for completion with timeout

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
- [Generate User Guide](./generate-user-guide.md): Synthesizes user-friendly guides from multiple sources
- [Merge Documentation](./merge-documentation.md): Consolidates documentation from various sources
- [Merge Diagrams](./merge-diagram.md): Combines related diagrams into unified views

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
            text: JSON.stringify(result, null, 2),
          },
        ],
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
                status: "failed",
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
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

## Multi-Agent Architecture

The Manager server enables powerful multi-agent workflows:

1. **Parallel Processing**: Spawn multiple agents to document different parts of a large codebase simultaneously
2. **Shared Vector Database**: All agents contribute to the same knowledge base
3. **Task Specialization**: Assign specific documentation tasks to different agents
4. **Result Aggregation**: Collect and consolidate outputs from all agents
5. **Cost Optimization**: Monitor resource usage and optimize model selection

### Example Multi-Agent Workflow

```typescript
// Spawn multiple agents for comprehensive documentation
const agents = [
  // Agent 1: Analyze and explain core services
  spawnAgent({
    task: "Analyze src/services and generate technical documentation",
    allowedTools: [
      "Read",
      "Glob",
      "mcp__docu-mcp__explain_code",
      "mcp__docu-mcp__generate_documentation",
    ],
    model: "claude-opus-4-20250514",
  }),

  // Agent 2: Create architecture diagrams
  spawnAgent({
    task: "Generate system architecture diagrams for all components",
    allowedTools: [
      "Read",
      "mcp__docu-mcp__generate_diagram",
      "mcp__docu-mcp__merge_diagram",
    ],
  }),

  // Agent 3: Generate user guide
  spawnAgent({
    task: "Create a comprehensive user guide from all documentation",
    allowedTools: [
      "mcp__docu-mcp__search_documentation",
      "mcp__docu-mcp__generate_user_guide",
    ],
  }),
];

// Monitor and collect results
for (const agent of agents) {
  const result = await manageAgent({ action: "wait", agentId: agent.agentId });
  console.log(`Agent ${agent.agentId} completed with cost: ${result.cost}`);
}
```

## MCP Server Integration

The tools are registered with the MCP servers:

````typescript
### DocuMCP Server (`/mcp/src/index.ts`)

```typescript
// Initialize documentation tools
const readFileTool = new ReadFileTool();
const writeFileTool = new WriteFileTool();
const explainCodeTool = new CodeExplainer();
// ... other tools

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    CODE_EXPLAIN_TOOL,
    DIAGRAM_TOOL,
    DOCUMENTATION_TOOL,
    // ... all documentation tools
  ],
}));
````

### Manager Server (`/manager/src/index.ts`)

```typescript
// Initialize agent orchestration tools
const spawnAgentTool = new SpawnAgentTool();
const manageAgentTool = new ManageAgentTool();

// Also initialize all documentation tools
const readFileTool = new ReadFileTool();
// ... other tools

// Register both sets of tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Supervisor tools
    SPAWN_AGENT_TOOL,
    MANAGE_AGENT_TOOL,
    // Documentation tools
    READ_DIR_TOOL,
    WRITE_FILE_TOOL,
    // ... all other DocuMCP tools
  ],
}));
```

Tools are then dispatched in the `CallToolRequestSchema` handler to their respective implementation methods.
