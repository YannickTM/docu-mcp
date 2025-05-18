import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

/**
 * Response interface for filesystem operations
 */
export interface FileSystemResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * File metadata interface
 */
export interface FileMetadata {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  extension?: string;
  filename?: string;
  directory?: string;
}

/**
 * Directory entry interface
 */
export interface DirectoryEntry {
  name: string;
  type: "file" | "directory";
  path: string;
  isHidden: boolean;
  size?: number;
  modified?: string;
  extension?: string;
}

/**
 * Resolves a path to absolute if it's relative
 */
export function resolvePath(filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
}

/**
 * Check if path exists and return its type
 */
export async function getPathType(
  entityPath: string
): Promise<"file" | "directory" | null> {
  try {
    const stats = await fs.stat(entityPath);
    return stats.isFile() ? "file" : stats.isDirectory() ? "directory" : null;
  } catch {
    return null;
  }
}

/**
 * Get entity metadata
 */
export async function getMetadata(filePath: string): Promise<FileMetadata> {
  const absolutePath = resolvePath(filePath);
  const stats = await fs.stat(absolutePath);
  
  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime,
    extension: path.extname(absolutePath),
    filename: path.basename(absolutePath),
    directory: path.dirname(absolutePath)
  };
}

/**
 * Reads a file's content with simplified response
 */
export async function readFile(
  filePath: string,
  encoding: BufferEncoding = "utf-8"
): Promise<FileSystemResponse<{content: string; metadata?: FileMetadata}>> {
  const absolutePath = resolvePath(filePath);

  try {
    const pathType = await getPathType(absolutePath);
    if (pathType !== "file") {
      return {
        success: false,
        message: pathType === null
          ? `File not found: ${absolutePath}`
          : `Path is not a file: ${absolutePath}`,
        error: "FILE_NOT_FOUND"
      };
    }

    const content = await fs.readFile(absolutePath, { encoding });
    const metadata = await getMetadata(absolutePath);

    return {
      success: true,
      message: `File read successfully`,
      data: {
        content,
        metadata
      }
    };
  } catch (error) {
    console.error(chalk.red(`Failed to read file: ${absolutePath}`), error);
    return {
      success: false,
      message: `Failed to read file: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: "READ_ERROR"
    };
  }
}

/**
 * Writes content to a file with simplified response
 */
export async function writeFile(
  filePath: string,
  content: string,
  options: { createDir?: boolean; overwrite?: boolean } = {}
): Promise<FileSystemResponse<{path: string; created: boolean}>> {
  const { createDir = true, overwrite = true } = options;
  const absolutePath = resolvePath(filePath);

  try {
    const pathType = await getPathType(absolutePath);
    const fileExists = pathType === "file";

    if (fileExists && !overwrite) {
      return {
        success: false,
        message: `File already exists and overwrite is disabled`,
        error: "FILE_EXISTS"
      };
    }

    if (createDir) {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    }

    await fs.writeFile(absolutePath, content);

    return {
      success: true,
      message: fileExists ? `File updated successfully` : `File created successfully`,
      data: {
        path: absolutePath,
        created: !fileExists
      }
    };
  } catch (error) {
    console.error(chalk.red(`Failed to write file: ${absolutePath}`), error);
    return {
      success: false,
      message: `Failed to write file: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: "WRITE_ERROR"
    };
  }
}

/**
 * Creates a directory with simplified response
 */
export async function createDirectory(
  dirPath: string,
  recursive: boolean = true
): Promise<FileSystemResponse<{path: string; created: boolean}>> {
  const absolutePath = resolvePath(dirPath);

  try {
    const pathType = await getPathType(absolutePath);

    if (pathType === "directory") {
      return {
        success: true,
        message: `Directory already exists`,
        data: {
          path: absolutePath,
          created: false
        }
      };
    }

    await fs.mkdir(absolutePath, { recursive });

    return {
      success: true,
      message: `Directory created successfully`,
      data: {
        path: absolutePath,
        created: true
      }
    };
  } catch (error) {
    console.error(chalk.red(`Failed to create directory: ${absolutePath}`), error);
    return {
      success: false,
      message: `Failed to create directory: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: "DIRECTORY_ERROR"
    };
  }
}

/**
 * Recursively walks a directory and yields entries
 */
async function* walkDirectory(
  dirPath: string,
  basePath: string,
  includeHidden: boolean,
  extensions: string[]
): AsyncGenerator<DirectoryEntry> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!includeHidden && entry.name.startsWith(".")) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);
    const stats = await fs.stat(fullPath);

    if (entry.isDirectory()) {
      yield {
        name: entry.name,
        type: "directory",
        path: relativePath,
        isHidden: entry.name.startsWith("."),
        modified: stats.mtime.toISOString(),
      };

      // Recursively yield subdirectory contents
      yield* walkDirectory(
        fullPath,
        basePath,
        includeHidden,
        extensions
      );
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (
        extensions.length > 0 &&
        !extensions.includes(ext) &&
        !extensions.includes(ext.substring(1))
      ) {
        continue;
      }

      yield {
        name: entry.name,
        type: "file",
        path: relativePath,
        isHidden: entry.name.startsWith("."),
        size: stats.size,
        modified: stats.mtime.toISOString(),
        extension: ext
      };
    }
  }
}

/**
 * Collects directory entries (recursive or not)
 */
async function collectDirectoryEntries(
  dirPath: string,
  basePath: string,
  recursive: boolean,
  includeHidden: boolean,
  extensions: string[]
): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];

  if (recursive) {
    for await (const entry of walkDirectory(
      dirPath,
      basePath,
      includeHidden,
      extensions
    )) {
      entries.push(entry);
    }
  } else {
    const files = await fs.readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
      if (!includeHidden && file.name.startsWith(".")) continue;

      const fullPath = path.join(dirPath, file.name);
      const stats = await fs.stat(fullPath);

      if (file.isFile()) {
        const ext = path.extname(file.name);
        if (
          extensions.length > 0 &&
          !extensions.includes(ext) &&
          !extensions.includes(ext.substring(1))
        ) {
          continue;
        }

        entries.push({
          name: file.name,
          type: "file",
          path: file.name,
          isHidden: file.name.startsWith("."),
          size: stats.size,
          modified: stats.mtime.toISOString(),
          extension: ext
        });
      } else if (file.isDirectory()) {
        entries.push({
          name: file.name,
          type: "directory",
          path: file.name,
          isHidden: file.name.startsWith("."),
          modified: stats.mtime.toISOString(),
        });
      }
    }
  }

  return entries;
}

/**
 * Reads directory contents with simplified response
 */
export async function readDirectory(
  dirPath: string,
  options: {
    recursive?: boolean;
    includeHidden?: boolean;
    extensions?: string[];
  } = {}
): Promise<FileSystemResponse<{path: string; entries: DirectoryEntry[]}>> {
  const {
    recursive = false,
    includeHidden = false,
    extensions = [],
  } = options;
  const absolutePath = resolvePath(dirPath);

  try {
    const pathType = await getPathType(absolutePath);
    if (pathType !== "directory") {
      return {
        success: false,
        message: pathType === null
          ? `Directory not found: ${absolutePath}`
          : `Path is not a directory: ${absolutePath}`,
        error: "DIRECTORY_NOT_FOUND"
      };
    }

    const entries = await collectDirectoryEntries(
      absolutePath,
      absolutePath,
      recursive,
      includeHidden,
      extensions
    );

    return {
      success: true,
      message: `Directory read successfully`,
      data: {
        path: absolutePath,
        entries
      }
    };
  } catch (error) {
    console.error(chalk.red(`Failed to read directory: ${absolutePath}`), error);
    return {
      success: false,
      message: `Failed to read directory: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error: "READ_DIRECTORY_ERROR"
    };
  }
}

/**
 * Checks if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return (await getPathType(resolvePath(filePath))) === "file";
}

/**
 * Checks if a directory exists
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  return (await getPathType(resolvePath(dirPath))) === "directory";
}