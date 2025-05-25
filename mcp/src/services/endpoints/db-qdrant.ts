import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";
import { logger } from "../logger.js";
/**
 * Interface for vector points to be stored in Qdrant
 */
interface VectorPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

/**
 * Initialize Qdrant client with configuration
 */
const createClient = (): QdrantClient => {
  const config: Record<string, any> = {
    url: process.env.QDRANT_URL || "http://localhost:6333",
  };

  if (process.env.QDRANT_API_KEY) {
    config.apiKey = process.env.QDRANT_API_KEY;
  }

  return new QdrantClient(config);
};

/**
 * Initialize Qdrant client
 */
const client = createClient();

export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await client.versionInfo();
    return response.title === "qdrant - vector search engine";
  } catch (error) {
    logger.error("Qdrant health check failed:", error as Error);
    throw error;
  }
};

export const collectionExists = async (
  collectionName: string,
): Promise<boolean> => {
  try {
    const response = await client.collectionExists(collectionName);
    return response.exists;
  } catch (error: any) {
    logger.error(
      `Error checking collection ${collectionName}:`,
      error as Error,
    );
    throw error;
  }
};

export const createCollection = async (
  collectionName: string,
  vectorSize: number,
  distance: "Cosine" | "Euclid" | "Dot" = "Cosine",
): Promise<boolean> => {
  try {
    await client.createCollection(collectionName, {
      vectors: {
        size: vectorSize,
        distance,
      },
    });
    return true;
  } catch (error) {
    logger.error(
      `Error creating collection ${collectionName}:`,
      error as Error,
    );
    throw error;
  }
};

export const upsertPoints = async (
  collectionName: string,
  points: VectorPoint[],
): Promise<boolean> => {
  try {
    await client.upsert(collectionName, {
      points: points.map((point) => ({
        id: point.id,
        vector: point.vector,
        payload: point.payload || {},
      })),
      wait: true,
    });
    return true;
  } catch (error) {
    logger.error(
      `Error upserting points to ${collectionName}:`,
      error as Error,
    );
    throw error;
  }
};

export const search = async (
  collectionName: string,
  vector: number[],
  limit: number = 10,
  filter?: Record<string, any>,
): Promise<any[]> => {
  try {
    const searchParams: any = {
      vector,
      limit,
      with_payload: true,
      with_vectors: false,
    };

    if (filter) {
      searchParams.filter = filter;
    }

    const response = await client.search(collectionName, searchParams);
    logger.info(
      `Searched collection ${collectionName}, found ${response.length} results`,
    );

    return response || [];
  } catch (error) {
    logger.error(
      `Error searching in collection ${collectionName}:`,
      error as Error,
    );
    throw error;
  }
};

/**
 * Helper function to create a point object
 *
 * Note: Qdrant requires point IDs to be either an unsigned integer or a UUID
 */
export function createPoint(
  id: string | number,
  vector: number[],
  metadata: Record<string, any> = {},
): VectorPoint {
  // Ensure ID is converted to a number if it's a numeric string
  const pointId =
    typeof id === "string" && !isNaN(Number(id)) ? parseInt(id, 10) : id;

  return {
    id: pointId,
    vector,
    payload: metadata,
  };
}

/**
 * Delete a collection from QdrantDB
 */
export const deleteCollection = async (
  collectionName: string,
): Promise<boolean> => {
  try {
    // Check if collection exists
    if (await collectionExists(collectionName)) {
      await client.deleteCollection(collectionName);

      logger.warn(`Deleted QdrantDB collection '${collectionName}'`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(
      `Error deleting collection ${collectionName}:`,
      error as Error,
    );
    throw error;
  }
};

// Export types
export type { VectorPoint };
