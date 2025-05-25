import chalk from "chalk";
import * as filesystem from "../services/filesystem.js";
import { logger } from "../services/logger.js";
/**
 * Tool for writing content to files in the filesystem
 * Provides options for directory creation and overwrite protection
 */
class WriteFileTool {
  /**
   * Writes content to a file
   */
  private async writeFileInternal(
    filePath: string,
    content: string,
    encoding: BufferEncoding = "utf-8",
    createDirectory: boolean = true,
    overwrite: boolean = true,
  ) {
    // Check file existence for accurate created vs updated status
    const fileExists = await filesystem.fileExists(filePath);

    // Use simplified filesystem to write the file
    const result = await filesystem.writeFile(filePath, content, {
      createDir: createDirectory,
      overwrite,
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    if (!result.data) {
      throw new Error("Write operation did not return file data");
    }

    return {
      success: true,
      path: result.data.path,
      size: Buffer.byteLength(content, encoding),
      encoding,
      created: !fileExists,
      modified: new Date().toISOString(),
      message: fileExists
        ? `File updated successfully`
        : `File created successfully`,
    };
  }

  /**
   * Process write file request - main entry point for the tool
   */
  processWriteFile(input: any) {
    try {
      const {
        filePath,
        content,
        encoding = "utf-8",
        createDirectory = true,
        overwrite = true,
      } = input;

      if (!filePath || typeof filePath !== "string") {
        throw new Error("Invalid filePath: must be a string");
      }

      if (
        content === undefined ||
        content === null ||
        typeof content !== "string"
      ) {
        throw new Error("Invalid content: must be a string");
      }

      // Log formatted information about the request
      const header = chalk.blue(`📝 Writing File: ${filePath}`);
      const options = [
        `Create Directory: ${
          createDirectory ? chalk.green("✓") : chalk.red("✗")
        }`,
        `Overwrite: ${overwrite ? chalk.green("✓") : chalk.red("✗")}`,
        `Encoding: ${chalk.yellow(encoding)}`,
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

      // Execute the file write operation asynchronously
      return this.writeFileInternal(
        filePath,
        content,
        encoding as BufferEncoding,
        createDirectory,
        overwrite,
      )
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

const WRITE_FILE_TOOL = {
  name: "write_file",
  description: `A tool for writing content to files in the filesystem.
This tool provides flexible options for creating, updating, and managing files.

When to use this tool:
- When you need to create new files with generated content
- When you need to update existing files with new content
- When you need to create files in new or existing directories
- When you need to safely write content without overwriting existing files

Key features:
- Writes content to files with specified encoding
- Creates parent directories automatically if they don't exist
- Can protect existing files from being overwritten
- Returns detailed information about the created/updated file
- Supports relative and absolute file paths

Parameters explained:
- filePath: Path to the file to write (absolute or relative to project root)
- content: Content to write to the file 
- encoding: File encoding (default: 'utf-8')
- createDirectory: Whether to create parent directories if they don't exist (default: true)
- overwrite: Whether to overwrite the file if it already exists (default: true)`,
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description:
          "Path to the file to write (absolute or relative to the project root)",
      },
      content: {
        type: "string",
        description:
          "Content to write to the file (will overwrite existing content if overwrite=true)",
      },
      encoding: {
        type: "string",
        description: "File encoding (default: 'utf-8')",
      },
      createDirectory: {
        type: "boolean",
        description:
          "Create parent directories if they don't exist (default: true)",
      },
      overwrite: {
        type: "boolean",
        description:
          "Whether to overwrite the file if it already exists (default: true)",
      },
    },
    required: ["filePath", "content"],
  },
};

export { WriteFileTool, WRITE_FILE_TOOL };
