---
sidebar_position: 4
---

# Read Directory

The `read_directory` tool lists files and directories in a specified path with detailed information about each entry.

## Overview

This tool provides capabilities to:
- List contents of directories using both absolute and relative paths
- Recursively traverse subdirectories
- Filter files by extension
- Control whether hidden files are included
- Include detailed metadata about each file and directory

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| dirPath | string | Yes | - | Directory path to list contents from (absolute or relative to the project root) |
| recursive | boolean | No | false | Whether to recursively list subdirectories and their contents |
| includeHidden | boolean | No | false | Whether to include hidden files and directories (those starting with a dot) |
| fileExtensions | string[] | No | - | Optional list of file extensions to filter by (e.g., [".js", ".ts", ".md"]) |
| includeStats | boolean | No | true | Whether to include detailed file stats (size, modified date, etc.) |

## Response

The tool returns an array of file and directory information objects:

### FileInfo Object

| Property | Type | Description |
|----------|------|-------------|
| name | string | The name of the file or directory |
| path | string | The absolute path to the file or directory |
| type | string | Either "file" or "directory" |
| size | number | (Files only) Size of the file in bytes |
| extension | string | (Files only) File extension with leading dot |
| modified | string | ISO string of the last modification time |
| isHidden | boolean | Whether the file or directory is hidden (starts with a dot) |

## Example

**Request**:
```json
{
  "name": "read_directory",
  "arguments": {
    "dirPath": "src/components",
    "recursive": true,
    "includeHidden": false,
    "fileExtensions": [".tsx", ".jsx"],
    "includeStats": true
  }
}
```

**Response**:
```json
[
  {
    "name": "components",
    "path": "/absolute/path/to/src/components",
    "type": "directory",
    "isHidden": false,
    "modified": "2024-03-20T15:30:45.000Z"
  },
  {
    "name": "Button.tsx",
    "path": "/absolute/path/to/src/components/Button.tsx",
    "type": "file",
    "size": 340,
    "extension": ".tsx",
    "modified": "2024-04-12T09:45:30.000Z",
    "isHidden": false
  },
  {
    "name": "forms",
    "path": "/absolute/path/to/src/components/forms",
    "type": "directory",
    "isHidden": false,
    "modified": "2024-03-18T11:20:15.000Z"
  },
  {
    "name": "LoginForm.tsx",
    "path": "/absolute/path/to/src/components/forms/LoginForm.tsx",
    "type": "file",
    "size": 1250,
    "extension": ".tsx",
    "modified": "2024-04-15T14:30:00.000Z",
    "isHidden": false
  }
]
```

## Error Handling

The tool handles common file operation errors:

- Directory not found - Returns an error if the directory doesn't exist
- Path not a directory - Returns an error if the path points to a file instead of a directory
- Permission issues - Returns an error if the directory can't be accessed

Error responses are formatted consistently as JSON with error message and status:

```json
{
  "error": "Failed to list directory: Path is not a directory: /path/to/file.txt",
  "status": "failed"
}
```

## Implementation Details

The `ReadDirTool` is implemented in `/mcp/src/tools/ReadDirTool.ts`. Key implementation features include:

- Uses Node.js's `fs/promises` API for asynchronous directory operations
- Resolves relative paths to absolute paths using the current working directory
- Implements recursive directory traversal with depth-first approach
- Provides filtering capabilities for file extensions and hidden files
- Includes detailed file statistics when requested
- Formats responses using the MCP protocol's content structure
- Includes logging with chalk-formatted output for console visibility

```typescript
// Example implementation (simplified)
class ReadDirToolImplementation {
  async listDirectory(
    directoryPath: string, 
    recursive: boolean = false,
    includeHidden: boolean = false,
    fileExtensions?: string[],
    includeStats: boolean = true
  ): Promise<FileInfo[]> {
    // Resolve the absolute path
    const absolutePath = path.isAbsolute(directoryPath) 
      ? directoryPath 
      : path.resolve(process.cwd(), directoryPath);
    
    // Verify it's a directory
    const dirStats = await fs.stat(absolutePath);
    if (!dirStats.isDirectory()) {
      throw new Error(`Path is not a directory: ${absolutePath}`);
    }
    
    // Read directory entries
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    let results: FileInfo[] = [];
    
    // Process each entry
    for (const entry of entries) {
      // Skip hidden files/directories if not included
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }
      
      const entryPath = path.join(absolutePath, entry.name);
      
      if (entry.isDirectory()) {
        // Process directory
        const dirInfo: FileInfo = {
          name: entry.name,
          path: entryPath,
          type: "directory",
          isHidden: entry.name.startsWith('.')
        };
        
        // Add stats if requested
        if (includeStats) {
          const stats = await fs.stat(entryPath);
          dirInfo.modified = stats.mtime.toISOString();
        }
        
        results.push(dirInfo);
        
        // Process subdirectory recursively if requested
        if (recursive) {
          const subdirContents = await this.listDirectory(
            entryPath, recursive, includeHidden, fileExtensions, includeStats
          );
          results = results.concat(subdirContents);
        }
      } else {
        // Process file - filter by extension if specified
        if (fileExtensions && fileExtensions.length > 0) {
          const ext = path.extname(entry.name);
          if (!fileExtensions.includes(ext)) {
            continue;
          }
        }
        
        // Create file info object
        const fileInfo: FileInfo = {
          name: entry.name,
          path: entryPath,
          type: "file",
          isHidden: entry.name.startsWith('.'),
          extension: path.extname(entry.name)
        };
        
        // Add stats if requested
        if (includeStats) {
          const stats = await fs.stat(entryPath);
          fileInfo.size = stats.size;
          fileInfo.modified = stats.mtime.toISOString();
        }
        
        results.push(fileInfo);
      }
    }
    
    return results;
  }
}
```

## Usage Considerations

When using the `read_directory` tool, consider these best practices:

- **Use the recursive option carefully**: In large codebases, recursive traversal can return a large number of entries
- **Apply file extension filtering**: When looking for specific file types, use the fileExtensions parameter
- **Control stats collection**: If you don't need file statistics, set includeStats to false for better performance
- **Use with `read_file`**: Combine this tool with the read_file tool to first discover files and then read their contents

## Related Tools

- [Read File](./read-file.md) - For reading file content
- [Create Directory](./create-directory.md) - For creating directories
- [Index Directory](./index-directory.md) - For recursively indexing a directory for search