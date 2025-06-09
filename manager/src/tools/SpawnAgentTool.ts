import chalk from "chalk";
import { agentManager, type AgentConfig } from "../services/agentManager.js";
import { logger } from "../services/logger.js";

/**
 * Tool for spawning Claude Code sub-agents to execute specific tasks
 */
class SpawnAgentTool {
  /**
   * Spawns a new Claude Code sub-agent
   */
  async spawnAgent(
    task: string,
    systemPrompt?: string,
    appendSystemPrompt?: string,
    allowedTools?: string[],
    disallowedTools?: string[],
    maxTurns?: number,
    outputFormat: "text" | "json" | "stream-json" = "json",
    workingDirectory?: string,
    env?: Record<string, string>,
    mcpServers?: Record<string, any>,
    waitForCompletion: boolean = false,
    timeoutMs?: number,
    model?: string,
  ) {
    logger.info("Spawning Claude agent", { task });

    // Build agent configuration
    const config: AgentConfig = {
      task,
      systemPrompt,
      appendSystemPrompt,
      allowedTools,
      disallowedTools,
      maxTurns,
      outputFormat,
      workingDirectory,
      env,
      mcpConfig: mcpServers ? { mcpServers } : undefined,
      model,
    };

    // Spawn the agent
    const agentId = await agentManager.spawnAgent(config);

    // If requested, wait for completion
    if (waitForCompletion) {
      logger.info(`Waiting for agent ${agentId} to complete...`);
      const result = await agentManager.waitForAgent(agentId, timeoutMs);

      return {
        agentId,
        status: "completed",
        sessionId: result.sessionId,
        exitCode: result.exitCode,
        output: result.output,
        cost: result.cost,
        duration: result.duration,
        error: result.error,
      };
    }

    // Return immediately with agent ID
    return {
      agentId,
      status: "spawned",
      message:
        "Agent spawned successfully. Use manage_agent tool to check status or get results.",
    };
  }

  processSpawnAgent(input: any) {
    try {
      const {
        task,
        systemPrompt,
        appendSystemPrompt,
        allowedTools,
        disallowedTools,
        maxTurns,
        outputFormat = "json",
        workingDirectory,
        env,
        mcpServers,
        waitForCompletion = false,
        timeoutMs,
        model,
      } = input;

      if (!task || typeof task !== "string") {
        throw new Error("Invalid task: must be a non-empty string");
      }

      // Log formatted information about the request
      const header = chalk.blue(`🤖 Spawning Claude Agent`);
      const options = [
        `Task: ${chalk.yellow(task.substring(0, 60) + (task.length > 60 ? "..." : ""))}`,
        `Output Format: ${chalk.yellow(outputFormat)}`,
        `Wait for Completion: ${waitForCompletion ? chalk.green("✓") : chalk.red("✗")}`,
      ];

      if (systemPrompt) {
        options.push(`System Prompt: ${chalk.yellow("[Custom]")}`);
      }
      if (appendSystemPrompt) {
        options.push(`Append System Prompt: ${chalk.yellow("[Custom]")}`);
      }
      if (allowedTools && allowedTools.length > 0) {
        options.push(
          `Allowed Tools: ${chalk.yellow(allowedTools.length + " tools")}`,
        );
      }
      if (disallowedTools && disallowedTools.length > 0) {
        options.push(
          `Disallowed Tools: ${chalk.yellow(disallowedTools.length + " tools")}`,
        );
      }
      if (maxTurns) {
        options.push(`Max Turns: ${chalk.yellow(maxTurns.toString())}`);
      }
      if (timeoutMs) {
        options.push(`Timeout: ${chalk.yellow(timeoutMs + "ms")}`);
      }
      if (model) {
        options.push(`Model: ${chalk.yellow(model)}`);
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

      // Execute the spawn operation asynchronously
      return this.spawnAgent(
        task,
        systemPrompt,
        appendSystemPrompt,
        allowedTools,
        disallowedTools,
        maxTurns,
        outputFormat as "text" | "json" | "stream-json",
        workingDirectory,
        env,
        mcpServers,
        waitForCompletion,
        timeoutMs,
        model,
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

const SPAWN_AGENT_TOOL = {
  name: "spawn_agent",
  description: `Spawn a new Claude Code sub-agent to execute a specific task. The agent runs as a separate process with its own Claude instance.

Features:
- Agents automatically have access to the DocuMCP server for documentation tasks
- All agents share the same vector database for coordinated documentation generation
- Supports both fire-and-forget and wait-for-completion modes
- Returns structured JSON output with cost and performance metrics

DocuMCP Tools Available to Sub-Agents:
- mcp__docu-mcp__explain_code: Analyzes code with sequential thinking, ideal for understanding complex logic
- mcp__docu-mcp__generate_diagram: Creates Mermaid.js diagrams (flowchart, sequence, class, state diagrams)
- mcp__docu-mcp__generate_documentation: Produces comprehensive markdown documentation with chapters
- mcp__docu-mcp__generate_user_guide: Creates user-friendly guides by synthesizing from multiple sources

Best Practices:
1. Model Selection:
   - Use default (claude-3-7-sonnet-latest) for most documentation tasks
   - Use opus models (claude-opus-4-20250514) for complex analysis or large-scale generation
   - Set SUB_AGENT_MODEL env var to change default for all sub-agents

2. Tool Configuration:
   - For documentation tasks, include DocuMCP tools: ["mcp__docu-mcp__generate_documentation", "mcp__docu-mcp__explain_code"]
   - For code analysis: ["Read", "Glob", "Grep", "mcp__docu-mcp__search_codebase"]
   - For diagram generation: ["mcp__docu-mcp__generate_diagram", "mcp__docu-mcp__search_diagram"]
   - Always include basic tools for file access: ["Read", "Glob"]

3. Task Decomposition:
   - Break large documentation projects into smaller, focused sub-agent tasks
   - Use one agent for code analysis, another for documentation generation
   - Coordinate multiple agents for comprehensive documentation coverage

4. Shared Vector Database:
   - All agents share the same vector DB, enabling collaborative documentation
   - Use semantic search tools to avoid duplicating existing documentation
   - Index results progressively as agents complete their tasks

5. Performance Optimization:
   - Use waitForCompletion=false for long-running tasks, check status periodically
   - Set appropriate timeoutMs based on task complexity (300000ms for large docs)
   - Monitor cost with returned metrics to optimize model usage

Example Workflows:
1. Full Project Documentation:
   {"task": "Analyze src/services and generate technical documentation", "allowedTools": ["Read", "Glob", "mcp__docu-mcp__explain_code", "mcp__docu-mcp__generate_documentation"], "waitForCompletion": true, "timeoutMs": 600000}

2. Architecture Diagram:
   {"task": "Create a system architecture diagram for the authentication flow", "allowedTools": ["Read", "Glob", "mcp__docu-mcp__search_codebase", "mcp__docu-mcp__generate_diagram"], "model": "claude-opus-4-20250514"}

3. User Guide Generation:
   {"task": "Generate a user guide for the API endpoints", "allowedTools": ["mcp__docu-mcp__search_documentation", "mcp__docu-mcp__search_user_guide", "mcp__docu-mcp__generate_user_guide"], "outputFormat": "json"}

4. Multi-Agent Documentation Pipeline:
   - Agent 1: Analyze and explain complex code sections
   - Agent 2: Generate technical documentation from analysis
   - Agent 3: Create diagrams for key workflows
   - Agent 4: Synthesize everything into a user guide`,
  inputSchema: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "The task or prompt for the Claude agent to execute",
      },
      systemPrompt: {
        type: "string",
        description: "Override the default system prompt",
      },
      appendSystemPrompt: {
        type: "string",
        description: "Append instructions to the default system prompt",
      },
      allowedTools: {
        type: "array",
        items: { type: "string" },
        description:
          'List of allowed tools for the agent (e.g., ["Bash", "Read", "mcp__docu-mcp__search_codebase"])',
      },
      disallowedTools: {
        type: "array",
        items: { type: "string" },
        description: "List of disallowed tools for the agent",
      },
      maxTurns: {
        type: "number",
        description: "Maximum number of conversation turns",
      },
      outputFormat: {
        type: "string",
        enum: ["text", "json", "stream-json"],
        default: "json",
        description: "Output format for the agent response",
      },
      workingDirectory: {
        type: "string",
        description: "Working directory for the agent process",
      },
      env: {
        type: "object",
        additionalProperties: { type: "string" },
        description: "Additional environment variables for the agent",
      },
      mcpServers: {
        type: "object",
        additionalProperties: true,
        description:
          "Additional MCP servers to load (DocuMCP is included by default)",
      },
      waitForCompletion: {
        type: "boolean",
        default: false,
        description: "Wait for the agent to complete before returning",
      },
      timeoutMs: {
        type: "number",
        description: "Timeout in milliseconds when waiting for completion",
      },
      model: {
        type: "string",
        description:
          "Claude model to use (e.g., 'claude-3-7-sonnet-latest', 'claude-opus-4-20250514'). Defaults to SUB_AGENT_MODEL env var if not specified.",
      },
    },
    required: ["task"],
  },
};

export { SpawnAgentTool, SPAWN_AGENT_TOOL };
