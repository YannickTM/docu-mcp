import chalk from "chalk";
import { createEmbedding } from "../services/embeddings.js";
import { collectionExists, search } from "../services/vectordb.js";
import { logger } from "../services/logger.js";
/**
 * Interface for documentation search result
 */
interface DocumentationSearchResult {
  content: string;
  similarity: number;
  filePath: string;
  filename: string;
  extension: string;
  location: string;
  title?: string;
  section?: string;
  tags?: string[];
}

/**
 * Interface for documentation search filters
 */
interface DocumentationSearchFilter {
  directory?: string;
  filename?: string;
  section?: string;
  tags?: string[];
}

/**
 * Tool for searching documentation using semantic similarity
 */
class SearchDocumentationTool {
  /**
   * Builds a filter from search filters
   */
  private buildFilter(
    filter?: DocumentationSearchFilter,
  ): Record<string, any> | undefined {
    if (!filter) return undefined;

    const conditions = [];

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

    // Filter by section
    if (filter.section) {
      conditions.push({
        key: "section",
        match: { text: filter.section },
      });
    }

    // Filter by tags
    if (filter.tags?.length) {
      conditions.push({
        key: "tags",
        match: { any: filter.tags },
      });
    }

    return conditions.length > 0 ? { must: conditions } : undefined;
  }

  /**
   * Search documentation using semantic similarity
   */
  async searchDocumentation(
    query: string,
    limit: number = 10,
    filter?: DocumentationSearchFilter,
  ): Promise<DocumentationSearchResult[]> {
    try {
      const collections = ["documentation", "merged_documentation"];
      const results: DocumentationSearchResult[] = [];

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

        // Map results to DocumentationSearchResult interface
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
          section: payload.section || "",
          tags: payload.tags || [],
        }));

        results.push(...mappedResults);
      }

      // Sort combined results by similarity and limit
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      logger.error(chalk.red(`Error searching documentation:`), error as Error);
      throw new Error(
        `Failed to search documentation: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Process search documentation request - main entry point for the tool
   */
  processSearchDocumentation(input: any) {
    try {
      const {
        query,
        limit = 10,
        directory,
        filename,
        section,
        tags,
        collectionName = "documentation",
      } = input;

      if (!query || typeof query !== "string") {
        throw new Error("Invalid query: must be a non-empty string");
      }

      // Build filters if provided
      const filter: DocumentationSearchFilter = {};
      if (directory) filter.directory = directory;
      if (filename) filter.filename = filename;
      if (section) filter.section = section;
      if (tags) {
        filter.tags = Array.isArray(tags) ? tags : [tags];
      }

      // Log formatted information
      const options = [
        `Query: ${chalk.yellow(`"${query}"`)}`,
        `Collection: ${chalk.yellow(collectionName)}`,
        `Result Limit: ${chalk.yellow(limit.toString())}`,
      ];

      if (filter.directory) {
        options.push(`Directory: ${chalk.yellow(filter.directory)}`);
      }
      if (filter.filename) {
        options.push(`Filename: ${chalk.yellow(filter.filename)}`);
      }
      if (filter.section) {
        options.push(`Section: ${chalk.yellow(filter.section)}`);
      }
      if (filter.tags) {
        options.push(`Tags: ${chalk.yellow(filter.tags.join(", "))}`);
      }

      const header = chalk.blue(`🔍 Searching Documentation`);
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
      return this.searchDocumentation(
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
                    section: result.section,
                    tags: result.tags,
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

const SEARCH_DOCUMENTATION_TOOL = {
  name: "search_documentation",
  description: `Search the indexed documentation using semantic similarity.

This tool searches both regular documentation and merged documentation collections.

Key features:
- Semantic search powered by vector embeddings
- Searches both individual and merged documentation collections
- Filter results by document type, directory, filename, section, or tags
- Ranked results by similarity score
- Returns documentation content with location information and metadata

Use when you need to:
- Find documentation related to specific system components
- Locate API references, guides, or examples
- Understand how features are documented
- Discover relevant documentation without knowing exact keywords
- Access both individual and consolidated documentation

Parameters explained:
- query: The natural language query to search for
- limit: Maximum number of results to return (default: 10)
- directory: Filter results by directory path
- filename: Filter results by filename
- section: Filter results by document section
- tags: Filter results by associated tags`,
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
      directory: {
        type: "string",
        description: "Filter by directory path",
      },
      filename: {
        type: "string",
        description: "Filter by filename",
      },
      section: {
        type: "string",
        description: "Filter by document section",
      },
      tags: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } },
        ],
        description: "Filter by associated tags",
      },
    },
    required: ["query"],
  },
};

export { SearchDocumentationTool, SEARCH_DOCUMENTATION_TOOL };
