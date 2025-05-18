import chalk from "chalk";
import { createEmbedding } from "../services/embeddings.js";
import { collectionExists, search } from "../services/vectordb.js";

/**
 * Interface for user guide search result
 */
interface UserGuideSearchResult {
  content: string;
  similarity: number;
  topic: string;
  targetAudience: string;
  sections: string[];
  relatedFiles: string[];
  generatedFrom: {
    documentation: string[];
    diagrams: string[];
    mergedDocumentation: string[];
    mergedDiagrams: string[];
    codebase: string[];
  };
  location: string;
  createdAt: string;
}

/**
 * Interface for user guide search filters
 */
interface UserGuideSearchFilter {
  targetAudience?: string;
  topic?: string;
  relatedFile?: string;
}

/**
 * Tool for searching user guides using semantic similarity
 */
class SearchUserGuideTool {
  /**
   * Builds a filter from search filters
   */
  private buildFilter(
    filter?: UserGuideSearchFilter
  ): Record<string, any> | undefined {
    if (!filter) return undefined;

    const conditions = [];

    // Filter by target audience
    if (filter.targetAudience) {
      conditions.push({
        key: "targetAudience",
        match: { text: filter.targetAudience },
      });
    }

    // Filter by topic
    if (filter.topic) {
      conditions.push({
        key: "topic",
        match: { text: filter.topic },
      });
    }

    // Filter by related file
    if (filter.relatedFile) {
      conditions.push({
        key: "relatedFiles",
        match: { text: filter.relatedFile },
      });
    }


    return conditions.length > 0 ? { must: conditions } : undefined;
  }

  /**
   * Search user guides using semantic similarity
   */
  async searchUserGuides(
    query: string,
    limit: number = 10,
    filter?: UserGuideSearchFilter
  ): Promise<UserGuideSearchResult[]> {
    try {
      const collectionName = "user_guides";
      
      // Check if collection exists
      if (!(await collectionExists(collectionName))) {
        throw new Error(
          `User guides collection does not exist. Please generate some user guides first.`
        );
      }

      // Generate embedding for the query
      const embeddingResult = await createEmbedding(query);
      if (embeddingResult.error) {
        throw new Error(
          `Failed to generate embedding for query: ${embeddingResult.error}`
        );
      }

      // Build filter if provided
      const filterQuery = this.buildFilter(filter);

      // Log search info
      console.warn(
        chalk.blue(
          `Searching user guides collection for: "${query}"`
        )
      );
      if (filterQuery) {
        console.warn(`With filters:`, JSON.stringify(filterQuery, null, 2));
      }

      // Search in VectorDB
      const searchResults = await search(
        collectionName,
        embeddingResult.embedding,
        limit,
        filterQuery
      );

      // Map results to UserGuideSearchResult interface
      return searchResults.map(({ score, payload }) => ({
        content: payload.content || "",
        similarity: score,
        topic: payload.topic || "",
        targetAudience: payload.targetAudience || "",
        sections: payload.sections || [],
        relatedFiles: payload.relatedFiles || [],
        generatedFrom: {
          documentation: payload.generatedFrom?.documentation || [],
          diagrams: payload.generatedFrom?.diagrams || [],
          mergedDocumentation: payload.generatedFrom?.mergedDocumentation || [],
          mergedDiagrams: payload.generatedFrom?.mergedDiagrams || [],
          codebase: payload.generatedFrom?.codebase || [],
        },
        location: `user_guide:${payload.topic}`,
        createdAt: payload.createdAt || "",
      }));
    } catch (error) {
      console.error(chalk.red(`Error searching user guides:`), error);
      throw new Error(
        `Failed to search user guides: ${(error as Error).message}`
      );
    }
  }

  /**
   * Process search user guides request - main entry point for the tool
   */
  processSearchUserGuides(input: any) {
    try {
      const {
        query,
        limit = 10,
        targetAudience,
        topic,
        relatedFile,
      } = input;

      if (!query || typeof query !== "string") {
        throw new Error("Invalid query: must be a non-empty string");
      }

      // Build filters if provided
      const filter: UserGuideSearchFilter = {};
      if (targetAudience) filter.targetAudience = targetAudience;
      if (topic) filter.topic = topic;
      if (relatedFile) filter.relatedFile = relatedFile;

      // Log formatted information
      const options = [
        `Query: ${chalk.yellow(`"${query}"`)}`,
        `Result Limit: ${chalk.yellow(limit.toString())}`,
      ];

      if (filter.targetAudience) {
        options.push(`Target Audience: ${chalk.yellow(filter.targetAudience)}`);
      }
      if (filter.topic) {
        options.push(`Topic: ${chalk.yellow(filter.topic)}`);
      }
      if (filter.relatedFile) {
        options.push(`Related File: ${chalk.yellow(filter.relatedFile)}`);
      }

      const header = chalk.blue(`🔍 Searching User Guides`);
      const border = "─".repeat(
        Math.max(header.length, ...options.map((o) => o.length)) + 4
      );

      console.warn(`
┌${border}┐
│ ${header.padEnd(border.length - 2)} │
├${border}┤
${options.map((opt) => `│ ${opt.padEnd(border.length - 2)} │`).join("\n")}
└${border}┘`);

      // Execute the search operation
      return this.searchUserGuides(
        query,
        limit,
        Object.keys(filter).length > 0 ? filter : undefined
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
                    topic: result.topic,
                    targetAudience: result.targetAudience,
                    sections: result.sections,
                    relatedFiles: result.relatedFiles,
                    generatedFrom: result.generatedFrom,
                    location: result.location,
                    createdAt: result.createdAt,
                  })),
                },
                null,
                2
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

const SEARCH_USER_GUIDE_TOOL = {
  name: "search_user_guide",
  description: `Search the indexed user guides using semantic similarity.

This tool searches through generated user guides that have been tailored for specific audiences.

Key features:
- Semantic search powered by vector embeddings
- Filter results by target audience, topic, or related files
- Ranked results by similarity score
- Returns user guide content with metadata

Use when you need to:
- Find user guides for specific audience types
- Locate guides on particular topics
- Discover guides that reference specific files

Parameters explained:
- query: The natural language query to search for
- limit: Maximum number of results to return (default: 10)
- targetAudience: Filter by intended audience (e.g., "developers", "end-users", "administrators")
- topic: Filter by guide topic
- relatedFile: Filter by files referenced in the guide`,
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
      targetAudience: {
        type: "string",
        description: "Filter by target audience (e.g., 'developers', 'end-users')",
      },
      topic: {
        type: "string",
        description: "Filter by user guide topic",
      },
      relatedFile: {
        type: "string",
        description: "Filter by files referenced in the guide",
      },
    },
    required: ["query"],
  },
};

export { SearchUserGuideTool, SEARCH_USER_GUIDE_TOOL };