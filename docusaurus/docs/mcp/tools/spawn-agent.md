---
sidebar_position: 20
---

# Spawn Agent

The `spawn_agent` tool creates and launches Claude Code sub-agents to execute specific documentation tasks. This tool is only available in the DocuMCP Manager server and enables parallel documentation generation workflows.

## Overview

This tool provides capabilities to:

- Create autonomous Claude Code sub-agents for documentation tasks
- Configure agent behavior with custom prompts and tool restrictions
- Control execution modes (fire-and-forget or wait-for-completion)
- Monitor performance with structured cost and timing metrics
- Automatically integrate DocuMCP server tools for all sub-agents
- Enable parallel processing of large documentation projects

## Parameters

| Name               | Type     | Required | Default                     | Description                                                                                   |
| ------------------ | -------- | -------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| task               | string   | Yes      | -                           | The task or prompt for the Claude agent to execute                                            |
| systemPrompt       | string   | No       | -                           | Override the default system prompt                                                            |
| appendSystemPrompt | string   | No       | -                           | Append instructions to the default system prompt                                              |
| allowedTools       | string[] | No       | All tools                   | List of allowed tools for the agent (e.g., ["Read", "mcp__docu-mcp__generate_documentation"]) |
| disallowedTools    | string[] | No       | []                          | List of disallowed tools for the agent                                                        |
| maxTurns           | number   | No       | -                           | Maximum number of conversation turns                                                          |
| outputFormat       | string   | No       | "json"                      | Output format: "text", "json", or "stream-json"                                               |
| workingDirectory   | string   | No       | Current directory           | Working directory for the agent process                                                       |
| env                | object   | No       | {}                          | Additional environment variables for the agent                                                |
| mcpServers         | object   | No       | DocuMCP included by default | Additional MCP servers to load                                                                |
| waitForCompletion  | boolean  | No       | false                       | Wait for the agent to complete before returning                                               |
| timeoutMs          | number   | No       | -                           | Timeout in milliseconds when waiting for completion                                           |
| model              | string   | No       | SUB_AGENT_MODEL env var     | Claude model to use (e.g., 'claude-3-7-sonnet-latest', 'claude-opus-4-20250514')              |

## Response

The tool returns different responses based on the `waitForCompletion` parameter:

### Fire-and-Forget Mode (waitForCompletion: false)

| Property | Type   | Description                                             |
| -------- | ------ | ------------------------------------------------------- |
| agentId  | string | Unique identifier for the spawned agent                 |
| status   | string | Always "spawned" in this mode                           |
| message  | string | Instructions for checking status with manage_agent tool |

### Wait-for-Completion Mode (waitForCompletion: true)

| Property  | Type   | Description                                       |
| --------- | ------ | ------------------------------------------------- |
| agentId   | string | Unique identifier for the spawned agent           |
| status    | string | Always "completed" when agent finishes            |
| sessionId | string | Claude session identifier                         |
| exitCode  | number | Process exit code (0 for success)                 |
| output    | string | Complete output from the agent                    |
| cost      | object | Cost breakdown with input/output tokens and total |
| duration  | number | Execution time in milliseconds                    |
| error     | string | Error message if the agent failed                 |

## DocuMCP Tools Available to Sub-Agents

All sub-agents automatically have access to DocuMCP server tools:

- `mcp__docu-mcp__explain_code`: Analyzes code with sequential thinking
- `mcp__docu-mcp__generate_diagram`: Creates Mermaid.js diagrams
- `mcp__docu-mcp__generate_documentation`: Produces comprehensive markdown documentation
- `mcp__docu-mcp__generate_user_guide`: Creates user-friendly guides
- `mcp__docu-mcp__search_*`: Various search tools for code, docs, and diagrams
- Plus all file system and indexing tools

## Best Practices

### Model Selection

- Use default (`claude-3-7-sonnet-latest`) for most documentation tasks
- Use opus models (`claude-opus-4-20250514`) for complex analysis or large-scale generation
- Set `SUB_AGENT_MODEL` environment variable to change default for all sub-agents

### Tool Configuration

For documentation tasks:

```json
{
  "allowedTools": [
    "mcp__docu-mcp__generate_documentation",
    "mcp__docu-mcp__explain_code",
    "Read",
    "Glob"
  ]
}
```

For code analysis:

```json
{
  "allowedTools": ["Read", "Glob", "Grep", "mcp__docu-mcp__search_codebase"]
}
```

For diagram generation:

```json
{
  "allowedTools": [
    "mcp__docu-mcp__generate_diagram",
    "mcp__docu-mcp__search_diagram",
    "Read"
  ]
}
```

### Performance Optimization

- Use `waitForCompletion: false` for long-running tasks
- Set appropriate `timeoutMs` based on task complexity (300000ms for large docs)
- Monitor cost with returned metrics to optimize model usage

## Examples

### Example 1: Full Project Documentation

**Request**:

```json
{
  "name": "spawn_agent",
  "arguments": {
    "task": "Analyze src/services and generate comprehensive technical documentation including API references, architecture diagrams, and usage examples",
    "allowedTools": [
      "Read",
      "Glob",
      "mcp__docu-mcp__explain_code",
      "mcp__docu-mcp__generate_documentation"
    ],
    "waitForCompletion": true,
    "timeoutMs": 600000
  }
}
```

**Response**:

```json
{
  "agentId": "abc-123-def-456",
  "status": "completed",
  "sessionId": "session-789",
  "exitCode": 0,
  "output": "Successfully generated documentation for src/services...",
  "cost": {
    "inputTokens": 45000,
    "outputTokens": 12000,
    "totalCost": 0.75
  },
  "duration": 180000
}
```

### Example 2: Architecture Diagram with Opus Model

**Request**:

```json
{
  "name": "spawn_agent",
  "arguments": {
    "task": "Create a comprehensive system architecture diagram showing all microservices, their interactions, data flows, and deployment topology",
    "allowedTools": [
      "Read",
      "Glob",
      "mcp__docu-mcp__search_codebase",
      "mcp__docu-mcp__generate_diagram"
    ],
    "model": "claude-opus-4-20250514",
    "outputFormat": "json"
  }
}
```

**Response**:

```json
{
  "agentId": "xyz-789-abc-012",
  "status": "spawned",
  "message": "Agent spawned successfully. Use manage_agent tool to check status or get results."
}
```

### Example 3: Multi-Agent Documentation Pipeline

**Request 1** - Analyze Complex Code:

```json
{
  "name": "spawn_agent",
  "arguments": {
    "task": "Analyze and explain all authentication and authorization logic in the codebase",
    "allowedTools": ["Read", "Glob", "Grep", "mcp__docu-mcp__explain_code"],
    "waitForCompletion": false
  }
}
```

**Request 2** - Generate Technical Docs:

```json
{
  "name": "spawn_agent",
  "arguments": {
    "task": "Generate technical documentation based on the authentication analysis",
    "allowedTools": [
      "mcp__docu-mcp__search_codebase",
      "mcp__docu-mcp__generate_documentation"
    ],
    "appendSystemPrompt": "Focus on security best practices and implementation details",
    "waitForCompletion": false
  }
}
```

**Request 3** - Create User Guide:

```json
{
  "name": "spawn_agent",
  "arguments": {
    "task": "Create a user guide for the authentication system",
    "allowedTools": [
      "mcp__docu-mcp__search_documentation",
      "mcp__docu-mcp__generate_user_guide"
    ],
    "waitForCompletion": false
  }
}
```

## Error Handling

Common errors and their meanings:

| Error Message                              | Description                                            |
| ------------------------------------------ | ------------------------------------------------------ |
| "Invalid task: must be a non-empty string" | The task parameter is missing or empty                 |
| "Agent timeout exceeded"                   | The agent didn't complete within the specified timeout |
| "Invalid model specified"                  | The requested model is not available                   |
| "Tool not found"                           | One of the allowed tools doesn't exist                 |

## Integration with Shared Vector Database

All agents share the same vector database configuration:

- Agents can search existing documentation and code
- New documentation is immediately available to other agents
- Enables collaborative documentation generation
- Prevents duplication of effort across agents

## See Also

- [Manage Agent](./manage-agent.md) - Monitor and control spawned agents
- [Generate Documentation](./generate-documentation.md) - Core documentation generation tool
- [Generate User Guide](./generate-user-guide.md) - User guide generation tool
