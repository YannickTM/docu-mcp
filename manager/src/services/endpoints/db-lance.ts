import "dotenv/config";
import * as lancedb from "@lancedb/lancedb";
import type { Connection } from "@lancedb/lancedb";
import path from "path";
import fs from "fs";
import { getCollectionSchema } from "../schemas/index.js";
import { logger } from "../logger.js";
/**
 * Interface for vector points to be stored in LanceDB
 */
interface VectorPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

// Configure LanceDB storage path
const LANCE_PATH =
  process.env.LANCE_PATH ||
  path.join(process.env.HOME || "tmp", "lancedb_data");

// Ensure the directory exists
if (!fs.existsSync(LANCE_PATH)) {
  fs.mkdirSync(LANCE_PATH, { recursive: true });
}

// Initialize connection
let dbConnection: Connection | null = null;
let connectionTimeout: NodeJS.Timeout | null = null;

const getConnection = async (): Promise<Connection> => {
  if (!dbConnection) {
    dbConnection = await lancedb.connect(LANCE_PATH);
  }

  // Reset timeout
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
  }

  // Auto-close connection after 5 minutes of inactivity
  connectionTimeout = setTimeout(() => {
    if (dbConnection) {
      // Note: Add close method when available in LanceDB API
      dbConnection = null;
    }
  }, 300000);

  return dbConnection;
};

// Add cleanup function
export const cleanup = async (): Promise<void> => {
  if (connectionTimeout) {
    clearTimeout(connectionTimeout);
  }
  if (dbConnection) {
    // Close connection when API supports it
    dbConnection = null;
  }
};

/**
 * Health check function
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    await getConnection();
    return true;
  } catch (error) {
    logger.error("LanceDB health check failed:", error as Error);
    throw error;
  }
};

/**
 * Delete a collection from LanceDB
 */
export const deleteCollection = async (
  collectionName: string,
): Promise<boolean> => {
  try {
    const db = await getConnection();

    // Check if collection exists
    if (await collectionExists(collectionName)) {
      // LanceDB doesn't have a direct dropTable method exposed in the TS types
      // We use the native method from the connection
      await db.dropTable(collectionName);
      logger.warn(`Deleted LanceDB collection '${collectionName}'`);
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

/**
 * Check if a collection exists
 */
export const collectionExists = async (
  collectionName: string,
): Promise<boolean> => {
  const db = await getConnection();
  const tables = await db.tableNames();
  return tables.includes(collectionName);
};

/**
 * Create a new collection
 */
export const createCollection = async (
  collectionName: string,
  vectorSize: number,
  distance: "cosine" | "l2" | "dot" = "cosine",
): Promise<boolean> => {
  try {
    const db = await getConnection();

    // Check if collection already exists
    if (await collectionExists(collectionName)) {
      return true;
    }

    // Get schema for this collection or use default generic schema
    const schema = getCollectionSchema(collectionName);

    // Create a sample vector of appropriate size
    const sampleVector = new Array(vectorSize).fill(0);

    // Create a sample record with the schema fields and the vector
    const sampleData = [
      {
        id: "schema_init",
        ...schema.fields,
        vector: sampleVector,
      },
    ];

    // Create the table with the sample data that contains all fields
    const table = await db.createTable(collectionName, sampleData);

    // Configure the table for vector search
    try {
      // Create vector index with appropriate distance metric
      const indexOptions = {
        config: lancedb.Index.ivfPq({
          numPartitions: 256, // Default partitions for good balance
          numSubVectors: 16, // Good default for most use cases
          distanceType: distance,
        }),
      };

      await table.createIndex("vector", indexOptions);
      logger.warn(`Created vector index for collection '${collectionName}'`);
    } catch (error) {
      logger.error("Failed to create vector index:", error as Error);
      // Continue without index - searches will be slower but still work
    }

    logger.warn(
      `Created LanceDB collection '${collectionName}' with schema for ${vectorSize}-dimensional vectors`,
    );

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
 * Upsert points into a collection
 */
export const upsertPoints = async (
  collectionName: string,
  points: VectorPoint[],
): Promise<boolean> => {
  try {
    const db = await getConnection();

    // Get or create the table
    if (!(await collectionExists(collectionName))) {
      await createCollection(collectionName, points[0].vector.length);
    }

    const table = await db.openTable(collectionName);

    // Get schema for this collection or use default generic schema
    const schema = getCollectionSchema(collectionName);
    const schemaFields = { ...schema.fields };
    delete schemaFields.id;
    delete schemaFields.vector;

    // Format points for LanceDB
    const records = points.map((point) => {
      // Create a standardized record with all expected schema fields
      const record: Record<string, any> = {
        id: point.id.toString(),
        vector: point.vector,
        ...schemaFields, // Add all schema fields with default values
      };

      // Include payload metadata, overwriting default values
      if (point.payload) {
        for (const [key, value] of Object.entries(point.payload)) {
          if (key !== "vector") {
            // Skip any nested vector field in payload
            record[key] = value;
          }
        }
      }

      return record;
    });

    // Add data to the table
    await table.add(records);
    logger.warn(
      `Added ${points.length} points to LanceDB collection '${collectionName}'`,
    );

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
 * Search for similar vectors
 */
export const search = async (
  collectionName: string,
  vector: number[],
  limit: number = 10,
  filter?: Record<string, any>,
  distance: "cosine" | "l2" | "dot" = "cosine",
): Promise<any[]> => {
  try {
    const db = await getConnection();

    if (!(await collectionExists(collectionName))) {
      logger.warn(
        `Collection ${collectionName} does not exist for search operation`,
      );
      return [];
    }

    const table = await db.openTable(collectionName);

    // Try to get the actual vector dimension from the table schema
    let tableSchema;
    try {
      tableSchema = await table.schema();
      const vectorColumn = tableSchema.fields.find(
        (f: any) => f.name === "vector",
      );

      // Found actual vector dimension in the table
      const actualVectorSize = vectorColumn?.type.listSize;

      if (vector.length !== actualVectorSize) {
        logger.warn(
          `Vector dimension mismatch: provided ${vector.length}, expected ${actualVectorSize} (from table schema)`,
        );

        // Resize vector to match the table's dimension
        const resizedVector = [...vector];

        if (vector.length > actualVectorSize) {
          // Truncate vector if too large
          resizedVector.length = actualVectorSize;
        } else if (vector.length < actualVectorSize) {
          // Pad with zeros if too small
          resizedVector.push(
            ...new Array(actualVectorSize - vector.length).fill(0),
          );
        }

        vector = resizedVector;
      }
    } catch (error) {
      logger.warn(
        "Could not retrieve table schema, using predefined schema:",
        error,
      );
    }

    try {
      // Log actual vector length for debugging
      logger.warn(
        `Using vector of length ${vector.length} for search in collection '${collectionName}'`,
      );

      // Start with a query builder
      let query = table.vectorSearch(vector);

      // Set distance type to match what was used for index creation
      query = query.distanceType(distance as any);

      // Filter out the schema initialization record
      query = query.where(`id != 'schema_init'`);

      // Apply filters if provided
      if (filter && filter.must) {
        for (const condition of filter.must) {
          if (condition.key && condition.match) {
            // Handle array 'any' match type
            if (condition.match.any && Array.isArray(condition.match.any)) {
              const values = condition.match.any
                .map((v: any) => (typeof v === "string" ? `'${v}'` : v))
                .join(",");
              query = query.where(`${condition.key} IN [${values}]`);
            }
            // Handle text match type
            else if (condition.match.text) {
              query = query.where(
                `${condition.key} = '${condition.match.text}'`,
              );
            }
          }
        }
      }

      // Set limit for the number of results
      query = query.limit(limit);

      // Execute the query and get the results
      const data = await query.toArray();

      // Map results to standardized format
      return data.map((item) => ({
        score: item._distance !== undefined ? 1 - item._distance : 1,
        payload: item,
      }));
    } catch (error) {
      logger.error("Vector search failed:", error as Error);
      // Return empty results instead of throwing
      return [];
    }
  } catch (error) {
    logger.error(
      `Error searching in collection ${collectionName}:`,
      error as Error,
    );
    return [];
  }
};

/**
 * Helper function to create a point object
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

// Export types
export type { VectorPoint };
