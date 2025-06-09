---
sidebar_position: 1
---

# DocuMCP Introduction

Welcome to the documentation for DocuMCP, a comprehensive system for intelligent code documentation generation and contextual assistance. DocuMCP consists of two complementary MCP servers designed to work together for advanced documentation workflows.

## What is DocuMCP?

DocuMCP is a TypeScript implementation of the Model Context Protocol (MCP) that serves as the foundation for seamless integration between AI systems and your codebase. It functions as a **standardized communication layer** between language models (like Claude) and your code repositories.

The system includes:

1. **DocuMCP Server** - The core documentation generation server with RAG capabilities
2. **DocuMCP Manager** - A supervisor server for coordinating multiple documentation agents

Using Retrieval-Augmented Generation (RAG) with a local vector database, DocuMCP enhances code understanding by providing:

- Automatic and contextual documentation of codebases
- Semantic search and retrieval of code snippets
- Integration with local coding assistants
- Multi-agent coordination for large-scale documentation projects

## Project Architecture

DocuMCP follows a modular monorepo architecture:

```
DocuMCP/
├── mcp/                # Core DocuMCP server
│   ├── src/            # Source code
│   │   ├── services/   # Vector DB & embedding services
│   │   ├── tools/      # MCP tools for documentation
│   │   ├── helper/     # Utility functions
│   │   └── schemas/    # Data schemas
│   └── ...             # Configuration files
├── manager/            # DocuMCP Manager server
│   ├── src/            # Source code
│   │   ├── services/   # Agent management services
│   │   ├── tools/      # Supervisor & coordination tools
│   │   └── ...         # Shared components with mcp/
│   └── ...             # Configuration files
├── qdrant/             # Vector database (Qdrant)
│   └── docker-compose.yml
├── chromadb/           # Alternative vector database
│   └── docker-compose.yml
└── docusaurus/         # Documentation website
```

## Getting Started

To get started with DocuMCP, see our [Getting Started](./getting-started.md) guide.

## Core Concepts

The project is built around several key concepts:

- [Model Context Protocol](./fundamentals/mcp.md) - The foundation for AI integration
- [Retrieval-Augmented Generation](./fundamentals/rag.md) - Enhancing responses with codebase context
- [Local Vector Database](./fundamentals/vector-db.md) - Efficient semantic search
