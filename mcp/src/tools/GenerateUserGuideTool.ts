// Fixed chalk import for ESM
import chalk from "chalk";
import {
  createEmbedding,
  getEmbeddingDimension,
} from "../services/embeddings.js";
import { logger } from "../services/logger.js";
import {
  collectionExists,
  search,
  upsertPoints,
  createPoint,
  createCollection,
} from "../services/vectordb.js";

class UserGuideGenerator {
  thoughtHistory: any[] = [];
  branches: any = {};

  async validateThoughtData(input: any) {
    const data = input;

    // Validate topic
    if (!data.topic || typeof data.topic !== "string") {
      throw new Error("Invalid topic: must be a string");
    }

    // Validate target audience
    if (!data.targetAudience || typeof data.targetAudience !== "string") {
      throw new Error("Invalid targetAudience: must be a string");
    }

    // Standard validation
    if (!data.thought || typeof data.thought !== "string") {
      throw new Error("Invalid thought: must be a string");
    }
    if (!data.thoughtNumber || typeof data.thoughtNumber !== "number") {
      throw new Error("Invalid thoughtNumber: must be a number");
    }
    if (!data.totalThoughts || typeof data.totalThoughts !== "number") {
      throw new Error("Invalid totalThoughts: must be a number");
    }
    if (typeof data.nextThoughtNeeded !== "boolean") {
      throw new Error("Invalid nextThoughtNeeded: must be a boolean");
    }
    if (typeof data.readyToIndexTheUserGuide !== "boolean") {
      throw new Error("Invalid readyToIndexTheUserGuide: must be a boolean");
    }
    if (data.userGuide && typeof data.userGuide !== "string") {
      throw new Error("Invalid userGuide: must be a string");
    }
    if (data.sections && !Array.isArray(data.sections)) {
      throw new Error("Invalid sections: must be an array");
    }
    if (data.readyToIndexTheUserGuide && !data.userGuide) {
      throw new Error(
        "readyToIndexTheUserGuide is true but userGuide is missing",
      );
    }

    // Handle semantic search across multiple collections
    let searchResults = data.semanticSearch || undefined;
    if (data.semanticSearch) {
      try {
        const queries = Array.isArray(data.semanticSearch)
          ? data.semanticSearch
          : [data.semanticSearch];

        searchResults = [];

        for (const searchQuery of queries) {
          const { collection, query, filter } = searchQuery;

          if (!collection || !query) {
            logger.error(
              chalk.red("Invalid semanticSearch: missing collection or query"),
            );
            continue;
          }

          // Verify that the collection exists
          if (!(await collectionExists(collection))) {
            logger.error(chalk.red(`Collection ${collection} does not exist`));
            continue;
          }

          logger.warn(
            chalk.blue(`Searching ${collection} collection for: "${query}"`),
          );

          // Build filter if provided
          let filterQuery = {};
          if (filter) {
            const conditions = [];

            // Common filters
            if (filter.filename) {
              conditions.push({
                key: "filename",
                match: { text: filter.filename },
              });
            }

            if (filter.directory) {
              conditions.push({
                key: "directory",
                match: { text: filter.directory },
              });
            }

            // Collection-specific filters
            if (
              filter.diagramType &&
              ["diagrams", "merged_diagrams"].includes(collection)
            ) {
              conditions.push({
                key: "diagramType",
                match: { text: filter.diagramType },
              });
            }

            if (
              filter.mergeStrategy &&
              ["merged_documentation", "merged_diagrams"].includes(collection)
            ) {
              conditions.push({
                key: "mergeStrategy",
                match: { text: filter.mergeStrategy },
              });
            }

            if (
              filter.mergeLevel !== undefined &&
              ["merged_documentation", "merged_diagrams"].includes(collection)
            ) {
              conditions.push({
                key: "mergeLevel",
                range: {
                  gte: filter.mergeLevel,
                  lte: filter.mergeLevel,
                },
              });
            }

            if (conditions.length > 0) {
              filterQuery = { must: conditions };
              logger.warn(
                `With filters:`,
                JSON.stringify(filterQuery, null, 2),
              );
            }
          }

          // Generate embedding for the query
          const embeddingResult = await createEmbedding(query);
          if (embeddingResult.error) {
            logger.error(
              chalk.red(`Error generating embedding: ${embeddingResult.error}`),
            );
            continue;
          }

          // Perform the search
          const limit = 10; // More results for user guides
          const searchResult = await search(
            collection,
            embeddingResult.embedding,
            limit,
            filterQuery,
          );

          // Process the results based on the collection type
          const processedResults = searchResult.map(({ score, payload }) => ({
            collection,
            content: payload.content || "",
            similarity: parseFloat(score.toFixed(4)),
            filePath: payload.filePath || "",
            filename: payload.filename || "",
            location: `${payload.filePath}${
              payload.startPosition ? `:${payload.startPosition}` : ""
            }`,
            // Include collection-specific metadata
            ...(collection === "documentation" && {
              chapters: payload.chapters,
              type: payload.type,
            }),
            ...(collection === "diagrams" && {
              diagramType: payload.diagramType,
              diagramElements: payload.diagramElements,
            }),
            ...(collection === "merged_documentation" && {
              sourceFiles: payload.sourceFiles,
              mergeStrategy: payload.mergeStrategy,
              mergeLevel: payload.mergeLevel,
              chapters: payload.chapters,
            }),
            ...(collection === "merged_diagrams" && {
              sourceFiles: payload.sourceFiles,
              mergeStrategy: payload.mergeStrategy,
              mergeLevel: payload.mergeLevel,
              diagramType: payload.diagramType,
            }),
            ...(collection === "codebase" && {
              fileType: payload.fileType,
              extension: payload.extension,
            }),
          }));

          // Create a search results object for this specific collection
          const collectionSearchResult = {
            collection: collection,
            query: query,
            filter: filterQuery,
            results: processedResults,
          };

          searchResults.push(collectionSearchResult);

          logger.warn(
            chalk.green(
              `Found ${processedResults.length} results in ${collection} collection`,
            ),
          );
        }

        // After all collections are processed, you might want to merge or sort across all
        // Sort results within each collection
        searchResults.forEach((searchResult: any) => {
          searchResult.results.sort(
            (a: any, b: any) => b.similarity - a.similarity,
          );
        });

        const totalResults = searchResults.reduce(
          (sum: any, sr: any) => sum + sr.results.length,
          0,
        );
        logger.warn(chalk.green(`Total search results: ${totalResults}`));
      } catch (error) {
        logger.error(
          chalk.red(
            `Error performing semantic search: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    }

    // Index the user guide when ready
    if (data.readyToIndexTheUserGuide && data.userGuide) {
      try {
        // Get embedding dimension from configuration
        const embeddingDimension = getEmbeddingDimension();

        // Ensure collection exists
        if (!(await collectionExists("user_guides"))) {
          const created = await createCollection(
            "user_guides",
            embeddingDimension,
          );
          if (!created) {
            throw new Error(`Failed to create collection user_guides`);
          }
          logger.info(chalk.green(`Created user_guides collection`));
        }

        // Generate embedding for the user guide content
        const result = await createEmbedding(data.userGuide);

        if (result.error) {
          logger.error(
            chalk.red(`Error generating embedding: ${result.error}`),
          );
          throw new Error(`Failed to generate embedding: ${result.error}`);
        }

        // Create metadata for the user guide
        const metadata = {
          content: data.userGuide,
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

        // Create a point for vector database
        const pointId = Date.now() + Math.floor(Math.random() * 1000);
        const point = createPoint(pointId, result.embedding, metadata);

        // Add to the user_guides collection
        const success = await upsertPoints("user_guides", [point]);

        if (success) {
          logger.info(
            chalk.green(
              `User guide indexed successfully for topic: ${data.topic}`,
            ),
          );
        } else {
          logger.error(
            chalk.red(`Failed to index user guide for topic: ${data.topic}`),
          );
        }
      } catch (error) {
        logger.error(
          chalk.red(
            `Error indexing user guide: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    }

    return {
      topic: data.topic,
      targetAudience: data.targetAudience,
      semanticSearchResult: searchResults,
      userGuide: data.userGuide,
      sections: data.sections,
      relatedFiles: data.relatedFiles,
      usedDocumentation: data.usedDocumentation || [],
      usedDiagrams: data.usedDiagrams || [],
      usedMergedDocumentation: data.usedMergedDocumentation || [],
      usedMergedDiagrams: data.usedMergedDiagrams || [],
      usedCodebase: data.usedCodebase || [],
      thought: data.thought,
      thoughtNumber: data.thoughtNumber,
      totalThoughts: data.totalThoughts,
      nextThoughtNeeded: data.nextThoughtNeeded,
      isRevision: data.isRevision,
      revisesThought: data.revisesThought,
      branchFromThought: data.branchFromThought,
      branchId: data.branchId,
      needsMoreThoughts: data.needsMoreThoughts,
      readyToIndexTheUserGuide: data.readyToIndexTheUserGuide,
    };
  }

  formatThought(thoughtData: any) {
    const {
      topic,
      targetAudience,
      semanticSearchResult,
      userGuide,
      thoughtNumber,
      totalThoughts,
      thought,
      isRevision,
      revisesThought,
      branchFromThought,
      branchId,
    } = thoughtData;

    let prefix = "";
    let context = "";
    if (isRevision) {
      prefix = chalk.yellow("🔄 Revision");
      context = ` (revising thought ${revisesThought})`;
    } else if (branchFromThought) {
      prefix = chalk.green("🌿 Branch");
      context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
    } else {
      prefix = chalk.blue("💭 Thought");
      context = "";
    }

    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
    const border = "─".repeat(
      Math.max(
        header.length,
        thought.length,
        topic.length,
        targetAudience.length,
        (userGuide ?? "").length,
      ) + 4,
    );

    // Ensure displays aren't too long
    const maxDisplayLength = border.length - 2;
    const topicDisplay =
      topic.length > maxDisplayLength
        ? topic.substring(0, maxDisplayLength - 3) + "..."
        : topic.padEnd(maxDisplayLength);
    const audienceDisplay =
      targetAudience.length > maxDisplayLength
        ? targetAudience.substring(0, maxDisplayLength - 3) + "..."
        : targetAudience.padEnd(maxDisplayLength);
    const userGuideDisplay = userGuide
      ? userGuide.length > maxDisplayLength
        ? userGuide.substring(0, maxDisplayLength - 3) + "..."
        : userGuide.padEnd(maxDisplayLength)
      : "".padEnd(maxDisplayLength);
    const thoughtDisplay =
      thought.length > maxDisplayLength
        ? thought.substring(0, maxDisplayLength - 3) + "..."
        : thought.padEnd(maxDisplayLength);

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ Topic: ${topicDisplay} │
├${border}┤
│ Audience: ${audienceDisplay} │
├${border}┤
│ ${
      semanticSearchResult
        ? `Search Results: ${semanticSearchResult.length} across collections`
        : "No search results"
    } │
├${border}┤
│ ${userGuideDisplay} │
├${border}┤
│ ${thoughtDisplay} │
└${border}┘`;
  }

  async generateUserGuide(input: any) {
    try {
      const validatedInput = await this.validateThoughtData(input);
      if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
        validatedInput.totalThoughts = validatedInput.thoughtNumber;
      }
      this.thoughtHistory.push(validatedInput);
      if (validatedInput.branchFromThought && validatedInput.branchId) {
        if (!this.branches[validatedInput.branchId]) {
          this.branches[validatedInput.branchId] = [];
        }
        this.branches[validatedInput.branchId].push(validatedInput);
      }
      const formattedThought = this.formatThought(validatedInput);
      logger.info(formattedThought);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                topic: validatedInput.topic,
                targetAudience: validatedInput.targetAudience,
                semanticSearchResult: validatedInput.semanticSearchResult,
                sections: validatedInput.sections,
                relatedFiles: validatedInput.relatedFiles,
                usedSources: {
                  documentation: validatedInput.usedDocumentation,
                  diagrams: validatedInput.usedDiagrams,
                  mergedDocumentation: validatedInput.usedMergedDocumentation,
                  mergedDiagrams: validatedInput.usedMergedDiagrams,
                  codebase: validatedInput.usedCodebase,
                },
                thoughtNumber: validatedInput.thoughtNumber,
                totalThoughts: validatedInput.totalThoughts,
                nextThoughtNeeded: validatedInput.nextThoughtNeeded,
                branches: Object.keys(this.branches),
                thoughtHistoryLength: this.thoughtHistory.length,
              },
              null,
              2,
            ),
          },
        ],
      };
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

const USER_GUIDE_TOOL = {
  name: "generate_user_guide",
  description: `A detailed tool for generating comprehensive user guides using semantic search across multiple collections.
This tool helps create user guides through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Creating end-user documentation
- Generating tutorials and how-to guides
- Building getting started guides
- Creating feature walkthroughs
- Developing troubleshooting guides
- Producing reference documentation
- Creating onboarding materials

Key features:
- Searches across multiple collections (documentation, diagrams, merged docs, codebase)
- Adapts content for target audience
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- Not every thought needs to build linearly - you can branch or backtrack
- Generates comprehensive guides from existing documentation
- Tracks sources used from different collections
- Stores the user guide in the user_guides collection

Collections available for search:
- documentation: Individual documentation files
- diagrams: Visual diagrams and their descriptions
- merged_documentation: Combined documentation from multiple sources
- merged_diagrams: Combined diagrams from multiple sources
- codebase: Actual code files and comments
- user_guides: Existing user guides (to avoid duplication)

Parameters explained:
- topic: The main topic for the user guide
- targetAudience: Who the guide is for (developers, end-users, admins, etc.)
- semanticSearch: Array of search queries across different collections
- userGuide: The generated user guide content
- sections: Sections/chapters in the guide
- relatedFiles: Files referenced in the guide
- usedDocumentation/Diagrams/etc: Track sources from each collection
- thought: Your current thinking step
- nextThoughtNeeded: True if you need more thinking
- thoughtNumber: Current number in sequence
- totalThoughts: Current estimate of thoughts needed
- readyToIndexTheUserGuide: True when ready to store the guide`,
  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "The main topic or title for the user guide",
      },
      targetAudience: {
        type: "string",
        description:
          "The intended audience (e.g., developers, end-users, administrators)",
      },
      sections: {
        type: "array",
        items: {
          type: "string",
          description: "Sections to be included in the user guide",
        },
      },
      needToSearch: {
        type: "boolean",
        description: "If semantic search is needed",
      },
      semanticSearch: {
        type: "array",
        items: {
          type: "object",
          properties: {
            collection: {
              type: "string",
              description: "The collection to search in",
              enum: [
                "documentation",
                "diagrams",
                "merged_documentation",
                "merged_diagrams",
                "codebase",
                "user_guides",
              ],
            },
            query: {
              type: "string",
              description: "The query to search for",
            },
            filter: {
              type: "object",
              properties: {
                filename: {
                  type: "string",
                  description: "Filter by filename",
                },
                directory: {
                  type: "string",
                  description: "Filter by directory",
                },
                diagramType: {
                  type: "string",
                  enum: [
                    "flowchart",
                    "sequenceDiagram",
                    "classDiagram",
                    "stateDiagram",
                    "conceptMap",
                    "treeDiagram",
                  ],
                  description:
                    "Filter by diagram type (for diagram collections)",
                },
                mergeStrategy: {
                  type: "string",
                  enum: ["summarize", "combine", "synthesize"],
                  description:
                    "Filter by merge strategy (for merged collections)",
                },
                mergeLevel: {
                  type: "integer",
                  description: "Filter by merge level (for merged collections)",
                  minimum: 0,
                },
              },
            },
          },
          required: ["collection", "query"],
        },
        description: "Array of semantic searches across different collections",
      },
      userGuide: {
        type: "string",
        description: "Current user guide version",
      },
      relatedFiles: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Files referenced in the user guide",
      },
      usedDocumentation: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Documentation sources used",
      },
      usedDiagrams: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Diagram sources used",
      },
      usedMergedDocumentation: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Merged documentation sources used",
      },
      usedMergedDiagrams: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Merged diagram sources used",
      },
      usedCodebase: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Codebase sources used",
      },
      thought: {
        type: "string",
        description: "Your current thinking step",
      },
      nextThoughtNeeded: {
        type: "boolean",
        description: "Whether another thought step is needed",
      },
      thoughtNumber: {
        type: "integer",
        description: "Current thought number",
        minimum: 1,
      },
      totalThoughts: {
        type: "integer",
        description: "Estimated total thoughts needed",
        minimum: 3,
      },
      isRevision: {
        type: "boolean",
        description: "Whether this revises previous thinking",
      },
      revisesThought: {
        type: "integer",
        description: "Which thought is being reconsidered",
        minimum: 1,
      },
      branchFromThought: {
        type: "integer",
        description: "Branching point thought number",
        minimum: 1,
      },
      branchId: {
        type: "string",
        description: "Branch identifier",
      },
      needsMoreThoughts: {
        type: "boolean",
        description: "If more thoughts are needed",
      },
      readyToIndexTheUserGuide: {
        type: "boolean",
        description: "If the user guide is ready to be indexed",
      },
    },
    required: [
      "topic",
      "targetAudience",
      "needToSearch",
      "thought",
      "nextThoughtNeeded",
      "thoughtNumber",
      "totalThoughts",
      "readyToIndexTheUserGuide",
    ],
  },
};

export { UserGuideGenerator, USER_GUIDE_TOOL };
