import chalk from "chalk";
import * as filesystem from "../services/filesystem.js";
import type { DirectoryEntry } from "../services/filesystem.js";
import { logger } from "../services/logger.js";
/**
 * Interface for file/directory information returned by the tool
 */
interface FileInfo {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  extension?: string;
  modified?: string;
  isHidden?: boolean;
}

class ReadDirTool {
  /**
   * Lists directory contents with filtering options
   */
  async listDirectory(
    directoryPath: string,
    recursive: boolean = false,
    includeHidden: boolean = false,
    fileExtensions?: string[],
    includeStats: boolean = true,
  ): Promise<FileInfo[]> {
    // Use filesystem functions to read directory
    const result = await filesystem.readDirectory(directoryPath, {
      recursive,
      includeHidden,
      extensions: fileExtensions || [],
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    if (!result.data || !Array.isArray(result.data.entries)) {
      throw new Error("Invalid directory listing result");
    }

    // Convert entries to FileInfo format (most properties already match)
    const entries = result.data.entries.map((entry: DirectoryEntry) => {
      const fileInfo: FileInfo = {
        name: entry.name,
        path: entry.path,
        type: entry.type,
        isHidden: entry.isHidden,
      };

      // Add additional properties if requested and available
      if (entry.type === "file" && includeStats) {
        if (entry.size !== undefined) {
          fileInfo.size = entry.size;
        }
        if (entry.modified !== undefined) {
          fileInfo.modified = entry.modified;
        }
        if (entry.extension !== undefined) {
          fileInfo.extension = entry.extension;
        }
      }

      return fileInfo;
    });

    return entries;
  }

  processListDirectory(input: any) {
    try {
      const {
        dirPath,
        recursive = false,
        includeHidden = false,
        fileExtensions,
        includeStats = true,
      } = input;

      if (!dirPath || typeof dirPath !== "string") {
        throw new Error("Invalid dirPath: must be a string");
      }

      // Log formatted information about the request
      const header = chalk.blue(`📂 Reading Directory: ${dirPath}`);
      const options = [
        `Recursive: ${recursive ? chalk.green("✓") : chalk.red("✗")}`,
        `Include Hidden: ${includeHidden ? chalk.green("✓") : chalk.red("✗")}`,
        `Include Stats: ${includeStats ? chalk.green("✓") : chalk.red("✗")}`,
      ];
      if (fileExtensions && fileExtensions.length > 0) {
        options.push(`Extensions: ${chalk.yellow(fileExtensions.join(", "))}`);
      }

      const border = "─".repeat(
        Math.max(header.length, ...options.map((o) => o.length)) + 4,
      );

      logger.warn(`
┌${border}┐
│ ${header.padEnd(border.length - 2)} │
├${border}┤
${options.map((opt) => `│ ${opt.padEnd(border.length - 2)} │`).join("\n")}
└${border}┘`);

      // Execute the directory listing asynchronously
      return this.listDirectory(
        dirPath,
        recursive,
        includeHidden,
        fileExtensions,
        includeStats,
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

const READ_DIR_TOOL = {
  name: "read_directory",
  description: `A tool for listing directory contents with detailed information.
This tool helps navigate and explore file system directories with various filtering options.

When to use this tool:
- When you need to explore the files and directories in a specific path
- When you need to find files of specific types or extensions
- When you need to get information about file sizes or modification dates
- When you need to recursively explore a directory structure

Key features:
- Lists files and directories in the specified path
- Can recursively list all subdirectories
- Can filter files by extension
- Can include or exclude hidden files
- Can include detailed file statistics (size, modification date)
- Returns structured data about each file and directory

Parameters explained:
- dirPath: The directory path to list (absolute or relative to project root)
- recursive: Whether to list contents of subdirectories (default: false)
- includeHidden: Whether to include hidden files and directories (default: false)
- fileExtensions: Optional array of file extensions to filter by (e.g. [".js", ".ts"])
- includeStats: Whether to include file size and modification date (default: true)`,
  inputSchema: {
    type: "object",
    properties: {
      dirPath: {
        type: "string",
        description:
          "Directory path to list (absolute or relative to project root)",
      },
      recursive: {
        type: "boolean",
        description: "Whether to recursively list subdirectories",
      },
      includeHidden: {
        type: "boolean",
        description: "Whether to include hidden files and directories",
      },
      fileExtensions: {
        type: "array",
        items: {
          type: "string",
        },
        description:
          'Optional array of file extensions to filter by (e.g. [".js", ".ts"])',
      },
      includeStats: {
        type: "boolean",
        description: "Whether to include file size and modification date",
      },
    },
    required: ["dirPath"],
  },
};

export { ReadDirTool, READ_DIR_TOOL };
