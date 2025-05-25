// Fixed chalk import for ESM
import chalk from "chalk";
import { createEmbedding } from "../services/embeddings.js";
import { logger } from "../services/logger.js";
import {
  collectionExists,
  createCollection,
  search,
  upsertPoints,
  createPoint,
} from "../services/vectordb.js";

class DiagramMerger {
  thoughtHistory: any[] = [];
  branches: any = {};

  async validateThoughtData(input: any) {
    const data = input;

    // Validate source diagrams
    if (
      !data.sourceDiagrams ||
      !Array.isArray(data.sourceDiagrams) ||
      data.sourceDiagrams.length < 2
    ) {
      throw new Error(
        "Invalid sourceDiagrams: must be an array with at least 2 diagram IDs",
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
    if (typeof data.readyToIndexTheMergedDiagram !== "boolean") {
      throw new Error(
        "Invalid readyToIndexTheMergedDiagram: must be a boolean",
      );
    }
    if (data.mergedDiagram && typeof data.mergedDiagram !== "string") {
      throw new Error("Invalid mergedDiagram: must be a string");
    }
    if (data.diagramType && typeof data.diagramType !== "string") {
      throw new Error("Invalid diagramType: must be a string");
    }
    if (data.diagramElements && !Array.isArray(data.diagramElements)) {
      throw new Error("Invalid diagramElements: must be an array");
    }
    if (data.readyToIndexTheMergedDiagram && !data.mergedDiagram) {
      throw new Error(
        "readyToIndexTheMergedDiagram is true but mergedDiagram is missing",
      );
    }
    if (data.readyToIndexTheMergedDiagram && !data.diagramType) {
      throw new Error(
        "readyToIndexTheMergedDiagram is true but diagramType is missing",
      );
    }

    // Fetch source diagrams if needed
    const sourceDiagramContents: any[] = [];
    const sourceFiles: string[] = [];

    try {
      for (const diagramId of data.sourceDiagrams) {
        // Search diagrams collection by ID
        const filter = {
          must: [
            {
              key: "id",
              match: { text: diagramId },
            },
          ],
        };

        // Create dummy embedding for searching by ID
        const dummyEmbedding = new Array(384).fill(0);
        const results = await search("diagrams", dummyEmbedding, 1, filter);

        if (results.length > 0) {
          const diagram = results[0].payload;
          sourceDiagramContents.push({
            id: diagramId,
            content: diagram.content,
            diagramType: diagram.diagramType,
            diagramElements: diagram.diagramElements || [],
            filePath: diagram.filePath,
          });

          if (diagram.filePath && !sourceFiles.includes(diagram.filePath)) {
            sourceFiles.push(diagram.filePath);
          }
        } else {
          logger.warn(chalk.yellow(`Diagram ${diagramId} not found`));
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `Error fetching source diagrams: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }

    // Handle semantic search in merged diagrams
    let searchResults = data.semanticSearch || undefined;
    if (data.semanticSearch) {
      try {
        const { query, filter } = data.semanticSearch;

        // Always search in merged_diagrams collection
        const collection = "merged_diagrams";

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

              if (filter.diagramType) {
                conditions.push({
                  key: "diagramType",
                  match: { text: filter.diagramType },
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
                diagramType: payload.diagramType || "",
                sourceDiagrams: payload.sourceDiagrams || [],
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

    if (
      data.readyToIndexTheMergedDiagram &&
      data.mergedDiagram &&
      data.diagramType
    ) {
      try {
        // Import getEmbeddingDimension
        const { getEmbeddingDimension } = await import(
          "../services/embeddings.js"
        );

        // Ensure the merged_diagrams collection exists
        if (!(await collectionExists("merged_diagrams"))) {
          const embeddingDimension = getEmbeddingDimension();
          const created = await createCollection(
            "merged_diagrams",
            embeddingDimension,
          );
          if (!created) {
            throw new Error(`Failed to create collection merged_diagrams`);
          }
          logger.info(chalk.green(`Created merged_diagrams collection`));
        }

        // Generate embedding for the merged diagram content - include diagram type for better search
        const textToEmbed = `${data.diagramType}: ${data.mergedDiagram}`;
        const result = await createEmbedding(textToEmbed);

        if (result.error) {
          logger.error(
            chalk.red(`Error generating embedding: ${result.error}`),
          );
          throw new Error(`Failed to generate embedding: ${result.error}`);
        }

        // Create metadata for the merged diagram
        const metadata = {
          content: data.mergedDiagram,
          type: "merged-diagram",
          diagramType: data.diagramType,
          diagramElements: data.diagramElements || [],
          sourceDiagrams: data.sourceDiagrams,
          sourceFiles,
          mergedFromCount: data.sourceDiagrams.length,
          mergeStrategy: data.mergeStrategy,
          mergeDate: new Date().toISOString(),
          parentMergedDiagramId: data.parentMergedDiagramId || "",
          mergeLevel: data.mergeLevel || 0,
          createdAt: new Date().toISOString(),
        };

        // Create a point for vector database
        const point = createPoint(
          `merged_diagram_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Generate a unique ID
          result.embedding,
          metadata,
        );

        // Add to the merged_diagrams collection
        const success = await upsertPoints("merged_diagrams", [point]);

        if (success) {
          logger.info(chalk.green(`Merged diagram indexed successfully`));
        } else {
          logger.error(chalk.red(`Failed to index merged diagram`));
        }
      } catch (error) {
        logger.error(
          chalk.red(
            `Error indexing merged diagram: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    }

    return {
      sourceDiagrams: data.sourceDiagrams,
      sourceDiagramContents,
      sourceFiles,
      mergeStrategy: data.mergeStrategy,
      semanticSearchResult: searchResults,
      mergedDiagram: data.mergedDiagram,
      diagramType: data.diagramType,
      diagramElements: data.diagramElements,
      thought: data.thought,
      thoughtNumber: data.thoughtNumber,
      totalThoughts: data.totalThoughts,
      nextThoughtNeeded: data.nextThoughtNeeded,
      isRevision: data.isRevision,
      revisesThought: data.revisesThought,
      branchFromThought: data.branchFromThought,
      branchId: data.branchId,
      needsMoreThoughts: data.needsMoreThoughts,
      parentMergedDiagramId: data.parentMergedDiagramId,
      mergeLevel: data.mergeLevel || 0,
      readyToIndexTheMergedDiagram: data.readyToIndexTheMergedDiagram,
    };
  }

  formatThought(thoughtData: any) {
    const {
      sourceDiagrams,
      mergeStrategy,
      diagramType,
      semanticSearchResult,
      mergedDiagram,
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
        sourceDiagrams.join(", ").length,
        (mergedDiagram ?? "").length,
      ) + 4,
    );

    // Ensure displays aren't too long
    const maxDisplayLength = border.length - 2;
    const sourceDiagramsDisplay =
      sourceDiagrams.join(", ").length > maxDisplayLength
        ? sourceDiagrams.join(", ").substring(0, maxDisplayLength - 3) + "..."
        : sourceDiagrams.join(", ").padEnd(maxDisplayLength);
    const mergedDiagramDisplay = mergedDiagram
      ? mergedDiagram.length > maxDisplayLength
        ? mergedDiagram.substring(0, maxDisplayLength - 3) + "..."
        : mergedDiagram.padEnd(maxDisplayLength)
      : "".padEnd(maxDisplayLength);
    const thoughtDisplay =
      thought.length > maxDisplayLength
        ? thought.substring(0, maxDisplayLength - 3) + "..."
        : thought.padEnd(maxDisplayLength);

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ Strategy: ${mergeStrategy} │ Level: ${mergeLevel} │ Type: ${
      diagramType || "N/A"
    } │
├${border}┤
│ Sources: ${sourceDiagramsDisplay} │
├${border}┤
│ ${
      semanticSearchResult
        ? `Search Results: ${semanticSearchResult.length}`
        : "No search results"
    } │
├${border}┤
│ ${mergedDiagramDisplay} │
├${border}┤
│ ${thoughtDisplay} │
└${border}┘`;
  }

  async mergeDiagram(input: any) {
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
                sourceDiagrams: validatedInput.sourceDiagrams,
                sourceFiles: validatedInput.sourceFiles,
                mergeStrategy: validatedInput.mergeStrategy,
                diagramType: validatedInput.diagramType,
                mergeLevel: validatedInput.mergeLevel,
                semanticSearchResult: validatedInput.semanticSearchResult,
                diagramElements: validatedInput.diagramElements,
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

const MERGE_DIAGRAM_TOOL = {
  name: "merge_diagram",
  description: `A detailed tool for merging multiple diagrams into a unified diagram.
This tool helps merge diagrams through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Merging multiple diagram sources
- Summarizing related diagrams
- Combining diagrams from multiple files
- Creating higher-level architectural diagrams
- Building hierarchical diagram structures
- Synthesizing diagrams across modules or features

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Searches existing merged diagrams to avoid duplication
- Supports hierarchical merging (merge of merges)
- Tracks source diagrams and files
- Stores the merged diagram in the merged_diagrams collection

Merge strategies:
- summarize: Create a concise summary of the main elements
- combine: Merge all elements while removing duplicates
- synthesize: Create new insights from the combined diagrams

Parameters explained:
- sourceDiagrams: Array of diagram IDs to merge (minimum 2)
- mergeStrategy: How to merge ('summarize', 'combine', or 'synthesize')
- semanticSearch: Search existing merged diagrams
- mergedDiagram: The merged diagram content
- diagramType: Type of diagram (flowchart, sequence, class, etc.)
- diagramElements: Optional array of diagram elements
- thought: Your current thinking step
- nextThoughtNeeded: True if you need more thinking
- thoughtNumber: Current number in sequence
- totalThoughts: Current estimate of thoughts needed
- parentMergedDiagramId: If merging already merged diagrams
- mergeLevel: 0 for first merge, 1+ for merge of merges
- readyToIndexTheMergedDiagram: True when ready to store`,
  inputSchema: {
    type: "object",
    properties: {
      sourceDiagrams: {
        type: "array",
        items: {
          type: "string",
          description: "Diagram ID to merge",
        },
        minItems: 2,
        description: "Array of diagram IDs to merge",
      },
      mergeStrategy: {
        type: "string",
        enum: ["summarize", "combine", "synthesize"],
        description: "How to merge the diagrams",
      },
      diagramType: {
        type: "string",
        description: "Type of the merged diagram",
        enum: [
          "flowchart",
          "sequenceDiagram",
          "classDiagram",
          "stateDiagram",
          "conceptMap",
          "treeDiagram",
        ],
      },
      diagramElements: {
        type: "array",
        items: {
          type: "string",
          description: "Elements in the merged diagram",
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
            description: "The query to search for in merged diagrams",
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
                description: "Filter by diagram type",
              },
            },
          },
        },
        required: ["query"],
      },
      mergedDiagram: {
        type: "string",
        description: "Current merged diagram version",
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
      parentMergedDiagramId: {
        type: "string",
        description: "ID of parent merged diagram for hierarchical merging",
      },
      mergeLevel: {
        type: "integer",
        description:
          "Level of merge (0 for first-level, 1+ for merge of merges)",
        minimum: 0,
      },
      readyToIndexTheMergedDiagram: {
        type: "boolean",
        description: "If the merged diagram is ready to be indexed",
      },
    },
    required: [
      "sourceDiagrams",
      "mergeStrategy",
      "needToSearch",
      "thought",
      "nextThoughtNeeded",
      "thoughtNumber",
      "totalThoughts",
      "readyToIndexTheMergedDiagram",
    ],
  },
};

export { DiagramMerger, MERGE_DIAGRAM_TOOL };
