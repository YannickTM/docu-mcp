---
sidebar_position: 2
---

# Retrieval-Augmented Generation (RAG)

## What is RAG?

Retrieval-Augmented Generation (RAG) is a technique that enhances large language models by providing them with relevant context retrieved from a knowledge base. For DocuMCP, RAG serves as the heart of our documentation generation, diagram creation, and code explanation capabilities.

The basic RAG workflow involves:

1. **Indexing**: Converting code, documentation, and diagrams into vector embeddings and storing them in a database
2. **Retrieval**: Finding the most relevant context based on a query
3. **Generation**: Using the retrieved context to generate accurate and helpful content
4. **Storage**: Persisting the generated documentation and diagrams for future retrieval

## RAG Architecture in DocuMCP

DocuMCP implements a comprehensive RAG architecture with three main components:

### 1. Embedding and Indexing Layer

- **Multiple Embedding Providers**:
  - **Built-in Embeddings**: Local embedding generation using @xenova/transformers with MiniLM
  - **Ollama Integration**: Optional integration with Ollama for alternative models

- **Multi-Backend Vector Database**:
  - **ChromaDB**: In-memory and persistent vector database with hybrid search
  - **LanceDB**: High-performance columnar database optimized for vector search
  - **Qdrant**: Production-ready vector database with filtering capabilities

- **Abstraction Layer**:
  - Unified interface for all vector database operations
  - Distance metric conversion between different backends
  - Standardized point and collection management

- **Multiple Collections**:
  - `codebase`: For storing code chunks and their metadata
  - `documentation`: For storing generated documentation
  - `diagrams`: For storing generated diagrams
  - `merged_documentation`: For storing consolidated documentation from multiple sources
  - `merged_diagrams`: For storing consolidated diagrams from multiple sources
  - `user_guides`: For storing AI-generated user guides tailored to specific audiences

### 2. Sequential Thinking Tools

DocuMCP implements several tools that use sequential thinking to generate content:

#### Content Generation Tools:
- **Generate Documentation Tool**: Creates comprehensive documentation using a multi-step thinking process
- **Generate Diagram Tool**: Produces visual diagrams with a progressive thinking approach
- **Explain Code Tool**: Analyzes code with step-by-step reasoning
- **Generate User Guide Tool**: Creates audience-specific guides with multi-collection search

#### Content Merging Tools:
- **Merge Documentation Tool**: Consolidates multiple documentation entries with semantic search
- **Merge Diagram Tool**: Combines multiple diagrams into comprehensive visualizations

Each tool:
- Breaks complex tasks into logical steps with numbered thoughts
- Allows for revising earlier thoughts when new insights emerge
- Supports branching into alternative approaches
- Stores the final output in the vector database for future retrieval

### 3. Search Tools

Several specialized search tools enable retrieval of content across different collections:

- **Search Codebase Tool**: Searches indexed code with filtering
- **Search Documentation Tool**: Retrieves documentation using semantic search
- **Search Diagram Tool**: Finds diagrams using semantic similarity
- **Multi-Collection Search**: Used by merge and generation tools to search across multiple collections simultaneously

## RAG Implementation Details

### Vector Embedding Integration

Each sequential thinking tool integrates with the vector database to store its outputs:

```typescript
// Example from GenerateDocumentationTool.ts
if (data.readyToIndexTheDocumentation && data.file && data.documentation) {
  // Import required services
  const { createEmbedding, getEmbeddingDimension } = await import("../services/embeddings.js");
  const { upsertPoints, createPoint, collectionExists, createCollection } = await import("../services/vectordb.js");
  
  try {
    // Get embedding dimension from configuration
    const embeddingDimension = getEmbeddingDimension();
    
    // Ensure collection exists
    if (!(await collectionExists("documentation"))) {
      const created = await createCollection(
        "documentation",
        embeddingDimension
      );
      if (!created) {
        throw new Error(`Failed to create collection documentation`);
      }
    }
    
    // Generate embedding for the documentation content
    const result = await createEmbedding(data.documentation);
    
    // Create metadata for the document
    const metadata = {
      content: data.documentation,
      filePath: data.file,
      type: "documentation",
      chapters: data.chapters || [],
      createdAt: new Date().toISOString(),
    };
    
    // Create a point for vector database
    const point = createPoint(
      `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Generate a unique ID
      result.embedding,
      metadata
    );
    
    // Add to the documentation collection
    const success = await upsertPoints("documentation", [point]);
  } catch (error) {
    console.error(`Error indexing documentation: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

Similar integration exists in the Diagram Generator, which stores diagrams in the `diagrams` collection:

```typescript
// From GenerateDiagramTool.ts
if (data.readyToIndexTheDiagram && data.file && data.diagram && data.diagramType) {
  // Generate embedding for the diagram content
  const textToEmbed = `${data.diagramType}: ${data.diagram}`;
  const result = await createEmbedding(textToEmbed);
  
  // Create metadata for the diagram
  const metadata = {
    content: data.diagram,
    filePath: data.file,
    type: "diagram",
    diagramType: data.diagramType,
    diagramElements: data.diagramElements || [],
    createdAt: new Date().toISOString(),
  };
  
  // Store in vector database
  const point = createPoint(
    `diagram_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    result.embedding,
    metadata
  );
  
  await upsertPoints("diagrams", [point]);
}
```

### Merging Tool Integration

The merge tools implement sophisticated RAG workflows to combine multiple sources:

```typescript
// Example from MergeDocumentationTool.ts
// 1. Fetch source documents from vector database
const sourceDocuments: SourceDocument[] = [];
for (const docId of data.sourceDocumentations) {
  try {
    // Search documentation collection by ID
    const filter = {
      must: [{
        key: "id", 
        match: { text: docId },
      }],
    };
    
    // Create dummy embedding for searching by ID
    const dummyEmbedding = new Array(384).fill(0);
    const results = await search("documentation", dummyEmbedding, 1, filter);
    
    if (results && results.length > 0) {
      sourceDocuments.push({
        id: docId,
        content: results[0].payload?.content as string,
        chapters: results[0].payload?.chapters as Chapter[],
        filePath: results[0].payload?.filePath as string,
      });
    }
  } catch (error) {
    // Handle error
  }
}

// 2. Perform semantic search if enabled
if (data.semanticSearch) {
  const { query, filter } = data.semanticSearch;
  // Always search in merged_documentation collection
  const collection = "merged_documentation";
  
  // Generate embedding for the query
  const embeddingResult = await createEmbedding(query);
  const results = await search(
    collection,
    embeddingResult.embedding,
    5, // limit
    filter
  );
  // Process search results...
}

// 3. Store merged result with comprehensive metadata
const metadata = {
  content: mergedContent,
  type: "merged-documentation",
  chapters: mergedChapters,
  sourceDocumentations: data.sourceDocumentations,
  sourceFiles: uniqueSourceFiles,
  mergedFromCount: data.sourceDocumentations.length,
  mergeStrategy: data.mergeStrategy || "comprehensive",
  mergeDate: new Date().toISOString(),
  parentMergedDocumentationId: data.parentMergedDocumentationId || "",
  mergeLevel: data.mergeLevel || 0,
  createdAt: new Date().toISOString(),
};

const point = createPoint(uniqueId, result.embedding, metadata);
await upsertPoints("merged_documentation", [point]);
```

### Multi-Collection Search Integration

The user guide generation tool demonstrates advanced multi-collection RAG:

```typescript
// Example from GenerateUserGuideTool.ts
// Perform searches across multiple collections
const searchResults = [];

for (const searchQuery of queries) {
  const { collection, query, filter } = searchQuery;
  
  try {
    // Generate embedding for the query
    const embeddingResult = await createEmbedding(query);
    
    // Perform the search
    const results = await search(
      collection,
      embeddingResult.embedding,
      10, // limit - more results for user guides
      filter
    );
    
    searchResults.push(...results.map(({ score, payload }) => ({
      collection,
      content: payload.content || "",
      similarity: parseFloat(score.toFixed(4)),
      filePath: payload.filePath || "",
      // Include collection-specific metadata
      ...payload,
    })));
  } catch (error) {
    // Handle error
  }
}

// Track sources from different collections
const metadata = {
  content: userGuideContent,
  topic: data.topic,
  targetAudience: data.targetAudience,
  type: "user_guide",
  sections: data.sections || [],
  relatedFiles: data.relatedFiles || [],
  generatedFrom: {
    documentation: data.usedDocumentation || [],
    diagrams: data.usedDiagrams || [],
    mergedDocumentation: data.usedMergedDocumentation || [],
    mergedDiagrams: data.usedMergedDiagrams || [],
    codebase: data.usedCodebase || [],
  },
  createdAt: new Date().toISOString(),
};
```

### RAG Workflows in DocuMCP

DocuMCP implements several RAG workflows:

#### 1. Indexing Workflow

```
Code Files → Chunking → Embedding → Storage in Vector DB
```

This process runs during:
- Initial project onboarding with `index_file` and `index_directory` tools
- Incremental updates when files change

#### 2. Documentation Generation Workflow

```
User Request → Sequential Thinking → RAG Context → Documentation Generation → Vector Storage
```

The documentation creation process:
1. Accepts file path or direct code content
2. Processes through multi-step thinking to analyze the code
3. Generates comprehensive documentation
4. Stores the documentation with metadata in the vector database

#### 3. Diagram Generation Workflow

```
User Request → Sequential Thinking → Entity Recognition → Diagram Creation → Vector Storage
```

The diagram creation process:
1. Accepts file path or direct code content
2. Identifies key components and relationships through sequential thinking
3. Creates diagram elements (nodes, edges, containers)
4. Generates diagram in mermaid.js syntax
5. Stores the diagram with metadata in the vector database

#### 4. Content Retrieval Workflow

```
Search Request → Embedding Generation → Vector Search → Filtered Results
```

Each search tool:
1. Converts the query to an embedding vector
2. Performs a similarity search in the appropriate collection
3. Applies optional filters (e.g., by document type, diagram type, file path)
4. Returns ranked results with metadata

All search operations use the `search` function from the vectordb service, not a separate `searchPoints` function.

#### 5. Documentation Merging Workflow

```
Source Selection → Content Retrieval → Sequential Analysis → Unified Generation → Vector Storage
```

The documentation merging process:
1. Accepts multiple documentation IDs or performs semantic search
2. Retrieves source documents from the vector database
3. Analyzes overlapping and unique content through sequential thinking
4. Generates a unified documentation with source tracking
5. Stores in the `merged_documentation` collection with hierarchical metadata

#### 6. Diagram Merging Workflow

```
Source Selection → Element Analysis → Relationship Mapping → Consolidated Creation → Vector Storage
```

The diagram merging process:
1. Accepts multiple diagram IDs with type validation
2. Retrieves source diagrams and their elements
3. Maps relationships and identifies common components
4. Creates a unified diagram preserving all relationships
5. Stores in the `merged_diagrams` collection with merge metadata

#### 7. User Guide Generation Workflow

```
Audience Analysis → Multi-Collection Search → Content Synthesis → Guide Creation → Vector Storage
```

The user guide creation process:
1. Analyzes target audience and content scope
2. Performs semantic search across all relevant collections
3. Synthesizes information from documentation, diagrams, code, and merged content
4. Generates a tailored guide with cross-references
5. Stores in the `user_guides` collection with source tracking

## Advanced RAG Features

DocuMCP includes several advanced RAG capabilities:

### Content Consolidation
- **Hierarchical Merging**: Support for merge-of-merges with level tracking (mergeLevel parameter)
- **Semantic Enhancement**: Automatic discovery of related content during merging
- **Source Tracking**: Complete lineage of merged content sources
- **Multiple Merge Strategies**: Support for 'summarize', 'combine', and 'synthesize' strategies

### Multi-Collection RAG
- **Cross-Collection Search**: Simultaneous search across all content types
- **Collection-Specific Filtering**: Tailored filters for each collection type
- **Audience-Aware Generation**: Content adaptation based on target audience
- **Complex Filter Structures**: Support for nested filter queries with 'must' clauses

### Metadata-Rich Storage
- **Comprehensive Tracking**: Source files, IDs, and creation timestamps
- **Relationship Mapping**: Parent-child relationships in merged content
- **Usage Analytics**: Track which sources contribute to generated content
- **Collection-Specific Metadata**: Different metadata structures for each collection type

### Additional Features
- **Automatic Collection Creation**: Tools create collections if they don't exist
- **Additional File Reading**: Support for reading multiple files for context
- **Sequential Thinking**: Multi-step reasoning with revision and branching capabilities
- **Dummy Embedding Search**: Search by ID using dummy embeddings when semantic search isn't needed

## Future Enhancements

Our roadmap for RAG implementation includes:

1. **Enhanced embedding**: Experimenting with specialized code embedding models
2. **Multi-modal embedding**: Adding support for image and diagram embeddings
3. **Cross-referencing**: Automatically linking documentation to related code and diagrams
4. **Interactive search refinement**: Improve search with clarification questions
5. **Progressive RAG**: Incremental refinement of search results with multiple rounds of retrieval
6. **Code-specific filters**: Add language-specific filters and token-level search capabilities
7. **Intelligent Deduplication**: Smart handling of overlapping content in merges
8. **Version Control Integration**: RAG-aware diff and merge operations