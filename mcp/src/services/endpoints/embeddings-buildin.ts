import "dotenv/config";
import { pipeline } from "@huggingface/transformers";

/**
 * Configuration for buildin embedding generation
 */
export interface BuildinEmbeddingConfig {
  dimension: number;
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
 * Load buildin embedding configuration from environment variables
 */
export function loadEmbeddingConfig(): BuildinEmbeddingConfig {
  // Get buildin model from environment or default to sentence-transformers/all-MiniLM-L6-v2
  const model =
    process.env.EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";
    
  // Get embedding dimension based on the model:
  // - all-MiniLM-L6-v2: 384 dimensions
  // - other models: 1024 dimensions (default fallback) or from environment
  let dimension: number;
  
  if (model.includes("all-MiniLM-L6-v2")) {
    dimension = 384; // This model has 384 dimensions
  } else {
    dimension = parseInt(process.env.EMBEDDING_DIMENSION || "1024");
  }

  return {
    dimension,
    model,
  };
}

// Cache for the embedding pipeline
let embeddingPipeline: any = null;

/**
 * Get the buildin embedding pipeline
 */
async function getEmbeddingPipeline(model: string) {
  if (!embeddingPipeline) {
    console.warn(
      `Initializing buildin embedding pipeline with model: ${model}`
    );
    embeddingPipeline = await pipeline("feature-extraction", model);
  }
  return embeddingPipeline;
}

/**
 * Generate embeddings using buildin models via @xenova/transformers
 */
async function generateEmbedding(
  text: string,
  model: string
): Promise<number[]> {
  try {
    const pipe = await getEmbeddingPipeline(model);

    // Generate embedding
    const result = await pipe(text, {
      pooling: "mean",
      normalize: true,
    });

    // Extract the embedding data from result
    return Array.from(result.data);
  } catch (error) {
    console.error("Error generating buildin embedding:", error);
    throw new Error(
      `Failed to generate buildin embedding: ${(error as Error).message}`
    );
  }
}

/**
 * Create a text embedding using buildin model
 */
export async function createEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    // Load configuration
    const config = loadEmbeddingConfig();

    // Generate buildin embedding
    const embedding = await generateEmbedding(text, config.model);

    return { embedding };
  } catch (error) {
    console.error("Error creating buildin embedding:", error);
    return {
      embedding: new Array(loadEmbeddingConfig().dimension).fill(0),
      error: (error as Error).message,
    };
  }
}

/**
 * Create text embeddings for a batch of texts using buildin model
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
