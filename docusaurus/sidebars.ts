import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation
 */
const sidebars: SidebarsConfig = {
  documentationSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "Introduction",
    },
    {
      type: "doc",
      id: "getting-started",
      label: "Getting Started",
    },
    {
      type: "doc",
      id: "project-overview",
      label: "Project Overview",
    },
    {
      type: "doc",
      id: "client-integration",
      label: "Client Integration",
    },
    {
      type: "category",
      label: "Fundamentals",
      items: ["fundamentals/mcp", "fundamentals/rag", "fundamentals/vector-db"],
    },
    {
      type: "category",
      label: "MCP Tools",
      items: [
        "mcp/tools/index",
        {
          type: "category",
          label: "File System Tools",
          items: [
            "mcp/tools/read-file",
            "mcp/tools/write-file",
            "mcp/tools/read-directory",
            "mcp/tools/create-directory",
            "mcp/tools/index-file",
            "mcp/tools/index-directory",
          ],
        },
        {
          type: "category",
          label: "Search Tools",
          items: [
            "mcp/tools/search-codebase",
            "mcp/tools/search-documentation",
            "mcp/tools/search-diagram",
            "mcp/tools/search-user-guide",
          ],
        },
        {
          type: "category",
          label: "Documentation Tools",
          items: [
            "mcp/tools/explain-code",
            "mcp/tools/generate-diagram",
            "mcp/tools/merge-diagram",
            "mcp/tools/generate-documentation",
            "mcp/tools/merge-documentation",
            "mcp/tools/generate-user-guide",
          ],
        },
        {
          type: "category",
          label: "Agent Orchestration Tools",
          items: ["mcp/tools/spawn-agent", "mcp/tools/manage-agent"],
        },
      ],
    },
  ],
};

export default sidebars;
