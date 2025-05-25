// Fixed chalk import for ESM
import chalk from "chalk";
import path from "path";
import * as filesystem from "../services/filesystem.js";
import { logger } from "../services/logger.js";

class CodeExplainer {
  thoughtHistory: any[] = [];
  branches: any = {};

  async validateThoughtData(input: any) {
    const data = input;
    if (!data.file || typeof data.file !== "string") {
      throw new Error("Invalid file: must be a string");
    }
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

    // Check if file is a valid file path or code
    let fileContent = data.file;
    try {
      // Check if the file path exists
      const isAbsolutePath = path.isAbsolute(data.file);
      const filePath = isAbsolutePath
        ? data.file
        : path.resolve(process.cwd(), data.file);

      // check if file exists and read content
      const fileExists = await filesystem.fileExists(filePath);
      if (fileExists) {
        // If it exists, it's a file path, so load the content
        const readResult = await filesystem.readFile(filePath, "utf-8");

        if (!readResult.success) {
          throw new Error(readResult.message);
        }

        if (!readResult.data || !readResult.data.content) {
          logger.warn(
            chalk.yellow(`File content is empty or not found at: ${filePath}`),
          );
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

        fileContent = readResult.data.content;
        logger.info(chalk.green(`Loaded file content from: ${filePath}`));
      } else {
        // If it doesn't exist, assume it's already code content
        logger.warn(
          chalk.yellow(
            `Assuming input is code content and not a file path: ${data.file.substring(
              0,
              50,
            )}...`,
          ),
        );
      }
    } catch (error) {
      // If there's an error, assume it's already code content
      logger.warn(
        chalk.yellow(
          `Error checking file path, assuming it's code: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }

    // Handle additional files to read
    let additionalFileContent = undefined;
    if (
      data.additionalFilesToRead &&
      Array.isArray(data.additionalFilesToRead)
    ) {
      try {
        const additionalContents = await Promise.all(
          data.additionalFilesToRead.map(async (filePath: string) => {
            try {
              const isAbsolutePath = path.isAbsolute(filePath);
              const resolvedPath = isAbsolutePath
                ? filePath
                : path.resolve(process.cwd(), filePath);

              const fileExists = await filesystem.fileExists(resolvedPath);
              if (fileExists) {
                const readResult = await filesystem.readFile(
                  resolvedPath,
                  "utf-8",
                );
                if (!readResult.success) {
                  return `Failed to read ${filePath}: ${readResult.message}`;
                }

                if (!readResult.data || !readResult.data.content) {
                  logger.warn(
                    chalk.yellow(
                      `File content is empty or not found at: ${filePath}`,
                    ),
                  );
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
                return {
                  path: filePath,
                  content: readResult.data.content,
                };
              } else {
                return {
                  path: filePath,
                  error: `File does not exist: ${filePath}`,
                };
              }
            } catch (error) {
              return {
                path: filePath,
                error: `Error reading file: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              };
            }
          }),
        );
        additionalFileContent = additionalContents;
        logger.warn(
          chalk.green(`Loaded ${additionalContents.length} additional files`),
        );
      } catch (error) {
        logger.error(
          chalk.red(
            `Error processing additional files: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    }

    // Handle semantic search
    let searchResults = data.semanticSearch || undefined;
    if (data.semanticSearch) {
      try {
        // Import required search services
        const { createEmbedding } = await import("../services/embeddings.js");
        const { collectionExists, search } = await import(
          "../services/vectordb.js"
        );

        const { collection, query, filter } = data.semanticSearch;
        if (!collection || !query) {
          logger.error(
            chalk.red("Invalid semanticSearch: missing collection or query"),
          );
        } else {
          // Verify that the collection exists
          if (!(await collectionExists(collection))) {
            logger.warn(chalk.red(`Collection ${collection} does not exist`));
          } else {
            logger.warn(
              chalk.blue(`Searching ${collection} collection for: "${query}"`),
            );

            // Build filter if provided
            let filterQuery = {};
            if (filter) {
              const conditions = [];

              // Add filter conditions based on the provided filters
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

              if (filter.diagramType && collection === "diagram") {
                conditions.push({
                  key: "diagramType",
                  match: { text: filter.diagramType },
                });
              }

              // Only log if we have actual filters
              if (Object.keys(filterQuery).length > 0) {
                logger.warn(
                  `With filters:`,
                  JSON.stringify(filterQuery, null, 2),
                );
              } else {
                filterQuery = {};
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
              const limit = 5; // Limit results to top 5 matches
              const searchResult = await search(
                collection,
                embeddingResult.embedding,
                limit,
                filterQuery,
              );

              // Process the results and create the expected structure
              const processedResults = searchResult.map(
                ({ score, payload }) => ({
                  content: payload.content || "",
                  similarity: parseFloat(score.toFixed(4)),
                  filePath: payload.filePath || "",
                  filename: payload.filename || "",
                  location: `${payload.filePath}${
                    payload.startPosition ? `:${payload.startPosition}` : ""
                  }`,
                  // Include collection-specific metadata
                  ...(collection === "documentation" && {
                    title: payload.title,
                    docType: payload.docType,
                    section: payload.section,
                    tags: payload.tags,
                  }),
                  ...(collection === "diagram" && {
                    title: payload.title,
                    diagramType: payload.diagramType,
                    description: payload.description,
                  }),
                }),
              );

              searchResults = {
                collection: collection, // assuming 'collection' variable exists
                query: query,
                filter: filterQuery,
                results: processedResults, // add the actual results
              };

              logger.info(
                chalk.green(
                  `Found ${searchResult.length} results in ${collection} collection`,
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

    return {
      file: fileContent,
      contentOfAdditionalFilesToRead: additionalFileContent,
      semanticSearchResult: searchResults,
      explanation: data.explanation || "", // Default to empty string if undefined
      thought: data.thought,
      thoughtNumber: data.thoughtNumber,
      totalThoughts: data.totalThoughts,
      nextThoughtNeeded: data.nextThoughtNeeded,
      isRevision: data.isRevision,
      revisesThought: data.revisesThought,
      branchFromThought: data.branchFromThought,
      branchId: data.branchId,
      needsMoreThoughts: data.needsMoreThoughts,
    };
  }

  formatThought(thoughtData: any) {
    const {
      file,
      contentOfAdditionalFilesToRead,
      semanticSearchResult,
      explanation,
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

    // Fix length property names and use empty string if explanation is undefined
    const border = "─".repeat(
      Math.max(
        header.length,
        thought.length,
        file.length,
        (explanation || "").length,
      ) + 4,
    );

    // Ensure file and explanation aren't too long for display by truncating them
    const maxDisplayLength = border.length - 2;
    const fileDisplay =
      file.length > maxDisplayLength
        ? file.substring(0, maxDisplayLength - 3) + "..."
        : file.padEnd(maxDisplayLength);
    const explanationDisplay = explanation
      ? explanation.length > maxDisplayLength
        ? explanation.substring(0, maxDisplayLength - 3) + "..."
        : explanation.padEnd(maxDisplayLength)
      : "".padEnd(maxDisplayLength);
    const thoughtDisplay =
      thought.length > maxDisplayLength
        ? thought.substring(0, maxDisplayLength - 3) + "..."
        : thought.padEnd(maxDisplayLength);

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${fileDisplay} │
├${border}┤
│ ${contentOfAdditionalFilesToRead} │
├${border}┤
│ ${semanticSearchResult} │
├${border}┤
│ ${explanationDisplay} │
├${border}┤
│ ${thoughtDisplay} │
└${border}┘`;
  }

  async explainCode(input: any) {
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
                file: validatedInput.file,
                contentOfAdditionalFilesToRead:
                  validatedInput.contentOfAdditionalFilesToRead,
                semanticSearchResult: validatedInput.semanticSearchResult,
                explanation: validatedInput.explanation,
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

const CODE_EXPLAIN_TOOL = {
  name: "explain_code",
  description: `A detailed tool for analyzing code through a sequential thought process.
This tool helps analyze code through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down functionality into smaller parts
- Analyzing existing code to identify patterns or structures
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

Key features:
- You can provide a file path or code content to analyze
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer

Parameters explained:
- file: The file or code snippet being analyzed
- additionalFilesToRead: Additional files to read for context
- semanticSearch: The semantic search query to find relevant information
* The available collections to search in (codebase, documentation, diagram)
* Available filters: [filename, directory, diagramType]
- explanation: The explanation of the code, will be improved over the iterrations
- thought: Your current thinking step, which can include:
* Regular analytical steps
* Revisions of previous thoughts
* Questions about previous decisions
* Realizations about needing more analysis
* Changes in approach
* Hypothesis generation
* Hypothesis verification
- nextThoughtNeeded: True if you need more thinking, even if at what seemed like the end
- thoughtNumber: Current number in sequence (can go beyond initial total if needed)
- totalThoughts: Current estimate of thoughts needed (can be adjusted up/down)
- isRevision: A boolean indicating if this thought revises previous thinking
- revisesThought: If is_revision is true, which thought number is being reconsidered
- branchFromThought: If branching, which thought number is the branching point
- branchId: Identifier for the current branch (if any)
- needsMoreThoughts: If reaching end but realizing more thoughts needed

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate a solution hypothesis when appropriate
8. Verify the hypothesis based on the Chain of Thought steps
9. Repeat the process until satisfied with the solution
10. Provide a single, ideally correct answer as the final output
11. Only set nextThoughtNeeded to false when truly done and a satisfactory answer is reached`,
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "File or code snippet being analyzed",
      },
      needToReadAdditionalFiles: {
        type: "boolean",
        description: "If additional files need to be read",
      },
      additionalFilesToRead: {
        type: "array",
        items: {
          type: "string",
          description: "Additional files to read for context",
        },
      },
      needToSearch: {
        type: "boolean",
        description: "If semantic search is needed",
      },
      semanticSearch: {
        type: "object",
        properties: {
          collection: {
            type: "string",
            description: "The collection to search in",
            enum: ["codebase", "documentation", "diagram"],
          },
          filter: {
            type: "object",
            properties: {
              filename: {
                type: "string",
                description: "The filename to filter results by",
              },
              directory: {
                type: "string",
                description: "The directory to filter results by",
              },
              diagramType: {
                type: "string",
                description: "The diagram type to filter results by",
                enum: [
                  "flowchart",
                  "sequenceDiagram",
                  "classDiagram",
                  "stateDiagram",
                  "conceptMap",
                  "treeDiagram",
                ],
              },
            },
          },
          query: {
            type: "string",
            description: "The query to search for",
          },
        },
        required: ["collection", "query"],
      },
      explanation: {
        type: "string",
        description: "Explanation of the code",
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
        minimum: 3,
      },
      totalThoughts: {
        type: "integer",
        description: "Estimated total thoughts needed",
        minimum: 1,
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
    },
    required: [
      "file",
      "needToReadAdditionalFiles",
      "needToSearch",
      "thought",
      "nextThoughtNeeded",
      "thoughtNumber",
      "totalThoughts",
    ],
  },
};

export { CodeExplainer, CODE_EXPLAIN_TOOL };
