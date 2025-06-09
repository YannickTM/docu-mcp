import "dotenv/config";
import {
  createEmbedding as createBuildinEmbedding,
  createEmbeddings as createBuildinEmbeddings,
  getEmbeddingDimension as getBuildinEmbeddingDimension,
} from "./endpoints/embeddings-buildin.js";
import {
  createEmbedding as createOllamaEmbedding,
  createEmbeddings as createOllamaEmbeddings,
  getEmbeddingDimension as getOllamaEmbeddingDimension,
} from "./endpoints/embeddings-ollama.js";

/**
 * Configuration for embedding generation
 */
export interface EmbeddingConfig {
  provider: "buildin" | "ollama";
  dimension: number;
  buildinModel?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

/**
 * Result from embedding generation
 */
export interface EmbeddingResult {
  embedding: number[];
  error?: string;
}

/**
 * Load embedding configuration from environment variables
 */
export function loadEmbeddingConfig(): EmbeddingConfig {
  // Get provider from environment or default to buildin
  const provider = (process.env.EMBEDDING_PROVIDER || "buildin") as
    | "buildin"
    | "ollama";

  // Get embedding dimension from environment or default to 1024
  const dimension = parseInt(process.env.EMBEDDING_DIMENSION || "1024");

  // Get Ollama configuration
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const ollamaModel = process.env.EMBEDDING_MODEL || "bge-m3";

  return {
    provider,
    dimension,
    ollamaUrl,
    ollamaModel,
  };
}

/**
 * Create a text embedding based on the configured provider
 */
export async function createEmbedding(text: string): Promise<EmbeddingResult> {
  // Load configuration
  const config = loadEmbeddingConfig();

  if (config.provider === "buildin") {
    // Generate buildin embedding
    return createBuildinEmbedding(text);
  } else {
    // Generate Ollama embedding
    return createOllamaEmbedding(text);
  }
}

/**
 * Create text embeddings for a batch of texts
 */
export async function createEmbeddings(
  texts: string[],
): Promise<EmbeddingResult[]> {
  // Load configuration
  const config = loadEmbeddingConfig();

  if (config.provider === "buildin") {
    // Generate buildin embeddings
    return createBuildinEmbeddings(texts);
  } else {
    // Generate Ollama embeddings
    return createOllamaEmbeddings(texts);
  }
}

/**
 * Get the current embedding configuration
 */
export function getEmbeddingConfig(): EmbeddingConfig {
  return loadEmbeddingConfig();
}

/**
 * Get the current embedding dimension
 */
export function getEmbeddingDimension(): number {
  const config = loadEmbeddingConfig();

  if (config.provider === "buildin") {
    return getBuildinEmbeddingDimension();
  } else {
    return getOllamaEmbeddingDimension();
  }
}
