import { spawn, type ChildProcess } from "child_process";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "./logger.js";

export interface AgentProcess {
  id: string;
  process: ChildProcess;
  status: "running" | "terminated" | "error";
  startTime: Date;
  endTime?: Date;
  config: AgentConfig;
  output: string[];
  sessionId?: string;
}

export interface AgentConfig {
  task: string;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  maxTurns?: number;
  outputFormat?: "text" | "json" | "stream-json";
  mcpConfig?: any;
  workingDirectory?: string;
  env?: Record<string, string>;
  model?: string;
}

export interface AgentResult {
  agentId: string;
  sessionId?: string;
  output: string;
  exitCode: number | null;
  error?: string;
  cost?: number;
  duration?: number;
}

export class AgentManager {
  private agents: Map<string, AgentProcess> = new Map();
  private mcpConfigDir: string;
  private maxConcurrentAgents: number;

  constructor() {
    this.mcpConfigDir = path.join(
      process.env.HOME || "/tmp",
      ".claude-supervisor",
      "mcp-configs",
    );
    this.maxConcurrentAgents = parseInt(
      process.env.MAX_CONCURRENT_AGENTS || "5",
      10,
    );
  }

  async initialize(): Promise<void> {
    // Create MCP config directory
    await fs.mkdir(this.mcpConfigDir, { recursive: true });
    logger.info("AgentManager initialized", {
      mcpConfigDir: this.mcpConfigDir,
    });
  }

  async spawnAgent(config: AgentConfig): Promise<string> {
    // Check concurrent agent limit
    const runningAgents = Array.from(this.agents.values()).filter(
      (a) => a.status === "running",
    ).length;
    if (runningAgents >= this.maxConcurrentAgents) {
      throw new Error(
        `Maximum concurrent agents limit (${this.maxConcurrentAgents}) reached`,
      );
    }

    const agentId = uuidv4();

    // Generate MCP config file for this agent
    const mcpConfigPath = await this.generateMcpConfig(agentId, config);

    // Build command arguments - no quotes needed when shell: false
    const args: string[] = ["-p", config.task];

    // Add model if specified in config or environment variable
    const model = config.model || process.env.SUB_AGENT_MODEL;
    if (model) {
      args.push("--model", model);
    }

    // Add MCP config
    if (mcpConfigPath) {
      args.push("--mcp-config", mcpConfigPath);
    }

    // Add output format
    if (config.outputFormat) {
      args.push("--output-format", config.outputFormat);
    }

    // Add system prompt overrides
    if (config.systemPrompt) {
      args.push("--system-prompt", config.systemPrompt);
    } else if (config.appendSystemPrompt) {
      args.push("--append-system-prompt", config.appendSystemPrompt);
    }

    // Add tool permissions
    if (config.allowedTools && config.allowedTools.length > 0) {
      args.push("--allowedTools", config.allowedTools.join(","));
    }
    if (config.disallowedTools && config.disallowedTools.length > 0) {
      args.push("--disallowedTools", config.disallowedTools.join(","));
    }

    // Add max turns
    if (config.maxTurns) {
      args.push("--max-turns", config.maxTurns.toString());
    }

    // Spawn the Claude process
    const env = {
      ...process.env,
      ...config.env,
      // Ensure the sub-agent uses the same vector DB as the supervisor
      VECTOR_DB_PROVIDER: process.env.VECTOR_DB_PROVIDER || "lance",
      LANCE_PATH:
        process.env.LANCE_PATH ||
        path.join(process.env.HOME || "/tmp", "lanceDB"),
      CHROMA_URL: process.env.CHROMA_URL,
      QDRANT_URL: process.env.QDRANT_URL,
      EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || "buildin",
      EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "all-MiniLM-L6-v2",
      EMBEDDING_DIMENSION: process.env.EMBEDDING_DIMENSION || "384",
    };

    logger.info(`Spawning agent ${agentId}`, {
      command: "claude",
      args,
      workingDirectory: config.workingDirectory || process.cwd(),
      model: model || "claude-sonnet-4-20250514",
    });

    const agentProcess = spawn("claude", args, {
      cwd: config.workingDirectory || process.cwd(),
      env,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    const agent: AgentProcess = {
      id: agentId,
      process: agentProcess,
      status: "running",
      startTime: new Date(),
      config,
      output: [],
    };

    // Handle process spawn error
    agentProcess.on("error", (error) => {
      logger.error(`Agent ${agentId} spawn error:`, error);
      agent.status = "error";
      agent.output.push(`[SPAWN ERROR] ${error.message}`);
    });

    // Close stdin since we're using -p flag (one-off query)
    agentProcess.stdin?.end();

    // Handle process output
    if (agentProcess.stdout) {
      agentProcess.stdout.on("data", (data) => {
        const output = data.toString();
        agent.output.push(output);

        // Extract session ID from JSON output if available
        if (
          config.outputFormat === "json" ||
          config.outputFormat === "stream-json"
        ) {
          try {
            const parsed = JSON.parse(output);
            if (parsed.session_id) {
              agent.sessionId = parsed.session_id;
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_e: any) {
            // Not JSON or partial output
          }
        }

        logger.debug(`Agent ${agentId} stdout:`, output);
      });
    }

    if (agentProcess.stderr) {
      agentProcess.stderr.on("data", (data) => {
        const error = data.toString();
        agent.output.push(`[ERROR] ${error}`);
        logger.error(`Agent ${agentId} stderr:`, error);
      });
    }

    // Handle process exit
    agentProcess.on("exit", (code, signal) => {
      agent.status = code === 0 ? "terminated" : "error";
      agent.endTime = new Date();
      logger.info(`Agent ${agentId} exited`, { code, signal });

      // Clean up MCP config file
      if (mcpConfigPath) {
        fs.unlink(mcpConfigPath).catch((err) =>
          logger.error("Failed to clean up MCP config", {
            error: err,
            path: mcpConfigPath,
          }),
        );
      }
    });

    this.agents.set(agentId, agent);
    logger.info(`Spawned agent ${agentId}`, { config });

    return agentId;
  }

  async terminateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== "running") {
      throw new Error(
        `Agent ${agentId} is not running (status: ${agent.status})`,
      );
    }

    // Kill the process
    agent.process.kill("SIGTERM");

    // Give it time to gracefully shutdown
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Force kill if still running
    if (!agent.process.killed) {
      agent.process.kill("SIGKILL");
    }

    agent.status = "terminated";
    agent.endTime = new Date();

    logger.info(`Terminated agent ${agentId}`);
  }

  async getAgentStatus(agentId: string): Promise<AgentProcess | undefined> {
    return this.agents.get(agentId);
  }

  async getAgentResult(agentId: string): Promise<AgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const output = agent.output.join("");
    const result: AgentResult = {
      agentId,
      sessionId: agent.sessionId,
      output,
      exitCode: agent.process.exitCode,
    };

    // Parse JSON output if available
    if (
      (agent.config.outputFormat === "json" ||
        agent.config.outputFormat === "stream-json") &&
      output
    ) {
      try {
        // For stream-json, find the result message
        if (agent.config.outputFormat === "stream-json") {
          const lines = output.split("\n").filter((line) => line.trim());
          for (const line of lines.reverse()) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === "result") {
                result.cost = parsed.cost_usd;
                result.duration = parsed.duration_ms;
                if (parsed.subtype === "error_max_turns") {
                  result.error = "Maximum turns reached";
                }
                break;
              }
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e: any) {
              // Skip non-JSON lines
            }
          }
        } else {
          // Regular JSON output
          const parsed = JSON.parse(output);
          result.cost = parsed.cost_usd;
          result.duration = parsed.duration_ms;
          if (parsed.is_error) {
            result.error = parsed.error || "Unknown error";
          }
        }
      } catch (e) {
        logger.error("Failed to parse agent JSON output", {
          error: e,
          agentId,
        });
      }
    }

    return result;
  }

  async listAgents(): Promise<
    Array<{ id: string; status: string; startTime: Date; task: string }>
  > {
    return Array.from(this.agents.values()).map((agent) => ({
      id: agent.id,
      status: agent.status,
      startTime: agent.startTime,
      task: agent.config.task,
    }));
  }

  async waitForAgent(
    agentId: string,
    timeoutMs?: number,
  ): Promise<AgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return new Promise((resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout | undefined;

      if (timeoutMs) {
        timeoutHandle = setTimeout(() => {
          agent.process.removeAllListeners("exit");
          reject(new Error(`Agent ${agentId} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      agent.process.on("exit", async () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        try {
          const result = await this.getAgentResult(agentId);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      // If already terminated, resolve immediately
      if (agent.status !== "running") {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        this.getAgentResult(agentId).then(resolve).catch(reject);
      }
    });
  }

  private async generateMcpConfig(
    agentId: string,
    config: AgentConfig,
  ): Promise<string | null> {
    if (!config.mcpConfig) {
      return null;
    }

    // Create agent-specific MCP config
    const mcpConfig = {
      mcpServers: {
        // Include the DocuMCP server for documentation tasks
        "docu-mcp": {
          command: "npx",
          args: ["-y", "@myjungle/docu-mcp-server"],
          env: {
            // Share the same vector DB configuration
            VECTOR_DB_PROVIDER: process.env.VECTOR_DB_PROVIDER || "lance",
            LANCE_PATH:
              process.env.LANCE_PATH ||
              path.join(process.env.HOME || "/tmp", "lanceDB"),
            CHROMA_URL: process.env.CHROMA_URL,
            QDRANT_URL: process.env.QDRANT_URL,
            EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || "buildin",
            EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "all-MiniLM-L6-v2",
            EMBEDDING_DIMENSION: process.env.EMBEDDING_DIMENSION || "384",
          },
        },
        // Merge with any additional MCP servers from config
        ...config.mcpConfig.mcpServers,
      },
    };

    const configPath = path.join(this.mcpConfigDir, `agent-${agentId}.json`);
    await fs.writeFile(configPath, JSON.stringify(mcpConfig, null, 2));

    return configPath;
  }

  async cleanup(): Promise<void> {
    // Terminate all running agents
    for (const [agentId, agent] of this.agents) {
      if (agent.status === "running") {
        try {
          await this.terminateAgent(agentId);
        } catch (err) {
          logger.error("Failed to terminate agent during cleanup", {
            agentId,
            error: err,
          });
        }
      }
    }

    // Clean up MCP config directory
    try {
      await fs.rm(this.mcpConfigDir, { recursive: true, force: true });
    } catch (err) {
      logger.error("Failed to clean up MCP config directory", { error: err });
    }
  }
}

// Singleton instance
export const agentManager = new AgentManager();
