import "dotenv/config";
import { QdrantClient } from "@qdrant/js-client-rest";

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
    const response = await client.api("service").healthz({});
    return response.status === 200;
  } catch (error) {
    console.error("Qdrant health check failed:", error);
    throw error;
  }
};

export const collectionExists = async (
  collectionName: string
): Promise<boolean> => {
  try {
    await client
      .api("collections")
      .getCollection({ collection_name: collectionName });
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
};

export const createCollection = async (
  collectionName: string,
  vectorSize: number,
  distance: "Cosine" | "Euclid" | "Dot" = "Cosine"
): Promise<boolean> => {
  try {
    await client.api("collections").createCollection({
      collection_name: collectionName,
      vectors: {
        size: vectorSize,
        distance,
      },
    });
    return true;
  } catch (error) {
    console.error(`Error creating collection ${collectionName}:`, error);
    throw error;
  }
};

export const upsertPoints = async (
  collectionName: string,
  points: VectorPoint[]
): Promise<boolean> => {
  try {
    const respo = await client.api("points").upsertPoints({
      collection_name: collectionName,
      points: points.map((point) => ({
        id: point.id,
        vector: point.vector,
        payload: point.payload || {},
      })),
      wait: true,
    });
    return true;
  } catch (error) {
    console.error(`Error upserting points to ${collectionName}:`, error);
    throw error;
  }
};

export const search = async (
  collectionName: string,
  vector: number[],
  limit: number = 10,
  filter?: Record<string, any>
): Promise<any[]> => {
  try {
    const searchParams: any = {
      collection_name: collectionName,
      vector,
      limit,
      with_payload: true,
      with_vectors: false,
    };

    if (filter) {
      searchParams.filter = filter;
    }

    const response = await client.api("points").searchPoints(searchParams);
    console.warn(
      `Searching collection ${collectionName} with vector: ${JSON.stringify(
        vector
      )}`
    );

    return (response as any).data.result || [];
  } catch (error) {
    console.error(`Error searching in collection ${collectionName}:`, error);
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
  metadata: Record<string, any> = {}
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
export const deleteCollection = async (collectionName: string): Promise<boolean> => {
  try {
    // Check if collection exists
    if (await collectionExists(collectionName)) {
      await client.api("collections").deleteCollection({ 
        collection_name: collectionName 
      });
      
      console.warn(`Deleted QdrantDB collection '${collectionName}'`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error deleting collection ${collectionName}:`, error);
    throw error;
  }
};

// Export types
export type { VectorPoint };
