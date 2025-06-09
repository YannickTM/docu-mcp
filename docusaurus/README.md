# DocuMCP Documentation

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator. It provides comprehensive documentation for the DocuMCP project.

## Documentation Content

The documentation covers:

### Core Concepts

- Project fundamentals (MCP, RAG, Vector Databases)
- Multi-agent architecture and orchestration
- Getting started guides

### Server Documentation

- **DocuMCP Server**: Core documentation generation with RAG capabilities
- **DocuMCP Manager**: Agent orchestration for parallel documentation workflows

### Tool Documentation

- File system tools (read, write, create, index)
- Search tools (codebase, documentation, diagrams, user guides)
- Documentation tools (explain code, generate docs/diagrams, merge content)
- Agent orchestration tools (spawn and manage sub-agents)

### Integration & Configuration

- Client integration with Claude Desktop
- Vector database configuration (LanceDB, ChromaDB, Qdrant)
- Embedding provider options
- Troubleshooting guides

## Installation

```bash
# Install dependencies
npm install
```

## Local Development

```bash
# Start development server (http://localhost:4000)
npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Build

```bash
# Build static site
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## Type Checking

```bash
# Check TypeScript types
npm run typecheck
```

## Local Preview

```bash
# Serve the built site locally
npm run serve
```

## Clean Build

```bash
# Clear build artifacts
npm run clear
```
