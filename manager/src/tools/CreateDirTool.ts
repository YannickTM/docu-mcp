import chalk from "chalk";
import * as filesystem from "../services/filesystem.js";
import { logger } from "../services/logger.js";
/**
 * Tool for creating new directories in the filesystem
 * Supports both absolute and relative paths with recursive creation
 */
class CreateDirTool {
  /**
   * Creates a new directory
   * @private Internal implementation method
   */
  private async createDirectoryInternal(
    dirPath: string,
    recursive: boolean = true,
  ) {
    // Use simplified filesystem functions to create the directory
    const result = await filesystem.createDirectory(dirPath, recursive);

    if (!result.success) {
      throw new Error(result.message);
    }

    if (!result.data || !result.data.path) {
      throw new Error("Directory creation result is invalid");
    }

    return {
      success: true,
      path: result.data.path,
      created: new Date().toISOString(),
      isNewDirectory: result.data.created,
      message: result.data.created
        ? `Directory created successfully`
        : `Directory already exists`,
    };
  }

  /**
   * Process create directory request - main entry point for the tool
   */
  processCreateDirectory(input: any) {
    try {
      const { dirPath, recursive = true } = input;

      if (!dirPath || typeof dirPath !== "string") {
        throw new Error("Invalid dirPath: must be a string");
      }

      // Log formatted information about the request
      const header = chalk.blue(`📁 Creating Directory: ${dirPath}`);
      const options = [
        `Recursive: ${recursive ? chalk.green("✓") : chalk.red("✗")}`,
      ];

      const border = "─".repeat(
        Math.max(header.length, ...options.map((o) => o.length)) + 4,
      );

      logger.warn(`
┌${border}┐
│ ${header.padEnd(border.length - 2)} │
├${border}┤
${options.map((opt) => `│ ${opt.padEnd(border.length - 2)} │`).join("\n")}
└${border}┘`);

      // Execute the directory creation asynchronously
      return this.createDirectoryInternal(dirPath, recursive)
        .then((result) => {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        })
        .catch((error) => {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    status: "failed",
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        });
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
const CREATE_DIR_TOOL = {
  name: "create_directory",
  description: `A tool for creating new directories in the filesystem.
This tool provides functionality to create directories at specified paths.

When to use this tool:
- When you need to create a new directory structure
- When you need to make new directories for organizing files
- When parent directories may not exist and need to be created

Key features:
- Creates directories at the specified path
- Can create all parent directories if they don't exist
- Supports both absolute and relative paths
- Returns information about the created directory

Parameters explained:
- dirPath: Path where the directory should be created (absolute or relative to project root)
- recursive: Whether to create parent directories if they don't exist (default: true)`,
  inputSchema: {
    type: "object",
    properties: {
      dirPath: {
        type: "string",
        description:
          "Path where the directory should be created (absolute or relative to the project root)",
      },
      recursive: {
        type: "boolean",
        description:
          "Whether to create parent directories if they don't exist (default: true)",
      },
    },
    required: ["dirPath"],
  },
};

export { CreateDirTool, CREATE_DIR_TOOL };
