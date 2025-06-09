/* eslint-disable @typescript-eslint/no-non-null-assertion */
import "dotenv/config";
import type { Collection } from "chromadb";
import { ChromaClient } from "chromadb";
import { logger } from "../logger.js";
/**
 * Interface for vector points to be stored in ChromaDB
 */
interface VectorPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

/**
 * Initialize ChromaDB client with buildin configuration
 */
const createClient = (): ChromaClient => {
  return new ChromaClient({
    path: process.env.CHROMA_URL || "http://localhost:8000",
  });
};

/**
 * Initialize ChromaDB client
 */
const client = createClient();

// Cache for collection references
const collectionCache: Record<string, Collection> = {};

/**
 * Health check function
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    // Basic health check - attempt to list collections
    await client.listCollections();
    return true;
  } catch (error) {
    logger.error("ChromaDB health check failed:", error as Error);
    throw error;
  }
};

/**
 * Get a collection by name, with caching
 */
const getCollection = async (
  collectionName: string,
): Promise<Collection | null> => {
  if (collectionCache[collectionName]) {
    return collectionCache[collectionName];
  }

  try {
    const collections = await client.listCollections();
    const exists = collections.some((c) => c.name === collectionName);

    if (exists) {
      const collection = await client.getCollection({ name: collectionName });
      collectionCache[collectionName] = collection;
      return collection;
    }

    return null;
  } catch (error) {
    logger.error(`Error getting collection ${collectionName}:`, error as Error);
    throw error;
  }
};

/**
 * Check if a collection exists
 */
export const collectionExists = async (
  collectionName: string,
): Promise<boolean> => {
  try {
    const collection = await getCollection(collectionName);
    return collection !== null;
  } catch (error) {
    logger.error(
      `Error checking if collection ${collectionName} exists:`,
      error as Error,
    );
    throw error;
  }
};

/**
 * Create a new collection
 */
export const createCollection = async (
  collectionName: string,
  vectorSize: number,
  distance: "cosine" | "l2" | "ip" = "cosine",
): Promise<boolean> => {
  try {
    // Check if collection already exists
    if (await collectionExists(collectionName)) {
      // Collection already exists
      return true;
    }

    // Create new collection
    const collection = await client.createCollection({
      name: collectionName,
      metadata: {
        dimension: vectorSize,
        distance_function: distance,
      },
    });

    // Add to cache
    collectionCache[collectionName] = collection;
    return true;
  } catch (error) {
    logger.error(
      `Error creating collection ${collectionName}:`,
      error as Error,
    );
    throw error;
  }
};

/**
 * Convert a numeric ID to a string (ChromaDB requires string IDs)
 */
const formatId = (id: string | number): string => {
  return id.toString();
};

/**
 * Upsert points into a collection
 */
export const upsertPoints = async (
  collectionName: string,
  points: VectorPoint[],
): Promise<boolean> => {
  try {
    // Get collection
    let collection = await getCollection(collectionName);
    if (!collection) {
      const created = await createCollection(
        collectionName,
        points[0].vector.length,
      );
      if (!created) {
        throw new Error(`Failed to create collection ${collectionName}`);
      }
      collection = await getCollection(collectionName);
      if (!collection) {
        throw new Error(
          `Failed to get collection ${collectionName} after creation`,
        );
      }
    }

    // Format points for ChromaDB
    const ids = points.map((p) => formatId(p.id));
    const embeddings = points.map((p) => p.vector);
    const metadatas = points.map((p) => p.payload || {});
    const documents = points.map((p) => p.payload?.content || "");

    // Upsert points
    await collection.upsert({
      ids,
      embeddings,
      metadatas,
      documents,
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

/**
 * Convert Qdrant filter format to ChromaDB where clause format
 * This is a simplification and might need adjustment based on your specific filter needs
 */
const convertFilter = (
  filter?: Record<string, any>,
): Record<string, any> | undefined => {
  if (!filter) return undefined;

  // Simple conversion for the most common filter cases in your codebase
  const whereClause: Record<string, any> = {};

  if (filter.must) {
    filter.must.forEach((condition: any) => {
      if (condition.key && condition.match) {
        // Handle array value (any match)
        if (condition.match.any && Array.isArray(condition.match.any)) {
          whereClause[condition.key] = { $in: condition.match.any };
        }
        // Handle text match
        else if (condition.match.text) {
          whereClause[condition.key] = condition.match.text;
        }
      }
    });
  }

  return Object.keys(whereClause).length > 0 ? whereClause : undefined;
};

/**
 * Search for similar vectors
 */
export const search = async (
  collectionName: string,
  vector: number[],
  limit: number = 10,
  filter?: Record<string, any>,
): Promise<any[]> => {
  try {
    // Get collection
    const collection = await getCollection(collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} does not exist`);
    }

    // Convert filter to ChromaDB format
    const whereClause = convertFilter(filter);

    // Perform search
    const results = await collection.query({
      queryEmbeddings: [vector],
      nResults: limit,
      where: whereClause,
    });

    // Format results to match Qdrant response format
    const formattedResults = [];

    if (results.ids && results.ids.length > 0 && results.ids[0].length > 0) {
      for (let i = 0; i < results.ids[0].length; i++) {
        formattedResults.push({
          // ChromaDB returns distances, convert to scores (1 - distance for cosine)
          score:
            results.distances?.[0]?.[i] !== null &&
            results.distances?.[0]?.[i] !== undefined
              ? 1 - results.distances[0][i]!
              : 1,
          // Combine metadata and document content
          payload: {
            ...results.metadatas?.[0][i],
            content: results.documents?.[0][i] || "",
          },
        });
      }
    }

    return formattedResults;
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
 * Note: ChromaDB requires point IDs to be strings
 */
export function createPoint(
  id: string | number,
  vector: number[],
  metadata: Record<string, any> = {},
): VectorPoint {
  return {
    id,
    vector,
    payload: metadata,
  };
}

/**
 * Delete a collection from ChromaDB
 */
export const deleteCollection = async (
  collectionName: string,
): Promise<boolean> => {
  try {
    // Check if collection exists
    if (await collectionExists(collectionName)) {
      await client.deleteCollection({ name: collectionName });

      // Remove from cache
      if (collectionCache[collectionName]) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete collectionCache[collectionName];
      }

      logger.warn(`Deleted ChromaDB collection '${collectionName}'`);
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
