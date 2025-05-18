---
sidebar_position: 2
---

# Read File

The `read_file` tool reads the content of a file at a specified path and optionally includes metadata about the file.

## Overview

This tool provides capabilities to:
- Read files using both absolute and relative paths
- Support different file encodings
- Optionally include detailed file metadata
- Handle errors gracefully with informative messages

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| filePath | string | Yes | - | Path to the file to read (absolute or relative to the project root) |
| encoding | string | No | "utf-8" | File encoding (supports "utf-8", "ascii", "binary", etc.) |
| includeMetadata | boolean | No | true | Whether to include file metadata in the response |

## Response

The tool returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| content | string | The content of the file |
| path | string | The absolute path to the file |
| size | number | The size of the file content in bytes |
| encoding | string | The encoding used to read the file |
| metadata | object | (If requested) Contains file metadata |

### Metadata Properties

When `includeMetadata` is true, the response includes these metadata properties:

| Property | Type | Description |
|----------|------|-------------|
| size | number | File size in bytes |
| created | string | ISO string of file creation time |
| modified | string | ISO string of last modification time |
| accessed | string | ISO string of last access time |
| extension | string | File extension with leading dot |
| filename | string | Filename with extension |
| directory | string | Directory containing the file |

## Example

**Request**:
```json
{
  "name": "read_file",
  "arguments": {
    "filePath": "src/components/Button.tsx",
    "encoding": "utf-8",
    "includeMetadata": true
  }
}
```

**Response**:
```json
{
  "content": "import React from 'react';\n\ninterface ButtonProps {\n  text: string;\n  onClick: () => void;\n}\n\nconst Button: React.FC<ButtonProps> = ({ text, onClick }) => {\n  return (\n    <button onClick={onClick}>\n      {text}\n    </button>\n  );\n};\n\nexport default Button;",
  "path": "/absolute/path/to/src/components/Button.tsx",
  "size": 217,
  "encoding": "utf-8",
  "metadata": {
    "size": 217,
    "created": "2024-01-15T10:30:00.000Z",
    "modified": "2024-01-15T14:45:30.000Z",
    "accessed": "2024-05-09T09:12:15.000Z",
    "extension": ".tsx",
    "filename": "Button.tsx",
    "directory": "/absolute/path/to/src/components"
  }
}
```

## Error Handling

The tool handles common file operation errors:

- File not found - Returns an error if the file doesn't exist
- Permission issues - Returns an error if the file can't be accessed
- Encoding problems - Returns an error if the file can't be decoded using the specified encoding

Error responses are formatted consistently as JSON with error message and status:

```json
{
  "error": "Failed to read file: File not found: /path/to/non-existent-file.js",
  "status": "failed"
}
```

## Implementation Details

The `ReadFileTool` is implemented in `/mcp/src/tools/ReadFileTool.ts`. Key implementation features include:

- Uses Node.js's `fs/promises` API for asynchronous file operations
- Resolves relative paths to absolute paths using the current working directory
- Verifies file existence before attempting to read
- Formats and formats responses using the MCP protocol's content structure
- Includes logging with chalk-formatted output for console visibility

```typescript
// Example implementation (simplified)
class ReadFileToolImplementation {
  async readFile(filePath: string, encoding: BufferEncoding = "utf-8", includeMetadata: boolean = true) {
    // Resolve the absolute path
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    
    // Check if file exists
    const fileExists = await this.checkFileExists(absolutePath);
    if (!fileExists) {
      throw new Error(`File not found: ${absolutePath}`);
    }
    
    // Read file content and metadata
    const content = await fs.readFile(absolutePath, { encoding });
    
    // Return formatted response
    return {
      content,
      path: absolutePath,
      size: Buffer.byteLength(content, encoding),
      encoding,
      ...(includeMetadata ? { metadata: { /* file metadata */ } } : {})
    };
  }
}
```

## Related Tools

- [Write File](./write-file.md) - For writing content to files
- [Read Directory](./read-directory.md) - For listing directory contents