---
sidebar_position: 3
---

# Vector Database

## Role in DocuMCP

The vector database is a crucial component of DocuMCP's Retrieval-Augmented Generation (RAG) system. It stores embeddings (vector representations) of code snippets, documentation, and diagrams, enabling semantic search capabilities across all content types.

DocuMCP supports multiple vector database backends:

- **[ChromaDB](https://docs.trychroma.com/)**: In-memory and persistent vector database with hybrid search
- **[LanceDB](https://lancedb.github.io/lancedb/)**: High-performance columnar database optimized for vector search
- **[Qdrant](https://qdrant.tech/)**: Production-ready vector database with advanced filtering capabilities

All vector database implementations are abstracted behind a common interface, allowing seamless switching between backends.

## Architecture

DocuMCP implements a unified vector database abstraction layer:

```mermaid
flowchart TD
    A[MCP Tools] -->|IndexFileTool| B[Vector Service]
    A -->|IndexDirTool| B
    A -->|SearchCodebase| B
    A -->|SearchDiagrams| B
    A -->|SearchDocuments| B
    A -->|GenerateDiagram| B

    B -->|createPoint()| C[ChromaDB]
    B -->|createCollection| C
    B -->|upsertPoints()| C

    B -->|search()| D[LanceDB]
    B -->|healthCheck()| D

    B -->|search()| E[Qdrant]
    B -->|deleteCollection| E
```

This design enables:

- Consistent API across all vector database implementations
- Ability to change databases without modifying tools
- Automatic distance metric conversions between backends
- Standardized error handling and health checking

## Current Implementation

The vector database integration includes:

1. **Core Abstraction Layer** (`/mcp/src/services/vectordb.ts`):

   - Unified interface for all vector database operations
   - Type definitions for vector points and configuration
   - Automatic provider selection based on environment variables
   - Distance metric conversion between different backend formats

2. **Provider Implementations**:

   - **ChromaDB** (`/mcp/src/services/endpoints/db-chroma.ts`): Client for ChromaDB with filter conversion
   - **LanceDB** (`/mcp/src/services/endpoints/db-lance.ts`): Robust LanceDB implementation with advanced schema handling
   - **Qdrant** (`/mcp/src/services/endpoints/db-qdrant.ts`): Production-ready Qdrant client with API key support

3. **Collection Types**:
   - `codebase`: For code chunks and documentation
   - `documentation`: For generated documentation
   - `diagrams`: For generated diagrams

## Key Functionality

### Common Vector Database Operations

```typescript
// Create a collection
await createCollection(
  "documentation",  // collection name
  384,              // vector size (dimensions)
  "cosine"          // distance metric (cosine, l2/euclid, dot/ip)
);

// Create a point
const point = createPoint(
  "unique_id_123",  // unique ID
  [0.1, 0.2, ...],  // embedding vector
  {                 // metadata
    content: "Documentation content...",
    filePath: "/path/to/file.ts",
    language: "typescript",
    type: "function"
  }
);

// Store points in collection
await upsertPoints("codebase", [point1, point2, point3]);

// Search for similar vectors
const results = await search(
  "codebase",       // collection name
  queryVector,      // query embedding
  10,               // limit
  {                 // optional filter
    must: [
      { key: "language", match: { any: ["typescript", "javascript"] } },
      { key: "filePath", match: { text: "/src/components/" } }
    ]
  }
);
```

### Distance Metrics

DocuMCP standardizes distance metrics across all vector database backends:

| Normalized | ChromaDB | LanceDB | Qdrant |
| ---------- | -------- | ------- | ------ |
| cosine     | cosine   | cosine  | Cosine |
| l2/euclid  | l2       | l2      | Euclid |
| dot/ip     | ip       | dot     | Dot    |

## Provider-Specific Features

### ChromaDB

- In-memory and persistent storage options
- Hybrid search (semantic + keyword)
- Collection caching for performance
- Document storage alongside embeddings

```typescript
// ChromaDB-specific configuration
await createCollection("documentation", 384, "cosine");
```

### LanceDB

- File-based columnar storage
- Automatic schema inference
- Vector index creation with IVF-PQ
- Dynamic vector resizing for compatibility
- Efficient filter processing

```typescript
// LanceDB-specific configuration (with storage path)
process.env.LANCE_PATH = "/path/to/lance_data";
```

### Qdrant

- Production-ready vector database
- Remote server support
- API key authentication
- Advanced filtering capabilities
- Docker deployment

```typescript
// Qdrant-specific configuration (with API key)
process.env.QDRANT_URL = "https://your-qdrant-instance.com";
process.env.QDRANT_API_KEY = "your-api-key";
```

## Using the Vector Database

The vector database is used in three primary workflows:

### 1. Indexing Workflow

```
Code/Docs → Chunking → Embedding → Storage in Vector DB
```

This process runs during the following operations:

- When using `index_file` or `index_directory` tools
- When storing generated documentation
- When storing generated diagrams

### 2. Retrieval Workflow

```
Query → Embedding → Similarity Search in Vector DB → Top K Results
```

This process runs when:

- Searching for code with `search_codebase` tool
- Searching for documentation with `search_documentation` tool
- Searching for diagrams with `search_diagrams` tool

### 3. RAG Workflow (Retrieval-Augmented Generation)

```
Query → Embedding → Similarity Search → Context Preparation → LLM Generation
```

This process runs during:

- Documentation generation with `generate_documentation` tool
- Diagram generation with `generate_diagram` tool
- Code explanation with `explain_code` tool

## Configuration

The vector database can be configured through environment variables:

| Variable             | Description               | Default                 | Options                     |
| -------------------- | ------------------------- | ----------------------- | --------------------------- |
| `VECTOR_DB_PROVIDER` | Vector database provider  | `lance`                 | `chroma`, `lance`, `qdrant` |
| `CHROMA_URL`         | ChromaDB server URL       | `http://localhost:8000` | Any valid URL               |
| `LANCE_PATH`         | LanceDB storage directory | `$HOME/lancedb_data`    | Any valid directory path    |
| `QDRANT_URL`         | Qdrant server URL         | `http://localhost:6333` | Any valid URL               |
| `QDRANT_API_KEY`     | Qdrant API key (optional) | -                       | Any valid API key           |

### Example Configuration

#### .env File

```
VECTOR_DB_PROVIDER=lance
LANCE_PATH=/Users/username/Projects/DocuMCP/data/lancedb
```

## Best Practices

1. **Choose the right backend for your use case**:

   - **ChromaDB**: For development and testing
   - **LanceDB**: For local deployment with no external dependencies
   - **Qdrant**: For production deployments or cloud hosting

2. **Use consistent vector dimensions**:

   - Ensure all embeddings for a collection have the same dimensions
   - Typical dimensions: 384 (MiniLM), 768 (BERT), 1536 (OpenAI)

3. **Add meaningful metadata**:

   - Include file paths, code types, and other attributes for filtering
   - Store content alongside embeddings for retrieval

4. **Use appropriate distance metrics**:

   - **cosine**: Best for text embeddings (default)
   - **l2/euclid**: Best for image or spatial embeddings
   - **dot/ip**: Best when magnitude matters

5. **Index once, query many times**:
   - Batch indexing operations when possible
   - Avoid re-indexing unchanged files
