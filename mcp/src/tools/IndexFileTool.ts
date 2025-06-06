import path from "path";
import chalk from "chalk";
import * as filesystem from "../services/filesystem.js";
import {
  createEmbedding,
  getEmbeddingDimension,
} from "../services/embeddings.js";
import { logger } from "../services/logger.js";
import {
  collectionExists,
  createCollection,
  createPoint,
  upsertPoints,
} from "../services/vectordb.js";
import { createSmartChunks } from "../helper/chunk.js";

/**
 * Result interface for indexed file
 */
interface IndexFileResult {
  success: boolean;
  filePath: string;
  fileType: string;
  totalChunks: number;
  embeddingsGenerated: number;
  embeddingErrors: number;
  embeddingDimension: number;
  storedInDatabase: boolean;
  collectionName: string;
  metadata: Record<string, any>;
  sizeInBytes: number;
  message: string;
}

/**
 * Tool for indexing a file's content into the vector database
 */
class IndexFileTool {
  /**
   * Indexes a file for RAG retrieval
   */
  async indexFile(
    filePath: string,
    chunkSize: number = 512,
    chunkOverlap: number = 50,
    collectionName: string = "codebase",
  ): Promise<IndexFileResult> {
    try {
      // Read file content using filesystem functions
      const readResult = await filesystem.readFile(filePath, "utf-8");

      if (!readResult.success) {
        throw new Error(readResult.message);
      }

      if (!readResult.data || !readResult.data.content) {
        logger.warn("File content is empty or not found");
        readResult.data = {
          content: "File content is empty or not found",
          metadata: {
            size: 0,
            created: new Date(),
            modified: new Date(),
            accessed: new Date(),
            extension: path.extname(filePath),
            filename: path.basename(filePath),
            directory: path.dirname(filePath),
          },
        };
      }

      // Extract content and metadata
      const { content, metadata: fileMetadata } = readResult.data;
      const absolutePath = readResult.data.metadata?.directory
        ? path.join(
            readResult.data.metadata.directory,
            readResult.data.metadata.filename || "",
          )
        : filesystem.resolvePath(filePath);

      // Create chunks using smart chunking based on file type
      const fileExtension = path.extname(absolutePath);
      const chunks = createSmartChunks(content, fileExtension, {
        chunkSize,
        overlapSize: chunkOverlap,
        paragraphsPerChunk: Math.floor(chunkSize / 150), // Rough estimate: ~150 chars per paragraph
        overlapParagraphs: Math.max(1, Math.floor(chunkOverlap / 150)),
      });

      // Early return if no chunks
      if (chunks.length === 0) {
        return {
          success: true,
          filePath: absolutePath,
          fileType: path.extname(absolutePath).slice(1),
          totalChunks: 0,
          embeddingsGenerated: 0,
          embeddingErrors: 0,
          embeddingDimension: 0,
          storedInDatabase: false,
          collectionName,
          metadata: fileMetadata || {},
          sizeInBytes: Buffer.byteLength(content, "utf-8"),
          message: "File is empty or contains only whitespace",
        };
      }

      // Get embedding dimension from configuration
      const embeddingDimension = getEmbeddingDimension();

      // Ensure collection exists
      if (!(await collectionExists(collectionName))) {
        const created = await createCollection(
          collectionName,
          embeddingDimension,
        );
        if (!created) {
          throw new Error(`Failed to create collection ${collectionName}`);
        }
      }

      // Generate embeddings and create points
      const points = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < chunks.length; i++) {
        try {
          const embeddingResult = await createEmbedding(chunks[i]);

          if (embeddingResult.error) {
            logger.warn(
              chalk.yellow(
                `Warning: Error generating embedding for chunk ${i}: ${embeddingResult.error}`,
              ),
            );
            errorCount++;
            continue;
          }

          // Create point with all necessary metadata
          // Use a numeric ID as required by Qdrant
          const pointId = Date.now() + i; // Using timestamp + index to ensure uniqueness
          const point = createPoint(pointId, embeddingResult.embedding, {
            // Store the original filename-based ID in the payload for reference
            fileNameId: `${path.basename(absolutePath).replace(/[^a-z0-9]/gi, "_")}-${i}`,
            filePath: absolutePath,
            chunkIndex: i,
            content: chunks[i],
            startPosition: i * (chunkSize - chunkOverlap),
            fileType: path.extname(absolutePath).slice(1),
            filename: path.basename(absolutePath),
            extension: path.extname(absolutePath),
            directory: path.dirname(absolutePath),
            ...fileMetadata,
          });

          points.push(point);
          successCount++;
        } catch (error) {
          logger.error(chalk.red(`Error processing chunk ${i}:`, error));
          errorCount++;
        }
      }

      // Store points in VectorDB
      const storedInDatabase =
        points.length > 0 ? await upsertPoints(collectionName, points) : false;

      if (storedInDatabase) {
        logger.warn(
          chalk.green(
            `Successfully stored ${points.length} points in VectorDB`,
          ),
        );
      }

      return {
        success: true,
        filePath: absolutePath,
        fileType: path.extname(absolutePath).slice(1),
        totalChunks: chunks.length,
        embeddingsGenerated: successCount,
        embeddingErrors: errorCount,
        embeddingDimension,
        storedInDatabase,
        collectionName,
        metadata: fileMetadata || {},
        sizeInBytes: Buffer.byteLength(content, "utf-8"),
        message: `File indexed successfully with ${chunkSize} chunk size and ${chunkOverlap} overlap`,
      };
    } catch (error) {
      logger.error(chalk.red(`Error indexing file ${filePath}:`, error));
      throw new Error(`Failed to index file: ${(error as Error).message}`);
    }
  }

  /**
   * Process index file request - main entry point for the tool
   */
  processIndexFile(input: any) {
    try {
      const {
        filePath,
        chunkSize = 512,
        chunkOverlap = 50,
        collectionName = "codebase",
      } = input;

      if (!filePath || typeof filePath !== "string") {
        throw new Error("Invalid filePath: must be a string");
      }

      // Log formatted information
      logger.info(`
${chalk.blue("🔍 Indexing File:")} ${filePath}
${chalk.gray("├─")} Chunk Size: ${chalk.yellow(chunkSize)}
${chalk.gray("├─")} Chunk Overlap: ${chalk.yellow(chunkOverlap)}
${chalk.gray("└─")} Collection: ${chalk.yellow(collectionName)}
      `);

      // Execute the indexing operation
      return this.indexFile(filePath, chunkSize, chunkOverlap, collectionName)
        .then((result) => ({
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        }))
        .catch((error) => ({
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
        }));
    } catch (error) {
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

// Tool definition with improved description
const INDEX_FILE_TOOL = {
  name: "index_file",
  description: `Index a file for retrieval-augmented generation (RAG).
  
Processes a file into chunks and stores them in the vector database for semantic search.

Key features:
- Automatic chunking with configurable size and overlap
- Preserves file metadata for better context
- Generates embeddings using the configured provider
- Stores in Vector Databse for fast similarity search
- Handles various file types and encodings

Use when you need to:
- Make file content searchable
- Prepare files for RAG operations
- Build a knowledge base

Parameters explained:
- filePath: Path to the file to index (absolute or relative to project root)`,
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description:
          "Path to the file to index (absolute or relative to project root)",
      },
    },
    required: ["filePath"],
  },
};

export { IndexFileTool, INDEX_FILE_TOOL };
