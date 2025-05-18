---
sidebar_position: 5
---

# Create Directory

The `create_directory` tool creates a new directory at a specified path with support for recursive creation of parent directories.

## Overview

This tool provides capabilities to:
- Create directories using both absolute and relative paths
- Automatically create parent directories when needed
- Return detailed information about the created directory
- Handle errors gracefully with informative messages

## Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| dirPath | string | Yes | - | Path where the directory should be created (absolute or relative to the project root) |
| recursive | boolean | No | true | Whether to create parent directories if they don't exist |

## Response

The tool returns an object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| success | boolean | Indicates if the operation was successful |
| path | string | The absolute path to the created directory |
| created | string | ISO string of the directory creation time |
| message | string | A descriptive message about the operation |

## Example

**Request**:
```json
{
  "name": "create_directory",
  "arguments": {
    "dirPath": "src/components/forms/validation",
    "recursive": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "path": "/absolute/path/to/src/components/forms/validation",
  "created": "2024-05-10T14:30:25.000Z",
  "message": "Directory created successfully at /absolute/path/to/src/components/forms/validation"
}
```

## Error Handling

The tool handles common directory creation errors:

- Permission issues - Returns an error if directories can't be created due to permission problems
- Path validation - Ensures the provided path is valid
- Existing directories - Silently succeeds if the directory already exists

Error responses are formatted consistently as JSON with error message and status:

```json
{
  "error": "Failed to create directory: EACCES: permission denied, mkdir '/path/to/protected/directory'",
  "status": "failed"
}
```

## Implementation Details

The `CreateDirTool` is implemented in `/mcp/src/tools/CreateDirTool.ts`. Key implementation features include:

- Uses Node.js's `fs/promises` API for asynchronous directory operations
- Resolves relative paths to absolute paths using the current working directory
- Uses the `{ recursive: true }` option to create parent directories when needed
- Returns detailed information about the created directory
- Includes logging with chalk-formatted output for console visibility

```typescript
// Example implementation (simplified)
class CreateDirToolImplementation {
  async createDirectory(dirPath: string, recursive: boolean = true) {
    try {
      // Resolve the absolute path
      const absolutePath = path.isAbsolute(dirPath) ? dirPath : path.resolve(process.cwd(), dirPath);
      
      // Create the directory (and parent directories if recursive is true)
      await fs.mkdir(absolutePath, { recursive });
      
      // Get directory stats
      const stats = await fs.stat(absolutePath);
      
      // Return success information
      return {
        success: true,
        path: absolutePath,
        created: stats.birthtime.toISOString(),
        message: `Directory created successfully at ${absolutePath}`
      };
    } catch (error) {
      console.error(`Error creating directory:`, error);
      throw new Error(`Failed to create directory: ${(error as Error).message}`);
    }
  }
  
  processCreateDirectory(input: any) {
    try {
      const { dirPath, recursive = true } = input;
      
      // Log formatted information about the request
      console.error(`Creating Directory: ${dirPath} (Recursive: ${recursive ? 'Yes' : 'No'})`);
      
      // Execute the directory creation asynchronously
      return this.createDirectory(dirPath, recursive)
        .then(result => {
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
          };
        })
        .catch(error => {
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
                status: "failed"
              }, null, 2) 
            }],
            isError: true
          };
        });
    } catch (error) {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            status: "failed"
          }, null, 2) 
        }],
        isError: true
      };
    }
  }
}
```

## Usage Considerations

When using the `create_directory` tool, consider these best practices:

- **Use recursive creation**: Keep the default `recursive: true` to automatically create parent directories
- **Avoid path conflicts**: Be aware that the tool will silently succeed if the directory already exists
- **Path resolution**: Remember that relative paths are resolved from the current working directory
- **Check for success**: Always verify the `success` field in the response before proceeding with operations in the new directory

## Related Tools

- [Write File](./write-file.md) - For creating files (can also create parent directories)
- [Read Directory](./read-directory.md) - For listing directory contents