import "dotenv/config";
import axios from "axios";

/**
 * Configuration for Ollama embedding generation
 */
export interface OllamaEmbeddingConfig {
  dimension: number;
  url: string;
  model: string;
}

/**
 * Result from embedding generation
 */
export interface EmbeddingResult {
  embedding: number[];
  error?: string;
}

/**
 * Load Ollama embedding configuration from environment variables
 */
export function loadEmbeddingConfig(): OllamaEmbeddingConfig {
  // Get embedding dimension from environment or default to 1024
  const dimension = parseInt(process.env.EMBEDDING_DIMENSION || "1024");

  // Get Ollama configuration
  const url = process.env.OLLAMA_URL || "http://localhost:11434";
  const model = process.env.EMBEDDING_MODEL || "bge-m3";

  return {
    dimension,
    url,
    model,
  };
}

/**
 * Generate embeddings using Ollama API
 */
async function generateEmbedding(
  text: string,
  url: string,
  model: string
): Promise<number[]> {
  try {
    const response = await axios.post(`${url}/api/embeddings`, {
      model: model,
      prompt: text,
    });

    if (response.data && response.data.embedding) {
      return response.data.embedding;
    } else {
      throw new Error("Invalid response from Ollama API");
    }
  } catch (error) {
    console.error("Error generating Ollama embedding:", error);
    throw new Error(
      `Failed to generate Ollama embedding: ${(error as Error).message}`
    );
  }
}

/**
 * Create a text embedding using Ollama
 */
export async function createEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    // Load configuration
    const config = loadEmbeddingConfig();

    // Generate Ollama embedding
    const embedding = await generateEmbedding(text, config.url, config.model);

    return { embedding };
  } catch (error) {
    console.error("Error creating Ollama embedding:", error);
    return {
      embedding: new Array(loadEmbeddingConfig().dimension).fill(0),
      error: (error as Error).message,
    };
  }
}

/**
 * Create text embeddings for a batch of texts using Ollama
 */
export async function createEmbeddings(
  texts: string[]
): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];

  for (const text of texts) {
    results.push(await createEmbedding(text));
  }

  return results;
}

/**
 * Get the current embedding dimension
 */
export function getEmbeddingDimension(): number {
  return loadEmbeddingConfig().dimension;
}
