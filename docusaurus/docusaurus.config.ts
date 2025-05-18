import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "DocuMCP",
  tagline: "Contextual documentation with RAG capabilities",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://yannicktm.github.io/",
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: "/docu-mcp/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "YannickTM", // Usually your GitHub org/user name.
  projectName: "docu-mcp", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Remove the edit URL since we're not using GitHub for this
          editUrl: undefined,
        },
        blog: false, // Disable the blog feature
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/docusaurus-social-card.jpg",
    navbar: {
      title: "DocuMCP",
      logo: {
        alt: "DocuMCP Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "documentationSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://github.com/YannickTM/docu-mcp",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            {
              label: "Introduction",
              to: "/docs/intro",
            },
            {
              label: "Getting Started",
              to: "/docs/getting-started",
            },
            {
              label: "Project Overview",
              to: "/docs/project-overview",
            },
            {
              label: "MCP Tools",
              to: "/docs/mcp/tools",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/YannickTM/docu-mcp",
            },
            {
              label: "MCP Protocol",
              href: "https://modelcontextprotocol.io/",
            },
            {
              label: "MCP Typescript SDK",
              href: "https://github.com/modelcontextprotocol/typescript-sdk",
            },
            {
              label: "Ollama",
              href: "https://ollama.com/",
            },
            {
              label: "Qdrant",
              href: "https://qdrant.tech/",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} DocuMCP. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["typescript", "bash", "json"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
