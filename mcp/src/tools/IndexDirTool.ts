import path from "path";
import chalk from "chalk";
import * as filesystem from "../services/filesystem.js";
import { createEmbedding, getEmbeddingDimension } from "../services/embeddings.js";
import {
  collectionExists,
  createCollection,
  createPoint,
  upsertPoints,
} from "../services/vectordb.js";

/**
 * Result interface for indexed directory
 */
interface IndexDirectoryResult {
  success: boolean;
  dirPath: string;
  recursive: boolean;
  processedFiles: number;
  totalChunks: number;
  totalEmbeddingsGenerated: number;
  totalErrors: number;
  fileResults: any[];
  embeddingDimension: number;
  filteredExtensions: string[] | "all";
  collectionName: string;
  includeHidden: boolean;
  message: string;
}

/**
 * Tool for recursively indexing all files in a directory
 */
class IndexDirTool {
  /**
   * Creates chunks from file content
   */
  private createChunks(
    content: string,
    chunkSize: number = 512,
    overlapSize: number = 50
  ): string[] {
    const chunks: string[] = [];
    let position = 0;

    while (position < content.length) {
      const end = Math.min(position + chunkSize, content.length);
      const chunk = content.substring(position, end);

      if (chunk.trim()) {
        chunks.push(chunk);
      }

      position = end - overlapSize;

      // Safety check to prevent infinite loop
      if (position < 0) position = end;
      if (end >= content.length) break;
    }

    return chunks;
  }

  /**
   * Process a single file and store its chunks in VectorDB
   */
  private async processFile(
    filePath: string,
    collectionName: string,
    chunkSize: number,
    chunkOverlap: number
  ): Promise<any> {
    try {
      // Read file content
      const readResult = await filesystem.readFile(filePath, "utf-8");

      if (!readResult.success) {
        return {
          filePath,
          error: readResult.message,
          success: false,
        };
      }

      const { content, metadata: fileMetadata } = readResult.data!;

      // Create chunks
      const chunks = this.createChunks(content, chunkSize, chunkOverlap);

      if (chunks.length === 0) {
        return {
          filePath,
          totalChunks: 0,
          embeddingsGenerated: 0,
          embeddingErrors: 0,
          storedInDatabase: false,
          sizeInBytes: Buffer.byteLength(content, "utf-8"),
          message: "File is empty or contains only whitespace",
        };
      }

      /*console.log(
        chalk.gray(
          `Processing: ${path.basename(filePath)} (${chunks.length} chunks)`
        )
      );*/

      // Generate embeddings for chunks
      const points = [];
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < chunks.length; i++) {
        try {
          const embeddingResult = await createEmbedding(chunks[i]);

          if (embeddingResult.error) {
            errorCount++;
            continue;
          }

          // Create point with metadata
          // Use a numeric ID as required by Qdrant
          const pointId = Date.now() + i; // Using timestamp + index to ensure uniqueness
          const point = createPoint(pointId, embeddingResult.embedding, {
            // Store the original filename-based ID in the payload for reference
            fileNameId: `${path.basename(filePath).replace(/[^a-z0-9]/gi, "_")}-${i}`,
            filePath,
            chunkIndex: i,
            content: chunks[i],
            startPosition: i * (chunkSize - chunkOverlap),
            fileType: path.extname(filePath).slice(1),
            filename: path.basename(filePath),
            extension: path.extname(filePath),
            directory: path.dirname(filePath),
            ...fileMetadata,
          });

          points.push(point);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      // Store points in VectorDB
      const storedInDatabase =
        points.length > 0 ? await upsertPoints(collectionName, points) : false;

      return {
        filePath,
        totalChunks: chunks.length,
        embeddingsGenerated: successCount,
        embeddingErrors: errorCount,
        storedInDatabase,
        sizeInBytes: Buffer.byteLength(content, "utf-8"),
      };
    } catch (error) {
      return {
        filePath,
        error: (error as Error).message,
        success: false,
      };
    }
  }

  /**
   * Indexes all files in a directory for RAG retrieval
   */
  async indexDirectory(
    dirPath: string,
    recursive: boolean = true,
    fileExtensions?: string[],
    includeHidden: boolean = false,
    chunkSize: number = 512,
    chunkOverlap: number = 50,
    collectionName: string = "codebase"
  ): Promise<IndexDirectoryResult> {
    try {
      const absolutePath = filesystem.resolvePath(dirPath);

      // Check if directory exists
      const dirExists = await filesystem.directoryExists(absolutePath);
      if (!dirExists) {
        throw new Error(`Directory not found: ${absolutePath}`);
      }

      // Get all files in the directory
      const readResult = await filesystem.readDirectory(absolutePath, {
        recursive,
        includeHidden,
        extensions: fileExtensions || [],
      });

      if (!readResult.success) {
        throw new Error(readResult.message);
      }

      // Filter to only include files (not directories)
      const files = readResult
        .data!.entries.filter((entry) => entry.type === "file")
        .map((entry) => path.join(absolutePath, entry.path));

      if (files.length === 0) {
        return {
          success: true,
          dirPath: absolutePath,
          recursive,
          processedFiles: 0,
          totalChunks: 0,
          totalEmbeddingsGenerated: 0,
          totalErrors: 0,
          fileResults: [],
          embeddingDimension: 0,
          filteredExtensions: fileExtensions || "all",
          collectionName,
          includeHidden,
          message: `No files found to index in directory: ${absolutePath}`,
        };
      }

      /*console.log(
        chalk.blue(`Found ${files.length} files to process in ${absolutePath}`)
      );*/

      // Get embedding dimension from configuration
      const embeddingDimension = getEmbeddingDimension();
      
      // Ensure collection exists
      if (!(await collectionExists(collectionName))) {
        const created = await createCollection(
          collectionName,
          embeddingDimension
        );
        if (!created) {
          throw new Error(`Failed to create collection ${collectionName}`);
        }
      }

      // Process files
      const fileResults = [];
      let totalChunks = 0;
      let totalEmbeddingsGenerated = 0;
      let totalErrors = 0;

      for (const filePath of files) {
        const result = await this.processFile(
          filePath,
          collectionName,
          chunkSize,
          chunkOverlap
        );

        fileResults.push(result);

        if (result.totalChunks) totalChunks += result.totalChunks;
        if (result.embeddingsGenerated)
          totalEmbeddingsGenerated += result.embeddingsGenerated;
        if (result.embeddingErrors) totalErrors += result.embeddingErrors;
        if (result.error) totalErrors++;
      }

      return {
        success: true,
        dirPath: absolutePath,
        recursive,
        processedFiles: files.length,
        totalChunks,
        totalEmbeddingsGenerated,
        totalErrors,
        fileResults:
          fileResults.length <= 10
            ? fileResults
            : [`${fileResults.length} files processed`],
        embeddingDimension,
        filteredExtensions: fileExtensions || "all",
        collectionName,
        includeHidden,
        message: `Directory indexed successfully: ${files.length} files with ${totalChunks} chunks and ${totalEmbeddingsGenerated} embeddings`,
      };
    } catch (error) {
      console.error(chalk.red(`Error indexing directory ${dirPath}:`), error);
      throw new Error(`Failed to index directory: ${(error as Error).message}`);
    }
  }

  /**
   * Process index directory request - main entry point for the tool
   */
  processIndexDirectory(input: any) {
    try {
      const {
        dirPath,
        recursive = true,
        fileExtensions,
        includeHidden = false,
        chunkSize = 512,
        chunkOverlap = 50,
        collectionName = "codebase",
      } = input;

      if (!dirPath || typeof dirPath !== "string") {
        throw new Error("Invalid dirPath: must be a string");
      }

      // Log formatted information
      console.error(`
${chalk.blue("🔍 Indexing Directory:")} ${dirPath}
${chalk.gray("├─")} Recursive: ${recursive ? chalk.green("✓") : chalk.red("✗")}
${chalk.gray("├─")} Include Hidden: ${
        includeHidden ? chalk.green("✓") : chalk.red("✗")
      }
${chalk.gray("├─")} Chunk Size: ${chalk.yellow(chunkSize)}
${chalk.gray("├─")} Chunk Overlap: ${chalk.yellow(chunkOverlap)}
${chalk.gray("├─")} Collection: ${chalk.yellow(collectionName)}
${chalk.gray("└─")} Extensions: ${
        fileExtensions
          ? chalk.yellow(fileExtensions.join(", "))
          : chalk.gray("all")
      }
      `);

      // Execute the directory indexing operation
      return this.indexDirectory(
        dirPath,
        recursive,
        fileExtensions,
        includeHidden,
        chunkSize,
        chunkOverlap,
        collectionName
      )
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
                2
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
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
}

// Tool definition with improved description
const INDEX_DIR_TOOL = {
  name: "index_directory",
  description: `Index all files in a directory for retrieval-augmented generation (RAG).

Recursively processes files in a directory, chunks their content, and stores in the vector database.

Key features:
- Recursive directory processing
- File type filtering by extension
- Automatic chunking with configurable parameters
- Progress tracking and error reporting
- Hidden file inclusion control

Use when you need to:
- Index an entire codebase or documentation
- Build a comprehensive knowledge base
- Prepare multiple files for semantic search

Parameters explained:
- dirPath: Path to the directory to index (absolute or relative to project root)
- recursive: Whether to recursively process subdirectories (default: true)
- fileExtensions: Optional array of file extensions to include (e.g. [".js", ".ts"])
- includeHidden: Whether to include hidden files and directories (default: false)`,
  inputSchema: {
    type: "object",
    properties: {
      dirPath: {
        type: "string",
        description:
          "Directory path to index (absolute or relative to project root)",
      },
      recursive: {
        type: "boolean",
        description:
          "Whether to recursively index subdirectories (default: true)",
        default: true,
      },
      fileExtensions: {
        type: "array",
        items: { type: "string" },
        description:
          'Array of file extensions to include (e.g., [".js", ".ts"]). Indexes all files if omitted.',
      },
      includeHidden: {
        type: "boolean",
        description:
          "Whether to include hidden files and directories (default: false)",
        default: false,
      },
    },
    required: ["dirPath"],
  },
};

export { IndexDirTool, INDEX_DIR_TOOL };
