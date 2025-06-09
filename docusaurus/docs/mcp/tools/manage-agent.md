---
sidebar_position: 21
---

# Manage Agent

The `manage_agent` tool provides monitoring and control capabilities for Claude Code sub-agents that were spawned using the `spawn_agent` tool. This tool is only available in the DocuMCP Manager server.

## Overview

This tool provides capabilities to:

- Check the current status of running agents
- Terminate agents that are no longer needed
- List all active agents and their states
- Retrieve complete results from finished agents
- Wait for agent completion with timeout controls
- Monitor resource usage and performance metrics

## Parameters

| Name      | Type   | Required    | Default | Description                                                         |
| --------- | ------ | ----------- | ------- | ------------------------------------------------------------------- |
| action    | string | Yes         | -       | Action to perform: "status", "terminate", "list", "result", "wait"  |
| agentId   | string | Conditional | -       | Agent ID (required for status, terminate, result, and wait actions) |
| timeoutMs | number | No          | -       | Timeout in milliseconds (only for wait action)                      |

## Actions

### status

Get the current status of a specific agent.

**Required Parameters**: action, agentId

**Response**:
| Property | Type | Description |
| ----------- | ------ | ---------------------------------------------- |
| agentId | string | The agent's unique identifier |
| status | string | Current status: "running", "completed", "error", "terminated" |
| startTime | string | ISO timestamp when the agent started |
| endTime | string | ISO timestamp when the agent ended (if finished) |
| task | string | The original task given to the agent |
| sessionId | string | Claude session identifier |
| outputLines | number | Number of output chunks collected |
| lastOutput | string | Last 5 output chunks concatenated |

### terminate

Forcefully terminate a running agent.

**Required Parameters**: action, agentId

**Response**:
| Property | Type | Description |
| -------- | ------ | ------------------------------------ |
| agentId | string | The terminated agent's identifier |
| status | string | Always "terminated" |
| message | string | Confirmation message |

### list

List all agents and their current statuses.

**Required Parameters**: action

**Response**:
| Property | Type | Description |
| ---------- | ------- | ---------------------------------------- |
| agents | array | Array of agent summary objects |
| total | number | Total number of agents |
| running | number | Number of currently running agents |
| terminated | number | Number of terminated agents |
| error | number | Number of agents that encountered errors |

Each agent in the array includes:

- `id`: Agent identifier
- `status`: Current status
- `task`: Task description
- `startTime`: When the agent started

### result

Get the complete output and results from an agent.

**Required Parameters**: action, agentId

**Response**:
| Property | Type | Description |
| --------- | ------ | ------------------------------------------------ |
| agentId | string | The agent's identifier |
| sessionId | string | Claude session identifier |
| exitCode | number | Process exit code (0 for success) |
| output | string | Complete output from the agent |
| cost | object | Cost breakdown with tokens and pricing |
| duration | number | Total execution time in milliseconds |
| error | string | Error message if the agent failed |

### wait

Wait for an agent to complete and return its results.

**Required Parameters**: action, agentId

**Optional Parameters**: `timeoutMs`

**Response**:
Same as the `result` action, but blocks until the agent completes or timeout is reached.

## Examples

### Example 1: Check Agent Status

**Request**:

```json
{
  "name": "manage_agent",
  "arguments": {
    "action": "status",
    "agentId": "abc-123-def-456"
  }
}
```

**Response**:

```json
{
  "agentId": "abc-123-def-456",
  "status": "running",
  "startTime": "2024-01-15T10:30:00Z",
  "task": "Generate documentation for authentication module",
  "sessionId": "session-789",
  "outputLines": 42,
  "lastOutput": "Analyzing authentication flows...\nIdentified 3 main components..."
}
```

### Example 2: List All Agents

**Request**:

```json
{
  "name": "manage_agent",
  "arguments": {
    "action": "list"
  }
}
```

**Response**:

```json
{
  "agents": [
    {
      "id": "abc-123",
      "status": "running",
      "task": "Document API endpoints",
      "startTime": "2024-01-15T10:00:00Z"
    },
    {
      "id": "def-456",
      "status": "completed",
      "task": "Generate architecture diagrams",
      "startTime": "2024-01-15T09:45:00Z"
    }
  ],
  "total": 2,
  "running": 1,
  "terminated": 0,
  "error": 0
}
```

### Example 3: Get Agent Results

**Request**:

```json
{
  "name": "manage_agent",
  "arguments": {
    "action": "result",
    "agentId": "def-456"
  }
}
```

**Response**:

```json
{
  "agentId": "def-456",
  "sessionId": "session-xyz",
  "exitCode": 0,
  "output": "Successfully generated 5 architecture diagrams:\n1. System Overview\n2. Database Schema\n3. API Flow\n4. Authentication Sequence\n5. Deployment Architecture\n\nAll diagrams have been saved and indexed.",
  "cost": {
    "inputTokens": 25000,
    "outputTokens": 8000,
    "totalCost": 0.45
  },
  "duration": 120000
}
```

### Example 4: Wait for Agent Completion

**Request**:

```json
{
  "name": "manage_agent",
  "arguments": {
    "action": "wait",
    "agentId": "ghi-789",
    "timeoutMs": 300000
  }
}
```

**Response**:

```json
{
  "agentId": "ghi-789",
  "status": "completed",
  "sessionId": "session-abc",
  "exitCode": 0,
  "output": "Documentation generation complete. Created 15 markdown files covering all service components.",
  "cost": {
    "inputTokens": 50000,
    "outputTokens": 20000,
    "totalCost": 0.95
  },
  "duration": 240000
}
```

### Example 5: Terminate an Agent

**Request**:

```json
{
  "name": "manage_agent",
  "arguments": {
    "action": "terminate",
    "agentId": "jkl-012"
  }
}
```

**Response**:

```json
{
  "agentId": "jkl-012",
  "status": "terminated",
  "message": "Agent terminated successfully"
}
```

## Error Handling

Common errors and their meanings:

| Error Message                           | Description                                  |
| --------------------------------------- | -------------------------------------------- |
| "Invalid action: must be one of..."     | The action parameter has an invalid value    |
| "agentId is required for `action`"      | Missing agent ID for an action that needs it |
| "Agent `agentId` not found"             | The specified agent doesn't exist            |
| "Agent timeout exceeded"                | Wait action timed out before agent completed |
| "Agent process terminated unexpectedly" | The agent crashed or was killed externally   |

## Integration with Spawn Agent

The `manage_agent` tool works in conjunction with `spawn_agent`:

1. `spawn_agent` creates agents and returns their IDs
2. `manage_agent` uses these IDs to monitor and control agents
3. Both tools share the same agent pool and state management
4. Results are persisted until explicitly cleared

## See Also

- [Spawn Agent](./spawn-agent.md) - Create and launch documentation agents
- [Generate Documentation](./generate-documentation.md) - Core documentation generation tool
- [Search Documentation](./search-documentation.md) - Search generated documentation
