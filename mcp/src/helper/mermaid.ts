import mermaid from "mermaid";

/**
 * Mermaid.js syntax validation helper using the official mermaid package
 */

// Initialize mermaid for Node.js environment
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
});

/**
 * Validates if the provided string contains valid Mermaid.js syntax
 * @param mermaidStr - The Mermaid diagram string to validate
 * @returns Promise<boolean> - true if syntax is valid, false otherwise
 */
export async function validateMermaidSyntax(
  mermaidStr: string,
): Promise<boolean> {
  if (!mermaidStr?.trim()) {
    return false;
  }

  try {
    await mermaid.parse(mermaidStr.trim());
    return true;
  } catch {
    return false;
  }
}

/**
 * Synchronous version for basic validation (checks diagram type only)
 * @param mermaidStr - The Mermaid diagram string to validate
 * @returns boolean - true if diagram type is valid, false otherwise
 */
export function validateMermaidSyntaxSync(mermaidStr: string): boolean {
  if (!mermaidStr?.trim()) {
    return false;
  }

  const supportedTypes = [
    "graph",
    "flowchart",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "stateDiagram-v2",
    "erDiagram",
    "journey",
    "gantt",
    "pie",
    "quadrantChart",
    "requirementDiagram",
    "gitGraph",
    "mindmap",
    "timeline",
    "zenuml",
    "sankey-beta",
    "block-beta",
  ];

  const firstLine = mermaidStr.trim().split("\n")[0].trim();
  return supportedTypes.some(
    (type) => firstLine.startsWith(type) || firstLine.startsWith("%%{init:"),
  );
}

/**
 * Validates and returns detailed error information
 * @param mermaidStr - The Mermaid diagram string to validate
 * @returns Promise with validation result and error details
 */
export async function validateMermaidSyntaxWithDetails(
  mermaidStr: string,
): Promise<{ valid: boolean; error?: string; line?: number }> {
  if (!mermaidStr || typeof mermaidStr !== "string") {
    return { valid: false, error: "Input must be a non-empty string" };
  }

  const trimmed = mermaidStr.trim();
  if (!trimmed) {
    return { valid: false, error: "Diagram content is empty" };
  }

  try {
    await mermaid.parse(trimmed);
    return { valid: true };
  } catch (error) {
    let errorMessage = "Invalid mermaid syntax";
    let line: number | undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      // Try to extract line number from error message
      const lineMatch = error.message.match(/line (\d+)/i);
      if (lineMatch) {
        line = parseInt(lineMatch[1], 10);
      }
    }

    return {
      valid: false,
      error: errorMessage,
      line,
    };
  }
}

/**
 * Synchronous version of validateWithDetails (basic validation only)
 * @param mermaidStr - The Mermaid diagram string to validate
 * @returns Validation result with basic error information
 */
export function validateMermaidSyntaxWithDetailsSync(mermaidStr: string): {
  valid: boolean;
  error?: string;
  line?: number;
} {
  if (!mermaidStr || typeof mermaidStr !== "string") {
    return { valid: false, error: "Input must be a non-empty string" };
  }

  const trimmed = mermaidStr.trim();
  if (!trimmed) {
    return { valid: false, error: "Diagram content is empty" };
  }

  const supportedTypes = [
    "graph",
    "flowchart",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "stateDiagram-v2",
    "erDiagram",
    "journey",
    "gantt",
    "pie",
    "quadrantChart",
    "requirementDiagram",
    "gitGraph",
    "mindmap",
    "timeline",
    "zenuml",
    "sankey-beta",
    "block-beta",
  ];

  const firstLine = trimmed.split("\n")[0].trim();
  const hasValidType = supportedTypes.some(
    (type) => firstLine.startsWith(type) || firstLine.startsWith("%%{init:"),
  );

  if (!hasValidType) {
    return {
      valid: false,
      error: "Unknown diagram type",
      line: 1,
    };
  }

  return { valid: true };
}
