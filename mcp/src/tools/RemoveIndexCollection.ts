import chalk from "chalk";
import {
  collectionExists,
  deleteCollection,
} from "../services/vectordb.js";

/**
 * Result interface for removing index collection
 */
interface RemoveIndexCollectionResult {
  success: boolean;
  collectionName: string;
  existed: boolean;
  message: string;
}

/**
 * Tool for removing index collections from the vector database
 */
class RemoveIndexCollectionTool {
  /**
   * Removes an index collection from the vector database
   */
  async removeCollection(
    collectionName: string
  ): Promise<RemoveIndexCollectionResult> {
    try {
      // Check if collection exists
      const exists = await collectionExists(collectionName);
      
      if (!exists) {
        return {
          success: false,
          collectionName,
          existed: false,
          message: `Collection '${collectionName}' does not exist in the vector database`,
        };
      }

      // Delete the collection
      const deleted = await deleteCollection(collectionName);
      
      if (deleted) {
        console.warn(
          chalk.green(`Successfully removed collection '${collectionName}' from vector database`)
        );
        
        return {
          success: true,
          collectionName,
          existed: true,
          message: `Collection '${collectionName}' successfully removed from the vector database`,
        };
      } else {
        throw new Error(`Failed to delete collection '${collectionName}'`);
      }
    } catch (error) {
      console.error(chalk.red(`Error removing collection ${collectionName}:`, error));
      throw new Error(`Failed to remove collection: ${(error as Error).message}`);
    }
  }

  /**
   * Process remove collection request - main entry point for the tool
   */
  processRemoveCollection(input: any) {
    try {
      const { collectionName } = input;

      if (!collectionName || typeof collectionName !== "string") {
        throw new Error("Invalid collectionName: must be a string");
      }

      // Log formatted information
      console.error(`
${chalk.red("🗑️  Removing Collection:")} ${collectionName}
      `);

      // Execute the removal operation
      return this.removeCollection(collectionName)
        .then((result) => ({
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        }))
        .catch((error) => ({
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                  status: "failed",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        }));
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                status: "failed",
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
}

// Tool definition with improved description
const REMOVE_INDEX_COLECTION_TOOL = {
  name: "remove_index",
  description: `Removed an existing index collection from the vector database.
This tool is useful for cleaning up or resetting the vector database.
It can be used to remove outdated or unnecessary collections, ensuring that the database remains organized and efficient.
  
Key features:
- Remove an existing index collection
- Clean up the vector database
- Reset the database state
- Ensure efficient database organization

Use when you need to:
- Start fresh new documentation
- Remove an outdated or unnecessary index collection
- Clean up the vector database
- Reset the database state

Parameters explained:
- collectionName: Name of the collection to remove`,
  inputSchema: {
    type: "object",
    properties: {
      collectionName: {
        type: "string",
        description: "Name of the collection to remove",
        enum: ["codebase", "documentation", "diagram", "merged-diagram", "merged-documentation"],
      },
    },
    required: ["collectionName"],
  },
};

export { RemoveIndexCollectionTool, REMOVE_INDEX_COLECTION_TOOL };
