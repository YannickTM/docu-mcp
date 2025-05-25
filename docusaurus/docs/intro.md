---
sidebar_position: 1
---

# DocuMCP Introduction

Welcome to the documentation for DocuMCP, a local Model Context Protocol (MCP) server designed for intelligent code documentation generation and contextual assistance.

## What is DocuMCP?

DocuMCP is a TypeScript implementation of the Model Context Protocol (MCP) that serves as the foundation for seamless integration between AI systems and your codebase. It functions as a **standardized communication layer** between language models (like Claude) and your code repositories.

Using Retrieval-Augmented Generation (RAG) with a local vector database, DocuMCP enhances code understanding by providing:

- Automatic and contextual documentation of codebases
- Semantic search and retrieval of code snippets
- Integration with local coding assistants

## Project Architecture

DocuMCP follows a modular architecture:

```
documcp/
├── mcp/                # TypeScript MCP server implementation
│   ├── src/            # Source code
│   │   ├── rag/        # RAG implementation
│   │   ├── server/     # Server configuration
│   │   ├── tools/      # MCP tools
│   │   └── utils/      # Utility functions
│   └── ...             # Configuration files
├── qdrant/             # Vector database
│   └── docker-compose.yml
└── docs/               # Documentation
```

## Getting Started

To get started with DocuMCP, see our [Getting Started](./getting-started.md) guide.

## Core Concepts

The project is built around several key concepts:

- [Model Context Protocol](./fundamentals/mcp.md) - The foundation for AI integration
- [Retrieval-Augmented Generation](./fundamentals/rag.md) - Enhancing responses with codebase context
- [Local Vector Database](./fundamentals/vector-db.md) - Efficient semantic search
