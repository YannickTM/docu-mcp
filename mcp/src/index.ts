#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./services/logger.js";

import { CodeExplainer, CODE_EXPLAIN_TOOL } from "./tools/ExplainCodeTool.js";
import { DiagramGenerator, DIAGRAM_TOOL } from "./tools/GenerateDiagramTool.js";
import {
  DocumentationGenerator,
  DOCUMENTATION_TOOL,
} from "./tools/GenerateDocumentationTool.js";
import { ReadDirTool, READ_DIR_TOOL } from "./tools/ReadDirTool.js";
import { WriteFileTool, WRITE_FILE_TOOL } from "./tools/WriteFileTool.js";
import { CreateDirTool, CREATE_DIR_TOOL } from "./tools/CreateDirTool.js";
import { ReadFileTool, READ_FILE_TOOL } from "./tools/ReadFileTool.js";
import { IndexFileTool, INDEX_FILE_TOOL } from "./tools/IndexFileTool.js";
import { IndexDirTool, INDEX_DIR_TOOL } from "./tools/IndexDirTool.js";
import {
  SearchCodebaseTool,
  SEARCH_CODEBASE_TOOL,
} from "./tools/SearchCodebaseTool.js";
import {
  SearchDiagramTool,
  SEARCH_DIAGRAM_TOOL,
} from "./tools/SearchDiagramTool.js";
import {
  SearchDocumentationTool,
  SEARCH_DOCUMENTATION_TOOL,
} from "./tools/SearchDocumentationTool.js";
import {
  RemoveIndexCollectionTool,
  REMOVE_INDEX_COLLECTION_TOOL,
} from "./tools/RemoveIndexCollection.js";
import {
  DocumentationMerger,
  MERGE_DOCUMENTATION_TOOL,
} from "./tools/MergeDocumentationTool.js";
import { DiagramMerger, MERGE_DIAGRAM_TOOL } from "./tools/MergeDiagramTool.js";
import {
  UserGuideGenerator,
  USER_GUIDE_TOOL,
} from "./tools/GenerateUserGuideTool.js";
import {
  SearchUserGuideTool,
  SEARCH_USER_GUIDE_TOOL,
} from "./tools/SearchUserGuideTool.js";

const server = new Server(
  {
    name: "Doku-Assistant",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);
// tools
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
const removeIndexCollectionTool = new RemoveIndexCollectionTool();
const mergeDocumentationTool = new DocumentationMerger();
const mergeDiagramTool = new DiagramMerger();
const userGuideGenerator = new UserGuideGenerator();
const searchUserGuideTool = new SearchUserGuideTool();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    CODE_EXPLAIN_TOOL,
    DIAGRAM_TOOL,
    DOCUMENTATION_TOOL,
    MERGE_DOCUMENTATION_TOOL,
    MERGE_DIAGRAM_TOOL,
    USER_GUIDE_TOOL,
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
    REMOVE_INDEX_COLLECTION_TOOL,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case CODE_EXPLAIN_TOOL.name:
      return explainCodeTool.explainCode(request.params.arguments);
    case DOCUMENTATION_TOOL.name:
      return generateDocumentationTool.generateDocumentation(
        request.params.arguments,
      );
    case DIAGRAM_TOOL.name:
      return generateDiagramTool.generateDiagram(request.params.arguments);
    case READ_DIR_TOOL.name:
      return readDirTool.processListDirectory(request.params.arguments);
    case WRITE_FILE_TOOL.name:
      return writeFileTool.processWriteFile(request.params.arguments);
    case CREATE_DIR_TOOL.name:
      return createDirTool.processCreateDirectory(request.params.arguments);
    case READ_FILE_TOOL.name:
      return readFileTool.processReadFile(request.params.arguments);
    case INDEX_FILE_TOOL.name:
      return indexFileTool.processIndexFile(request.params.arguments);
    case INDEX_DIR_TOOL.name:
      return indexDirTool.processIndexDirectory(request.params.arguments);
    case SEARCH_CODEBASE_TOOL.name:
      return searchCodebaseTool.processSearchCodebase(request.params.arguments);
    case SEARCH_DIAGRAM_TOOL.name:
      return searchDiagramTool.processSearchDiagrams(request.params.arguments);
    case SEARCH_DOCUMENTATION_TOOL.name:
      return searchDocumentationTool.processSearchDocumentation(
        request.params.arguments,
      );
    case REMOVE_INDEX_COLLECTION_TOOL.name:
      return removeIndexCollectionTool.processRemoveCollection(
        request.params.arguments,
      );
    case MERGE_DOCUMENTATION_TOOL.name:
      return mergeDocumentationTool.mergeDocumentation(
        request.params.arguments,
      );
    case MERGE_DIAGRAM_TOOL.name:
      return mergeDiagramTool.mergeDiagram(request.params.arguments);
    case USER_GUIDE_TOOL.name:
      return userGuideGenerator.generateUserGuide(request.params.arguments);
    case SEARCH_USER_GUIDE_TOOL.name:
      return searchUserGuideTool.processSearchUserGuides(
        request.params.arguments,
      );
  }
  return {
    content: [
      {
        type: "text",
        text: `Unknown tool: ${request.params.name}`,
      },
    ],
    isError: true,
  };
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(
    "DocuMCP Server running on stdio - RAG-enabled with Qdrant vector database",
  );
}
runServer().catch((error) => {
  logger.error("Fatal error running server:", error);
  process.exit(1);
});
