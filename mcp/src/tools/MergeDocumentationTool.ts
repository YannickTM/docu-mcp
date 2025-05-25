// Fixed chalk import for ESM
import chalk from "chalk";
import { createEmbedding } from "../services/embeddings.js";
import { logger } from "../services/logger.js";
import {
  collectionExists,
  search,
  upsertPoints,
  createPoint,
} from "../services/vectordb.js";

class DocumentationMerger {
  thoughtHistory: any[] = [];
  branches: any = {};

  async validateThoughtData(input: any) {
    const data = input;

    // Validate source documentations
    if (
      !data.sourceDocumentations ||
      !Array.isArray(data.sourceDocumentations) ||
      data.sourceDocumentations.length < 2
    ) {
      throw new Error(
        "Invalid sourceDocumentations: must be an array with at least 2 document IDs",
      );
    }

    // Validate merge strategy
    if (
      !data.mergeStrategy ||
      !["summarize", "combine", "synthesize"].includes(data.mergeStrategy)
    ) {
      throw new Error(
        "Invalid mergeStrategy: must be 'summarize', 'combine', or 'synthesize'",
      );
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
    if (typeof data.readyToIndexTheMergedDocumentation !== "boolean") {
      throw new Error(
        "Invalid readyToIndexTheMergedDocumentation: must be a boolean",
      );
    }
    if (
      data.mergedDocumentation &&
      typeof data.mergedDocumentation !== "string"
    ) {
      throw new Error("Invalid mergedDocumentation: must be a string");
    }
    if (data.chapters && !Array.isArray(data.chapters)) {
      throw new Error("Invalid chapters: must be an array");
    }
    if (data.readyToIndexTheMergedDocumentation && !data.mergedDocumentation) {
      throw new Error(
        "readyToIndexTheMergedDocumentation is true but mergedDocumentation is missing",
      );
    }

    // Fetch source documentations if needed
    const sourceDocContents: any[] = [];
    const sourceFiles: string[] = [];

    try {
      for (const docId of data.sourceDocumentations) {
        // Search documentation collection by ID
        const filter = {
          must: [
            {
              key: "id",
              match: { text: docId },
            },
          ],
        };

        // Create dummy embedding for searching by ID
        const dummyEmbedding = new Array(384).fill(0);
        const results = await search(
          "documentation",
          dummyEmbedding,
          1,
          filter,
        );

        if (results.length > 0) {
          const doc = results[0].payload;
          sourceDocContents.push({
            id: docId,
            content: doc.content,
            chapters: doc.chapters || [],
            filePath: doc.filePath,
          });

          if (doc.filePath && !sourceFiles.includes(doc.filePath)) {
            sourceFiles.push(doc.filePath);
          }
        } else {
          logger.warn(chalk.yellow(`Documentation ${docId} not found`));
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `Error fetching source documentations: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }

    // Handle semantic search in merged documentations
    let searchResults = data.semanticSearch || undefined;
    if (data.semanticSearch) {
      try {
        const { query, filter } = data.semanticSearch;

        // Always search in merged_documentation collection
        const collection = "merged_documentation";

        if (!query) {
          logger.error(chalk.red("Invalid semanticSearch: missing query"));
        } else {
          // Verify that the collection exists
          if (!(await collectionExists(collection))) {
            logger.error(chalk.red(`Collection ${collection} does not exist`));
          } else {
            logger.warn(
              chalk.blue(`Searching ${collection} collection for: "${query}"`),
            );

            // Build filter if provided
            let filterQuery = undefined;
            if (filter) {
              const conditions = [];

              if (filter.mergeLevel !== undefined) {
                conditions.push({
                  key: "mergeLevel",
                  range: {
                    gte: filter.mergeLevel,
                    lte: filter.mergeLevel,
                  },
                });
              }

              if (filter.mergeStrategy) {
                conditions.push({
                  key: "mergeStrategy",
                  match: { text: filter.mergeStrategy },
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
                chalk.red(
                  `Error generating embedding: ${embeddingResult.error}`,
                ),
              );
            } else {
              // Perform the search
              const limit = 5;
              const searchResult = await search(
                collection,
                embeddingResult.embedding,
                limit,
                filterQuery,
              );

              // Process the results
              searchResults = searchResult.map(({ score, payload }) => ({
                content: payload.content || "",
                similarity: parseFloat(score.toFixed(4)),
                sourceFiles: payload.sourceFiles || [],
                mergeLevel: payload.mergeLevel || 0,
                mergeStrategy: payload.mergeStrategy || "",
                sourceDocumentations: payload.sourceDocumentations || [],
                mergedFromCount: payload.mergedFromCount || 0,
              }));

              logger.warn(
                chalk.green(
                  `Found ${searchResults.length} results in ${collection} collection`,
                ),
              );
            }
          }
        }
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

    if (data.readyToIndexTheMergedDocumentation && data.mergedDocumentation) {
      try {
        // Import getEmbeddingDimension and createCollection
        const { getEmbeddingDimension } = await import(
          "../services/embeddings.js"
        );
        const { createCollection: createColl } = await import(
          "../services/vectordb.js"
        );

        // Ensure the merged_documentation collection exists
        if (!(await collectionExists("merged_documentation"))) {
          const embeddingDimension = getEmbeddingDimension();
          const created = await createColl(
            "merged_documentation",
            embeddingDimension,
          );
          if (!created) {
            throw new Error(`Failed to create collection merged_documentation`);
          }
          logger.info(chalk.green(`Created merged_documentation collection`));
        }

        // Generate embedding for the merged documentation content
        const result = await createEmbedding(data.mergedDocumentation);

        if (result.error) {
          logger.error(
            chalk.red(`Error generating embedding: ${result.error}`),
          );
          throw new Error(`Failed to generate embedding: ${result.error}`);
        }

        // Create metadata for the merged document
        const metadata = {
          content: data.mergedDocumentation,
          type: "merged-documentation",
          chapters: data.chapters || [],
          sourceDocumentations: data.sourceDocumentations,
          sourceFiles,
          mergedFromCount: data.sourceDocumentations.length,
          mergeStrategy: data.mergeStrategy,
          mergeDate: new Date().toISOString(),
          parentMergedDocumentationId: data.parentMergedDocumentationId || "",
          mergeLevel: data.mergeLevel || 0,
          createdAt: new Date().toISOString(),
        };

        // Create a point for vector database
        const point = createPoint(
          `merged_doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Generate a unique ID
          result.embedding,
          metadata,
        );

        // Add to the merged_documentation collection
        const success = await upsertPoints("merged_documentation", [point]);

        if (success) {
          logger.error(
            chalk.green(`Merged documentation indexed successfully`),
          );
        } else {
          logger.error(chalk.red(`Failed to index merged documentation`));
        }
      } catch (error) {
        logger.error(
          chalk.red(
            `Error indexing merged documentation: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    }

    return {
      sourceDocumentations: data.sourceDocumentations,
      sourceDocContents,
      sourceFiles,
      mergeStrategy: data.mergeStrategy,
      semanticSearchResult: searchResults,
      mergedDocumentation: data.mergedDocumentation,
      chapters: data.chapters,
      thought: data.thought,
      thoughtNumber: data.thoughtNumber,
      totalThoughts: data.totalThoughts,
      nextThoughtNeeded: data.nextThoughtNeeded,
      isRevision: data.isRevision,
      revisesThought: data.revisesThought,
      branchFromThought: data.branchFromThought,
      branchId: data.branchId,
      needsMoreThoughts: data.needsMoreThoughts,
      parentMergedDocumentationId: data.parentMergedDocumentationId,
      mergeLevel: data.mergeLevel || 0,
      readyToIndexTheMergedDocumentation:
        data.readyToIndexTheMergedDocumentation,
    };
  }

  formatThought(thoughtData: any) {
    const {
      sourceDocumentations,
      mergeStrategy,
      semanticSearchResult,
      mergedDocumentation,
      thoughtNumber,
      totalThoughts,
      thought,
      isRevision,
      revisesThought,
      branchFromThought,
      branchId,
      mergeLevel,
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
        sourceDocumentations.join(", ").length,
        (mergedDocumentation ?? "").length,
      ) + 4,
    );

    // Ensure displays aren't too long
    const maxDisplayLength = border.length - 2;
    const sourceDocsDisplay =
      sourceDocumentations.join(", ").length > maxDisplayLength
        ? sourceDocumentations.join(", ").substring(0, maxDisplayLength - 3) +
          "..."
        : sourceDocumentations.join(", ").padEnd(maxDisplayLength);
    const mergedDocDisplay = mergedDocumentation
      ? mergedDocumentation.length > maxDisplayLength
        ? mergedDocumentation.substring(0, maxDisplayLength - 3) + "..."
        : mergedDocumentation.padEnd(maxDisplayLength)
      : "".padEnd(maxDisplayLength);
    const thoughtDisplay =
      thought.length > maxDisplayLength
        ? thought.substring(0, maxDisplayLength - 3) + "..."
        : thought.padEnd(maxDisplayLength);

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ Strategy: ${mergeStrategy} │ Level: ${mergeLevel} │
├${border}┤
│ Sources: ${sourceDocsDisplay} │
├${border}┤
│ ${
      semanticSearchResult
        ? `Search Results: ${semanticSearchResult.length}`
        : "No search results"
    } │
├${border}┤
│ ${mergedDocDisplay} │
├${border}┤
│ ${thoughtDisplay} │
└${border}┘`;
  }

  async mergeDocumentation(input: any) {
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
                sourceDocumentations: validatedInput.sourceDocumentations,
                sourceFiles: validatedInput.sourceFiles,
                mergeStrategy: validatedInput.mergeStrategy,
                mergeLevel: validatedInput.mergeLevel,
                semanticSearchResult: validatedInput.semanticSearchResult,
                chapters: validatedInput.chapters,
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

const MERGE_DOCUMENTATION_TOOL = {
  name: "merge_documentation",
  description: `A detailed tool for merging multiple documentations into a unified document.
This tool helps merge documentations through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Merging multiple documentation sources
- Summarizing related documentations
- Combining documentation from multiple files
- Creating higher-level documentation overviews
- Building hierarchical documentation structures
- Synthesizing documentation across modules or features

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Searches existing merged documentations to avoid duplication
- Supports hierarchical merging (merge of merges)
- Tracks source documents and files
- Stores the merged documentation in the merged_documentation collection

Merge strategies:
- summarize: Create a concise summary of the main points
- combine: Merge all content while removing duplicates
- synthesize: Create new insights from the combined knowledge

Parameters explained:
- sourceDocumentations: Array of documentation IDs to merge (minimum 2)
- mergeStrategy: How to merge ('summarize', 'combine', or 'synthesize')
- semanticSearch: Search existing merged documentations
- mergedDocumentation: The merged documentation content
- chapters: Optional chapters for the merged documentation
- thought: Your current thinking step
- nextThoughtNeeded: True if you need more thinking
- thoughtNumber: Current number in sequence
- totalThoughts: Current estimate of thoughts needed
- parentMergedDocumentationId: If merging already merged docs
- mergeLevel: 0 for first merge, 1+ for merge of merges
- readyToIndexTheMergedDocumentation: True when ready to store`,
  inputSchema: {
    type: "object",
    properties: {
      sourceDocumentations: {
        type: "array",
        items: {
          type: "string",
          description: "Documentation ID to merge",
        },
        minItems: 2,
        description: "Array of documentation IDs to merge",
      },
      mergeStrategy: {
        type: "string",
        enum: ["summarize", "combine", "synthesize"],
        description: "How to merge the documentations",
      },
      chapters: {
        type: "array",
        items: {
          type: "string",
          description: "Chapters to be included in the merged documentation",
        },
      },
      needToSearch: {
        type: "boolean",
        description: "If semantic search is needed",
      },
      semanticSearch: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The query to search for in merged documentations",
          },
          filter: {
            type: "object",
            properties: {
              mergeLevel: {
                type: "integer",
                description: "Filter by merge level",
                minimum: 0,
              },
              mergeStrategy: {
                type: "string",
                enum: ["summarize", "combine", "synthesize"],
                description: "Filter by merge strategy",
              },
            },
          },
        },
        required: ["query"],
      },
      mergedDocumentation: {
        type: "string",
        description: "Current merged documentation version",
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
      parentMergedDocumentationId: {
        type: "string",
        description:
          "ID of parent merged documentation for hierarchical merging",
      },
      mergeLevel: {
        type: "integer",
        description:
          "Level of merge (0 for first-level, 1+ for merge of merges)",
        minimum: 0,
      },
      readyToIndexTheMergedDocumentation: {
        type: "boolean",
        description: "If the merged documentation is ready to be indexed",
      },
    },
    required: [
      "sourceDocumentations",
      "mergeStrategy",
      "needToSearch",
      "thought",
      "nextThoughtNeeded",
      "thoughtNumber",
      "totalThoughts",
      "readyToIndexTheMergedDocumentation",
    ],
  },
};

export { DocumentationMerger, MERGE_DOCUMENTATION_TOOL };
