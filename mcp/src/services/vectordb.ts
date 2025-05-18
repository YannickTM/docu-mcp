import "dotenv/config";
import * as ChromaDB from "./endpoints/db-chroma.js";
import * as QdrantDB from "./endpoints/db-qdrant.js";
import * as LanceDB from "./endpoints/db-lance.js";

/**
 * Interface for vector points to be stored in vector database
 */
export interface VectorPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

/**
 * Vector database providers
 */
export type VectorDBProvider = "chroma" | "qdrant" | "lance";

/**
 * Configuration for vector database
 */
export interface VectorDBConfig {
  provider: VectorDBProvider;
}

/**
 * Load vector database configuration from environment variables
 */
export function loadVectorDBConfig(): VectorDBConfig {
  // Get provider from environment or default to qdrant
  const provider = (process.env.VECTOR_DB_PROVIDER ||
    "lance") as VectorDBProvider;

  return {
    provider,
  };
}

/**
 * Check if the vector database is healthy and responsive
 */
export async function healthCheck(): Promise<boolean> {
  const config = loadVectorDBConfig();

  if (config.provider === "lance") {
    return LanceDB.healthCheck();
  } else if (config.provider === "chroma") {
    return ChromaDB.healthCheck();
  } else {
    return QdrantDB.healthCheck();
  }
}

/**
 * Check if a collection exists in the vector database
 */
export async function collectionExists(
  collectionName: string
): Promise<boolean> {
  const config = loadVectorDBConfig();

  if (config.provider === "lance") {
    return LanceDB.collectionExists(collectionName);
  } else if (config.provider === "chroma") {
    return ChromaDB.collectionExists(collectionName);
  } else {
    return QdrantDB.collectionExists(collectionName);
  }
}

/**
 * Delete a collection from the vector database
 */
export async function deleteCollection(
  collectionName: string
): Promise<boolean> {
  const config = loadVectorDBConfig();

  if (config.provider === "lance") {
    return LanceDB.deleteCollection(collectionName);
  } else if (config.provider === "chroma") {
    return ChromaDB.deleteCollection(collectionName);
  } else {
    return QdrantDB.deleteCollection(collectionName);
  }
}

/**
 * Convert distance metric names between different vector DB formats
 *
 * Each vector DB uses different distance metric naming conventions:
 * - ChromaDB: lowercase ("cosine", "l2", "ip")
 * - QdrantDB: capitalized ("Cosine", "Euclid", "Dot")
 * - LanceDB: lowercase ("cosine", "l2", "dot")
 */
function convertDistanceMetric(
  distance: string,
  targetProvider: VectorDBProvider
): string {
  // Normalize input to lowercase for consistent matching
  const normalizedDistance = distance.toLowerCase();

  // Standard distance metrics across all providers
  if (normalizedDistance === "cosine") {
    return targetProvider === "qdrant" ? "Cosine" : "cosine";
  }

  if (normalizedDistance === "l2" || normalizedDistance === "euclid") {
    return targetProvider === "qdrant" ? "Euclid" : "l2";
  }

  if (normalizedDistance === "ip" || normalizedDistance === "dot") {
    if (targetProvider === "chroma") return "ip";
    if (targetProvider === "qdrant") return "Dot";
    return "dot"; // lance
  }

  // Default values if no mapping found
  const defaults = {
    chroma: "cosine",
    qdrant: "Cosine",
    lance: "cosine",
  };

  return defaults[targetProvider];
}

/**
 * Create a new collection in the vector database
 */
export async function createCollection(
  collectionName: string,
  vectorSize: number,
  distance: string = "cosine"
): Promise<boolean> {
  const config = loadVectorDBConfig();

  if (config.provider === "lance") {
    const lanceDistance = convertDistanceMetric(distance, "lance") as
      | "cosine"
      | "l2"
      | "dot";
    return LanceDB.createCollection(collectionName, vectorSize, lanceDistance);
  } else if (config.provider === "chroma") {
    const chromaDistance = convertDistanceMetric(distance, "chroma") as
      | "cosine"
      | "l2"
      | "ip";
    return ChromaDB.createCollection(
      collectionName,
      vectorSize,
      chromaDistance
    );
  } else {
    const qdrantDistance = convertDistanceMetric(distance, "qdrant") as
      | "Cosine"
      | "Euclid"
      | "Dot";
    return QdrantDB.createCollection(
      collectionName,
      vectorSize,
      qdrantDistance
    );
  }
}

/**
 * Upsert points into a collection
 */
export async function upsertPoints(
  collectionName: string,
  points: VectorPoint[]
): Promise<boolean> {
  const config = loadVectorDBConfig();

  if (config.provider === "lance") {
    // Convert points to LanceDB format if needed
    const lancePoints = points.map((point) =>
      LanceDB.createPoint(point.id, point.vector, point.payload)
    );
    return LanceDB.upsertPoints(collectionName, lancePoints);
  } else if (config.provider === "chroma") {
    // Convert points to ChromaDB format if needed
    const chromaPoints = points.map((point) =>
      ChromaDB.createPoint(point.id, point.vector, point.payload)
    );
    return ChromaDB.upsertPoints(collectionName, chromaPoints);
  } else {
    // Convert points to QdrantDB format if needed
    const qdrantPoints = points.map((point) =>
      QdrantDB.createPoint(point.id, point.vector, point.payload)
    );
    return QdrantDB.upsertPoints(collectionName, qdrantPoints);
  }
}

/**
 * Handle filter conversion between different vector DB implementations
 * This is a simplification and might need adjustment based on specific filter needs
 */
function convertFilter(
  filter: Record<string, any> | undefined,
  targetProvider: VectorDBProvider
): Record<string, any> | undefined {
  if (!filter) return undefined;

  // Currently we're using a consistent filter format across providers
  // If more complex conversion is needed in the future, implement it here
  // Based on the specific requirements of each DB implementation

  // For LanceDB, we're already handling the filter conversion in the db-lance.ts implementation
  // For ChromaDB, we're handling it in db-chroma.ts
  // For QdrantDB, we're using the filter format directly

  return filter;
}

/**
 * Search for similar vectors in a collection
 */
export async function search(
  collectionName: string,
  vector: number[],
  limit: number = 10,
  filter?: Record<string, any>,
  distance: string = "cosine"
): Promise<any[]> {
  const config = loadVectorDBConfig();

  if (config.provider === "lance") {
    const lanceFilter = convertFilter(filter, "lance");
    const lanceDistance = convertDistanceMetric(distance, "lance") as
      | "cosine"
      | "l2"
      | "dot";
    return LanceDB.search(
      collectionName,
      vector,
      limit,
      lanceFilter,
      lanceDistance
    );
  } else if (config.provider === "chroma") {
    const chromaFilter = convertFilter(filter, "chroma");
    return ChromaDB.search(collectionName, vector, limit, chromaFilter);
  } else {
    const qdrantFilter = convertFilter(filter, "qdrant");
    return QdrantDB.search(collectionName, vector, limit, qdrantFilter);
  }
}

/**
 * Helper function to create a point object
 */
export function createPoint(
  id: string | number,
  vector: number[],
  metadata: Record<string, any> = {}
): VectorPoint {
  const config = loadVectorDBConfig();

  if (config.provider === "lance") {
    return LanceDB.createPoint(id, vector, metadata);
  } else if (config.provider === "chroma") {
    return ChromaDB.createPoint(id, vector, metadata);
  } else {
    // Qdrant requires numeric IDs
    const pointId = Date.now() + Math.floor(Math.random() * 1000);
    return QdrantDB.createPoint(pointId, vector, metadata);
  }
}

/**
 * Get the current vector database configuration
 */
export function getVectorDBConfig(): VectorDBConfig {
  return loadVectorDBConfig();
}
