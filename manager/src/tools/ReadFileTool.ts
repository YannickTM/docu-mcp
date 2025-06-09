import chalk from "chalk";
import * as filesystem from "../services/filesystem.js";
import { logger } from "../services/logger.js";
/**
 * Tool for reading file content from the filesystem
 * Handles both absolute and relative paths with encoding options
 */
class ReadFileTool {
  /**
   * Reads file content
   */
  async readFile(
    filePath: string,
    encoding: BufferEncoding = "utf-8",
    includeMetadata: boolean = true,
  ) {
    // Read file content using simplified filesystem functions
    const result = await filesystem.readFile(filePath, encoding);

    if (!result.success) {
      throw new Error(result.message);
    }

    if (!result.data || !result.data.content) {
      throw new Error("File content is empty or not found");
    }

    // Create response object
    const responseObj: any = {
      content: result.data.content,
      path: filesystem.resolvePath(filePath),
      size: Buffer.byteLength(result.data.content, encoding),
      encoding,
    };

    // Add metadata if requested
    if (includeMetadata && result.data.metadata) {
      responseObj.metadata = {
        size: result.data.metadata.size,
        created: result.data.metadata.created,
        modified: result.data.metadata.modified,
        accessed: result.data.metadata.accessed,
        extension: result.data.metadata.extension,
        filename: result.data.metadata.filename,
        directory: result.data.metadata.directory,
      };
    }

    return responseObj;
  }

  processReadFile(input: any) {
    try {
      const { filePath, encoding = "utf-8", includeMetadata = true } = input;

      if (!filePath || typeof filePath !== "string") {
        throw new Error("Invalid filePath: must be a string");
      }

      // Log formatted information about the request
      const header = chalk.blue(`📄 Reading File: ${filePath}`);
      const options = [
        `Encoding: ${chalk.yellow(encoding)}`,
        `Include Metadata: ${
          includeMetadata ? chalk.green("✓") : chalk.red("✗")
        }`,
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

      // Execute the file read operation asynchronously
      return this.readFile(
        filePath,
        encoding as BufferEncoding,
        includeMetadata,
      )
        .then((result) => {
          // Create a result object that only includes the content and metadata, not the full file
          // This ensures large file contents don't overwhelm the response
          const responseObj = {
            content: result.content,
            path: result.path,
            size: result.size,
            encoding: result.encoding,
          };

          if (includeMetadata) {
            Object.assign(responseObj, { metadata: result.metadata });
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(responseObj, null, 2),
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

const READ_FILE_TOOL = {
  name: "read_file",
  description: `A tool for reading file content from the filesystem.
This tool provides functionality to read files with different encoding options.

When to use this tool:
- When you need to read and analyze the content of a file
- When you need to examine file metadata (size, creation date, etc.)
- When you need to process file content for further operations
- When you need to check if a file exists and access its content

Key features:
- Reads file content with specified encoding
- Can include detailed file metadata in the response
- Handles both relative and absolute file paths
- Provides meaningful error messages for file access issues
- Returns both content and file information

Parameters explained:
- filePath: Path to the file to read (absolute or relative to project root)
- encoding: File encoding (default: 'utf-8')
- includeMetadata: Whether to include file metadata in the response (default: true)`,
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description:
          "Path to the file to read (absolute or relative to the project root)",
      },
      encoding: {
        type: "string",
        description: "File encoding (default: 'utf-8')",
      },
      includeMetadata: {
        type: "boolean",
        description:
          "Whether to include file metadata in the response (size, modification time, etc.)",
      },
    },
    required: ["filePath"],
  },
};

export { ReadFileTool, READ_FILE_TOOL };
