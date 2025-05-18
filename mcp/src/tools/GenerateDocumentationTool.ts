// Fixed chalk import for ESM
import chalk from "chalk";
import path from "path";
import * as filesystem from "../services/filesystem.js";

class DocumentationGenerator {
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
    if (typeof data.readyToIndexTheDocumentation !== "boolean") {
      throw new Error(
        "Invalid readyToIndexTheDocumentation: must be a boolean"
      );
    }
    if (data.documentation && typeof data.documentation !== "string") {
      throw new Error("Invalid documentation: must be a string");
    }
    if (data.readyToIndexTheDocumentation && !data.documentation) {
      throw new Error(
        "readyToIndexTheDocumentation is true but documentation is missing"
      );
    }

    // Check if file is a valid file path or code
    let fileContent = data.file;
    try {
      // Check if the file path exists
      const isAbsolutePath = path.isAbsolute(data.file);
      const filePath = isAbsolutePath
        ? data.file
        : path.resolve(process.cwd(), data.file);

      // Use simplified filesystem functions to check if file exists and read content
      const fileExists = await filesystem.fileExists(filePath);
      if (fileExists) {
        // If it exists, it's a file path, so load the content
        const readResult = await filesystem.readFile(filePath, "utf-8");

        if (!readResult.success) {
          throw new Error(readResult.message);
        }

        fileContent = readResult.data!.content;
        console.error(chalk.green(`Loaded file content from: ${filePath}`));
      } else {
        // If it doesn't exist, assume it's already code content
        console.error(
          chalk.yellow(
            `Assuming input is code content and not a file path: ${data.file.substring(
              0,
              50
            )}...`
          )
        );
      }
    } catch (error) {
      // If there's an error, assume it's already code content
      console.error(
        chalk.yellow(
          `Error checking file path, assuming it's code: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
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
                  "utf-8"
                );
                if (!readResult.success) {
                  return `Failed to read ${filePath}: ${readResult.message}`;
                }
                return {
                  path: filePath,
                  content: readResult.data!.content,
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
          })
        );
        additionalFileContent = additionalContents;
        console.warn(
          chalk.green(`Loaded ${additionalContents.length} additional files`)
        );
      } catch (error) {
        console.error(
          chalk.red(
            `Error processing additional files: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    }

    // Handle semantic search
    let searchResults = data.seamticSearch || undefined;
    if (data.semanticSearch) {
      try {
        // Import required search services
        const { createEmbedding } = await import("../services/embeddings.js");
        const { collectionExists, search } = await import(
          "../services/vectordb.js"
        );

        const { collection, query, filter } = data.semanticSearch;
        if (!collection || !query) {
          console.error(
            chalk.red("Invalid semanticSearch: missing collection or query")
          );
        } else {
          // Verify that the collection exists
          if (!(await collectionExists(collection))) {
            console.error(chalk.red(`Collection ${collection} does not exist`));
          } else {
            console.warn(
              chalk.blue(`Searching ${collection} collection for: "${query}"`)
            );

            // Build filter if provided
            let filterQuery = undefined;
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

              if (filter.diagramType && collection === "diagrams") {
                conditions.push({
                  key: "diagramType",
                  match: { text: filter.diagramType },
                });
              }

              if (conditions.length > 0) {
                filterQuery = { must: conditions };
                console.warn(
                  `With filters:`,
                  JSON.stringify(filterQuery, null, 2)
                );
              }
            }

            // Generate embedding for the query
            const embeddingResult = await createEmbedding(query);
            if (embeddingResult.error) {
              console.error(
                chalk.red(
                  `Error generating embedding: ${embeddingResult.error}`
                )
              );
            } else {
              // Perform the search
              const limit = 5; // Limit results to top 5 matches
              const searchResult = await search(
                collection,
                embeddingResult.embedding,
                limit,
                filterQuery
              );

              // Process the results based on the collection type
              searchResults = searchResult.map(({ score, payload }) => ({
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
                ...(collection === "diagrams" && {
                  title: payload.title,
                  diagramType: payload.diagramType,
                  description: payload.description,
                }),
              }));

              console.warn(
                chalk.green(
                  `Found ${searchResults.length} results in ${collection} collection`
                )
              );
            }
          }
        }
      } catch (error) {
        console.error(
          chalk.red(
            `Error performing semantic search: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    }

    if (data.readyToIndexTheDocumentation && data.file && data.documentation) {
      // Import required services
      const { createEmbedding, getEmbeddingDimension } = await import("../services/embeddings.js");
      const { upsertPoints, createPoint, collectionExists, createCollection } = await import(
        "../services/vectordb.js"
      );

      try {
        // Get embedding dimension from configuration
        const embeddingDimension = getEmbeddingDimension();
        
        // Ensure collection exists
        if (!(await collectionExists("documentation"))) {
          const created = await createCollection(
            "documentation",
            embeddingDimension
          );
          if (!created) {
            throw new Error(
              `Failed to create collection documentation`
            );
          }
          console.error(
            chalk.green(`Created documentation collection`)
          );
        }

        // Generate embedding for the documentation content
        const result = await createEmbedding(data.documentation);

        if (result.error) {
          console.error(
            chalk.red(`Error generating embedding: ${result.error}`)
          );
          throw new Error(`Failed to generate embedding: ${result.error}`);
        }

        // Create metadata for the document
        const metadata = {
          content: data.documentation,
          filePath: data.file,
          type: "documentation",
          chapters: data.chapters || [],
          createdAt: new Date().toISOString(),
        };

        // Create a point for vector database
        const point = createPoint(
          `diagram_${Date.now()}_${Math.floor(Math.random() * 1000)}`, // Generate a unique ID
          result.embedding,
          metadata
        );

        // Add to the documentation collection
        const success = await upsertPoints("documentation", [point]);

        if (success) {
          console.error(
            chalk.green(
              `Documentation indexed successfully for file: ${data.file}`
            )
          );
        } else {
          console.error(
            chalk.red(`Failed to index documentation for file: ${data.file}`)
          );
        }
      } catch (error) {
        console.error(
          chalk.red(
            `Error indexing documentation: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        );
      }
    }

    return {
      file: fileContent,
      contentOfAdditionalFilesToRead: additionalFileContent,
      semanticSearchResult: searchResults,
      documentation: data.documentation,
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
      readyToIndexTheDocumentation: data.readyToIndexTheDocumentation,
    };
  }

  formatThought(thoughtData: any) {
    const {
      file,
      contentOfAdditionalFilesToRead,
      semanticSearchResult,
      documentation,
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
        file.length,
        (documentation ?? "").length
      ) + 4
    );
    // Ensure file and documentation aren't too long for display by truncating them
    const maxDisplayLength = border.length - 2;
    const fileDisplay =
      file.length > maxDisplayLength
        ? file.substring(0, maxDisplayLength - 3) + "..."
        : file.padEnd(maxDisplayLength);
    const docDisplay = documentation
      ? documentation.length > maxDisplayLength
        ? documentation.substring(0, maxDisplayLength - 3) + "..."
        : documentation.padEnd(maxDisplayLength)
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
│ ${docDisplay} │
├${border}┤
│ ${thoughtDisplay} │
└${border}┘`;
  }

  async generateDocumentation(input: any) {
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
      console.error(formattedThought);
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
                chapters: validatedInput.chapters,
                thoughtNumber: validatedInput.thoughtNumber,
                totalThoughts: validatedInput.totalThoughts,
                nextThoughtNeeded: validatedInput.nextThoughtNeeded,
                branches: Object.keys(this.branches),
                thoughtHistoryLength: this.thoughtHistory.length,
              },
              null,
              2
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
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
}

const DOCUMENTATION_TOOL = {
  name: "generate_documentation",
  description: `A detailed tool for dynamic and generate documentations.
This tool helps analyze code through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down exising code
- Generating documentation for existing code
- Understanding complex codebases
- Generating documentation for new code
- Planning and design with room for revision
- Analysis that might need course correction
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer
- Stores the documentation in the database, when finished


Parameters explained:
- file: The file path or content of the codefile to analyze
- additionalFilesToRead: Additional files to read for context
- semanticSearch: The semantic search query to find relevant information
* The available collections to search in (codebase, documentation, diagram)
* Available filters: [filename, directory, diagramType]
- documentation: The documentation to be generated
- chapters: The chapters to be included in the documentation
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
- readyToIndexTheDocumentation: If the documentation is ready to be indexed

You should:
1. Start with reading the file and give an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate a solution hypothesis when appropriate
8. Verify the hypothesis based on the Chain of Thought steps
9. Repeat the process until satisfied with the solution
10. Provide a single, ideally correct answer as the final output
11. Only set next_thought_needed to false when truly done and a satisfactory answer is reached
12. When you are finished set readyToIndexTheDocumentation to true to store the documentation inside the database
13. you are able to read addition fiels if needed by providing a list of file paths in the additionalFilesToRead parameter
14. you are able to search the documentation using the semanticSearch parameter
- The file path or content of the codefile to analyze
- The semantic search query to find relevant information
- The available collections to search in (codebase, documentation, diagram)`,
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "string",
        description: "The file path or content of the codefile to analyze",
      },
      chapters: {
        type: "array",
        items: {
          type: "string",
          description: "Chapters to be included in the documentation",
        },
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
      seamticSearch: {
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
            description: "The query to search for in the documentation",
          },
        },
        required: ["collection", "query"],
      },
      documentation: {
        type: "string",
        description: "Current docuemtation version",
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
      readyToIndexTheDocumentation: {
        type: "boolean",
        description: "If the documentation is ready to be indexed",
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
      "readyToIndexTheDocumentation",
    ],
  },
};

export { DocumentationGenerator, DOCUMENTATION_TOOL };
