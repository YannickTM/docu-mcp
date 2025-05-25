---
sidebar_position: 3
---

# Write File

The `write_file` tool writes or updates content to a file at a specified path with options for directory creation and overwrite protection.

## Overview

This tool provides capabilities to:

- Write content to files using both absolute and relative paths
- Automatically create parent directories when needed
- Control whether existing files should be overwritten
- Support different file encodings
- Provide detailed information about the write operation

## Parameters

| Name            | Type    | Required | Default | Description                                                          |
| --------------- | ------- | -------- | ------- | -------------------------------------------------------------------- |
| filePath        | string  | Yes      | -       | Path to the file to write (absolute or relative to the project root) |
| content         | string  | Yes      | -       | Content to write to the file                                         |
| encoding        | string  | No       | "utf-8" | File encoding (supports "utf-8", "ascii", "binary", etc.)            |
| createDirectory | boolean | No       | true    | Create parent directories if they don't exist                        |
| overwrite       | boolean | No       | true    | Whether to overwrite the file if it already exists                   |

## Response

The tool returns an object with the following properties:

| Property | Type    | Description                                      |
| -------- | ------- | ------------------------------------------------ |
| success  | boolean | Indicates if the operation was successful        |
| path     | string  | The absolute path to the file                    |
| size     | number  | The size of the written content in bytes         |
| encoding | string  | The encoding used to write the file              |
| created  | boolean | Whether the file was newly created (vs. updated) |
| modified | string  | ISO string of the file's modification time       |
| message  | string  | A descriptive message about the operation        |

## Example

**Request**:

```json
{
  "name": "write_file",
  "arguments": {
    "filePath": "src/components/NewComponent.tsx",
    "content": "import React from 'react';\n\nconst NewComponent: React.FC = () => {\n  return <div>New Component</div>;\n};\n\nexport default NewComponent;",
    "createDirectory": true,
    "overwrite": false
  }
}
```

**Response**:

```json
{
  "success": true,
  "path": "/absolute/path/to/src/components/NewComponent.tsx",
  "size": 126,
  "encoding": "utf-8",
  "created": true,
  "modified": "2024-05-09T10:15:30.000Z",
  "message": "File created successfully"
}
```

## Error Handling

The tool handles common file operation errors:

- Permission issues - Returns an error if the file can't be written
- Directory creation failures - Returns an error if the directories can't be created
- Overwrite protection - Returns an error if the file exists and overwrite is set to false
- Encoding problems - Returns an error if the content can't be encoded using the specified encoding

Error responses are formatted consistently as JSON with error message and status:

```json
{
  "error": "Failed to write file: File already exists at /path/to/existing-file.js and overwrite is set to false",
  "status": "failed"
}
```

## Implementation Details

The `WriteFileTool` is implemented in `/mcp/src/tools/WriteFileTool.ts`. Key implementation features include:

- Uses Node.js's `fs/promises` API for asynchronous file operations
- Resolves relative paths to absolute paths using the current working directory
- Creates parent directories recursively when needed
- Supports configurable overwrite protection with different write flags
- Returns detailed metadata about the operation
- Includes logging with chalk-formatted output for console visibility

```typescript
// Example implementation (simplified)
class WriteFileToolImplementation {
  async writeFile(
    filePath: string,
    content: string,
    encoding: BufferEncoding = "utf-8",
    createDirectory: boolean = true,
    overwrite: boolean = true,
  ) {
    // Resolve the absolute path
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    // Check if file exists and verify overwrite permission
    const fileExists = await this.checkFileExists(absolutePath);
    if (fileExists && !overwrite) {
      throw new Error(
        `File already exists at ${absolutePath} and overwrite is set to false`,
      );
    }

    // Create parent directories if needed
    if (createDirectory) {
      const directory = path.dirname(absolutePath);
      await fs.mkdir(directory, { recursive: true });
    }

    // Write file content
    const writeFlag = overwrite ? "w" : "wx"; // 'wx' = write only if file doesn't exist
    await fs.writeFile(absolutePath, content, {
      encoding,
      flag: writeFlag,
    });

    // Return formatted response with file information
    return {
      success: true,
      path: absolutePath,
      size: Buffer.byteLength(content, encoding),
      encoding,
      created: !fileExists,
      modified: (await fs.stat(absolutePath)).mtime.toISOString(),
      message: fileExists
        ? `File updated successfully`
        : `File created successfully`,
    };
  }
}
```

## Usage Considerations

When using the `write_file` tool, consider the following best practices:

- **Directory Creation**: Set `createDirectory: true` when writing to new directories to ensure they exist (this is the default)
- **Overwrite Protection**: Set `overwrite: false` when you want to prevent accidentally overwriting existing files
- **Encoding Selection**: Use the appropriate encoding for your content (e.g., "utf-8" for text, "binary" for binary data)

## Related Tools

- [Read File](./read-file.md) - For reading file content
- [Create Directory](./create-directory.md) - For creating directories without writing files
