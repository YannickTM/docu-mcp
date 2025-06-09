import chalk from "chalk";
import { createEmbedding } from "../services/embeddings.js";
import { collectionExists, search } from "../services/vectordb.js";
import { logger } from "../services/logger.js";
/**
 * Interface for search result
 */
interface SearchResult {
  content: string;
  similarity: number;
  filePath: string;
  filename: string;
  extension: string;
  location: string;
}

/**
 * Interface for search filters
 */
interface SearchFilter {
  extension?: string[];
  directory?: string;
  filename?: string;
}

/**
 * Tool for searching the indexed codebase using semantic similarity
 */
class SearchCodebaseTool {
  /**
   * Builds a filter from search filters
   */
  private buildFilter(filter?: SearchFilter): Record<string, any> | undefined {
    if (!filter) return undefined;

    const conditions = [];

    // Filter by extensions
    if (filter.extension?.length) {
      conditions.push({
        key: "extension",
        match: { any: filter.extension },
      });
    }

    // Filter by directory
    if (filter.directory) {
      conditions.push({
        key: "directory",
        match: { text: filter.directory },
      });
    }

    // Filter by filename
    if (filter.filename) {
      conditions.push({
        key: "filename",
        match: { text: filter.filename },
      });
    }

    return conditions.length > 0 ? { must: conditions } : undefined;
  }

  /**
   * Search the codebase using semantic similarity
   */
  async searchCodebase(
    query: string,
    limit: number = 10,
    filter?: SearchFilter,
    collectionName: string = "codebase",
  ): Promise<SearchResult[]> {
    try {
      // Check if collection exists
      if (!(await collectionExists(collectionName))) {
        throw new Error(
          `Collection ${collectionName} does not exist. Please index some files first.`,
        );
      }

      // Generate embedding for the query
      const embeddingResult = await createEmbedding(query);
      if (embeddingResult.error) {
        throw new Error(
          `Failed to generate embedding for query: ${embeddingResult.error}`,
        );
      }

      // Build filter if provided
      const filterQuery = this.buildFilter(filter);

      // Log search info
      logger.warn(
        chalk.blue(`Searching collection ${collectionName} for: "${query}"`),
      );
      if (filterQuery) {
        logger.warn(`With filters:`, JSON.stringify(filterQuery, null, 2));
      }

      // Search in VectorDB
      const searchResults = await search(
        collectionName,
        embeddingResult.embedding,
        limit,
        filterQuery,
      );

      // Map results to SearchResult interface
      return searchResults.map(({ score, payload }) => ({
        content: payload.content || "",
        similarity: score,
        filePath: payload.filePath || "",
        filename: payload.filename || "",
        extension: payload.extension || "",
        location: `${payload.filePath}${
          payload.startPosition ? `:${payload.startPosition}` : ""
        }`,
      }));
    } catch (error) {
      logger.error(chalk.red(`Error searching codebase:`), error as Error);
      throw new Error(`Failed to search codebase: ${(error as Error).message}`);
    }
  }

  /**
   * Process search codebase request - main entry point for the tool
   */
  processSearchCodebase(input: any) {
    try {
      const {
        query,
        limit = 10,
        extension,
        directory,
        filename,
        collectionName = "codebase",
      } = input;

      if (!query || typeof query !== "string") {
        throw new Error("Invalid query: must be a non-empty string");
      }

      // Build filters if provided
      const filter: SearchFilter = {};
      if (extension) {
        filter.extension = Array.isArray(extension) ? extension : [extension];
      }
      if (directory) filter.directory = directory;
      if (filename) filter.filename = filename;

      // Log formatted information
      const options = [
        `Query: ${chalk.yellow(`"${query}"`)}`,
        `Collection: ${chalk.yellow(collectionName)}`,
        `Result Limit: ${chalk.yellow(limit.toString())}`,
      ];

      if (filter.extension) {
        options.push(
          `Extensions: ${chalk.yellow(filter.extension.join(", "))}`,
        );
      }
      if (filter.directory) {
        options.push(`Directory: ${chalk.yellow(filter.directory)}`);
      }
      if (filter.filename) {
        options.push(`Filename: ${chalk.yellow(filter.filename)}`);
      }

      const header = chalk.blue(`🔍 Searching Codebase`);
      const border = "─".repeat(
        Math.max(header.length, ...options.map((o) => o.length)) + 4,
      );

      logger.warn(`
┌${border}┐
│ ${header.padEnd(border.length - 2)} │
├${border}┤
${options.map((opt) => `│ ${opt.padEnd(border.length - 2)} │`).join("\n")}
└${border}┘`);

      // Execute the search operation
      return this.searchCodebase(
        query,
        limit,
        Object.keys(filter).length > 0 ? filter : undefined,
        collectionName,
      )
        .then((results) => ({
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  totalResults: results.length,
                  results: results.map((result) => ({
                    content: result.content,
                    similarity: parseFloat(result.similarity.toFixed(4)),
                    filePath: result.filePath,
                    filename: result.filename,
                    extension: result.extension,
                    location: result.location,
                  })),
                },
                null,
                2,
              ),
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

const SEARCH_CODEBASE_TOOL = {
  name: "search_codebase",
  description: `Search the indexed codebase for relevant code snippets using semantic similarity.

This tool uses vector embeddings to find code related to concepts, not just exact keyword matches.

Key features:
- Semantic search powered by vector embeddings
- Filter results by file extension, directory, or filename
- Ranked results by similarity score
- Returns code snippets with location information

Use when you need to:
- Find code related to a concept or functionality
- Locate examples of specific patterns
- Understand how features are implemented across the codebase
- Discover relevant code without knowing exact keywords

Parameters explained:
- query: The natural language or code query to search for
- limit: Maximum number of results to return (default: 10)
- extension: Filter results by file extension (e.g. ".js", ".ts")
- directory: Filter results by directory path
- filename: Filter results by filename`,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language or code query to search for",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 10)",
        default: 10,
      },
      extension: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
        ],
        description: "Filter by file extension(s) (e.g., '.js', '.ts')",
      },
      directory: {
        type: "string",
        description: "Filter by directory path",
      },
      filename: {
        type: "string",
        description: "Filter by filename",
      },
    },
    required: ["query"],
  },
};

export { SearchCodebaseTool, SEARCH_CODEBASE_TOOL };
