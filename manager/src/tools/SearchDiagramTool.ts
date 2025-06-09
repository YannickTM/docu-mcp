import chalk from "chalk";
import { createEmbedding } from "../services/embeddings.js";
import { collectionExists, search } from "../services/vectordb.js";
import { logger } from "../services/logger.js";
/**
 * Interface for diagram search result
 */
interface DiagramSearchResult {
  content: string;
  similarity: number;
  filePath: string;
  filename: string;
  extension: string;
  location: string;
  title?: string;
  diagramType?: string;
  description?: string;
}

/**
 * Interface for diagram search filters
 */
interface DiagramSearchFilter {
  diagramType?: string[];
  directory?: string;
  filename?: string;
}

/**
 * Tool for searching diagrams using semantic similarity
 */
class SearchDiagramTool {
  /**
   * Builds a filter from search filters
   */
  private buildFilter(
    filter?: DiagramSearchFilter,
  ): Record<string, any> | undefined {
    if (!filter) return undefined;

    const conditions = [];

    // Filter by diagram type
    if (filter.diagramType?.length) {
      conditions.push({
        key: "diagramType",
        match: { any: filter.diagramType },
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
   * Search diagrams using semantic similarity
   */
  async searchDiagrams(
    query: string,
    limit: number = 10,
    filter?: DiagramSearchFilter,
  ): Promise<DiagramSearchResult[]> {
    try {
      const collections = ["diagrams", "merged_diagrams"];
      const results: DiagramSearchResult[] = [];

      // Generate embedding for the query only once
      const embeddingResult = await createEmbedding(query);
      if (embeddingResult.error) {
        throw new Error(
          `Failed to generate embedding for query: ${embeddingResult.error}`,
        );
      }

      // Search in both collections
      for (const collection of collections) {
        // Skip if collection doesn't exist
        if (!(await collectionExists(collection))) {
          logger.warn(
            chalk.yellow(
              `Collection ${collection} does not exist, skipping...`,
            ),
          );
          continue;
        }
        // Build filter if provided
        const filterQuery = this.buildFilter(filter);

        // Log search info
        logger.warn(chalk.blue(`Searching ${collection} for: "${query}"`));
        if (filterQuery) {
          logger.warn(`With filters:`, JSON.stringify(filterQuery, null, 2));
        }

        // Search in VectorDB
        const searchResults = await search(
          collection,
          embeddingResult.embedding,
          limit,
          filterQuery,
        );

        // Map results to DiagramSearchResult interface
        const mappedResults = searchResults.map(({ score, payload }) => ({
          content: payload.content || "",
          similarity: score,
          filePath: payload.filePath || "",
          filename: payload.filename || "",
          extension: payload.extension || "",
          location: `${payload.filePath}${
            payload.startPosition ? `:${payload.startPosition}` : ""
          }`,
          title: payload.title || "",
          diagramType: payload.diagramType || "",
          description: payload.description || "",
        }));

        results.push(...mappedResults);
      }

      // Sort combined results by similarity and limit
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      logger.error(chalk.red(`Error searching diagrams:`), error as Error);
      throw new Error(`Failed to search diagrams: ${(error as Error).message}`);
    }
  }

  /**
   * Process search diagrams request - main entry point for the tool
   */
  processSearchDiagrams(input: any) {
    try {
      const {
        query,
        limit = 10,
        diagramType,
        directory,
        filename,
        collectionName = "diagrams",
      } = input;

      if (!query || typeof query !== "string") {
        throw new Error("Invalid query: must be a non-empty string");
      }

      // Build filters if provided
      const filter: DiagramSearchFilter = {};
      if (diagramType) {
        filter.diagramType = Array.isArray(diagramType)
          ? diagramType
          : [diagramType];
      }
      if (directory) filter.directory = directory;
      if (filename) filter.filename = filename;

      // Log formatted information
      const options = [
        `Query: ${chalk.yellow(`"${query}"`)}`,
        `Collection: ${chalk.yellow(collectionName)}`,
        `Result Limit: ${chalk.yellow(limit.toString())}`,
      ];

      if (filter.diagramType) {
        options.push(
          `Diagram Types: ${chalk.yellow(filter.diagramType.join(", "))}`,
        );
      }
      if (filter.directory) {
        options.push(`Directory: ${chalk.yellow(filter.directory)}`);
      }
      if (filter.filename) {
        options.push(`Filename: ${chalk.yellow(filter.filename)}`);
      }

      const header = chalk.blue(`🔍 Searching Diagrams`);
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
      return this.searchDiagrams(
        query,
        limit,
        Object.keys(filter).length > 0 ? filter : undefined,
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
                    title: result.title,
                    diagramType: result.diagramType,
                    description: result.description,
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

const SEARCH_DIAGRAM_TOOL = {
  name: "search_diagrams",
  description: `Search the indexed diagrams using semantic similarity.

This tool searches both regular diagrams and merged diagrams collections.

Key features:
- Semantic search powered by vector embeddings
- Searches both individual and merged diagram collections
- Filter results by diagram type, directory, or filename
- Ranked results by similarity score
- Returns diagram content with location information and metadata

Use when you need to:
- Find diagrams related to specific system components
- Locate architectural or flow diagrams related to a concept
- Understand visual representations of system functionality
- Discover relevant diagrams without knowing exact keywords
- Access both individual and consolidated diagrams

Parameters explained:
- query: The natural language query to search for
- limit: Maximum number of results to return (default: 10)
- diagramType: Filter results by diagram type (e.g. "component", "flow", "architecture")
- directory: Filter results by directory path
- filename: Filter results by filename`,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language query to search for",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 10)",
        default: 10,
      },
      diagramType: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
        ],
        description:
          "Filter by diagram type(s) (e.g., 'component', 'flow', 'architecture')",
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

export { SearchDiagramTool, SEARCH_DIAGRAM_TOOL };
