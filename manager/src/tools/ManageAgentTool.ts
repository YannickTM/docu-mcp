import chalk from "chalk";
import { agentManager } from "../services/agentManager.js";
import { logger } from "../services/logger.js";

/**
 * Tool for managing and monitoring Claude Code sub-agents
 */
class ManageAgentTool {
  /**
   * Manages agents with various actions
   */
  async manageAgent(
    action: "status" | "terminate" | "list" | "result" | "wait",
    agentId?: string,
    timeoutMs?: number,
  ) {
    switch (action) {
      case "status": {
        if (!agentId) {
          throw new Error("agentId is required for status action");
        }

        const agent = await agentManager.getAgentStatus(agentId);
        if (!agent) {
          throw new Error(`Agent ${agentId} not found`);
        }

        return {
          agentId: agent.id,
          status: agent.status,
          startTime: agent.startTime,
          endTime: agent.endTime,
          task: agent.config.task,
          sessionId: agent.sessionId,
          outputLines: agent.output.length,
          lastOutput: agent.output.slice(-5).join(""), // Last 5 output chunks
        };
      }

      case "terminate": {
        if (!agentId) {
          throw new Error("agentId is required for terminate action");
        }

        await agentManager.terminateAgent(agentId);

        return {
          agentId,
          status: "terminated",
          message: "Agent terminated successfully",
        };
      }

      case "list": {
        const agents = await agentManager.listAgents();

        return {
          agents,
          total: agents.length,
          running: agents.filter((a) => a.status === "running").length,
          terminated: agents.filter((a) => a.status === "terminated").length,
          error: agents.filter((a) => a.status === "error").length,
        };
      }

      case "result": {
        if (!agentId) {
          throw new Error("agentId is required for result action");
        }

        const result = await agentManager.getAgentResult(agentId);
        return result;
      }

      case "wait": {
        if (!agentId) {
          throw new Error("agentId is required for wait action");
        }

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

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  processManageAgent(input: any) {
    try {
      const { action, agentId, timeoutMs } = input;

      if (!action || typeof action !== "string") {
        throw new Error("Invalid action: must be a string");
      }

      if (!["status", "terminate", "list", "result", "wait"].includes(action)) {
        throw new Error(
          `Invalid action: must be one of status, terminate, list, result, wait`,
        );
      }

      // Validate agentId for actions that require it
      if (
        ["status", "terminate", "result", "wait"].includes(action) &&
        (!agentId || typeof agentId !== "string")
      ) {
        throw new Error(`agentId is required for ${action} action`);
      }

      // Log formatted information about the request
      const header = chalk.blue(`📦 Managing Agent`);
      const options = [`Action: ${chalk.yellow(action)}`];

      if (agentId) {
        options.push(`Agent ID: ${chalk.yellow(agentId)}`);
      }
      if (timeoutMs) {
        options.push(`Timeout: ${chalk.yellow(timeoutMs + "ms")}`);
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

      // Execute the management operation asynchronously
      return this.manageAgent(
        action as "status" | "terminate" | "list" | "result" | "wait",
        agentId,
        timeoutMs,
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

const MANAGE_AGENT_TOOL = {
  name: "manage_agent",
  description: `Manage and monitor Claude Code sub-agents that were spawned using spawn_agent.

Actions:
- status: Get the current status of a specific agent
- terminate: Forcefully terminate a running agent
- list: List all agents and their statuses
- result: Get the complete output and results from an agent
- wait: Wait for an agent to complete and return its results

Example usage:
1. Check status: {"action": "status", "agentId": "abc-123"}
2. List all agents: {"action": "list"}
3. Get results: {"action": "result", "agentId": "abc-123"}
4. Wait for completion: {"action": "wait", "agentId": "abc-123", "timeoutMs": 60000}
5. Terminate agent: {"action": "terminate", "agentId": "abc-123"}`,
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["status", "terminate", "list", "result", "wait"],
        description: "Action to perform on the agent(s)",
      },
      agentId: {
        type: "string",
        description:
          "Agent ID (required for status, terminate, result, and wait actions)",
      },
      timeoutMs: {
        type: "number",
        description: "Timeout in milliseconds (only for wait action)",
      },
    },
    required: ["action"],
  },
};

export { ManageAgentTool, MANAGE_AGENT_TOOL };
