/**
 * Creates overlapping chunks from text content
 *
 * @param content - The text content to chunk
 * @param chunkSize - Size of each chunk in characters (default: 512)
 * @param overlapSize - Number of characters to overlap between chunks (default: 50)
 * @returns Array of text chunks
 */
export function createChunks(
  content: string,
  chunkSize: number = 512,
  overlapSize: number = 50,
): string[] {
  const chunks: string[] = [];
  let position = 0;

  while (position < content.length) {
    const end = Math.min(position + chunkSize, content.length);
    const chunk = content.substring(position, end);

    // Only add non-empty chunks
    if (chunk.trim()) {
      chunks.push(chunk);
    }

    position = end - overlapSize;

    // Prevent infinite loop for small content
    if (position < 0) position = end;

    // If we've reached the end, break
    if (end >= content.length) break;
  }

  return chunks;
}

/**
 * Creates overlapping chunks based on paragraphs
 * Better suited for documentation and text files as it preserves semantic boundaries
 *
 * @param content - The text content to chunk
 * @param paragraphsPerChunk - Number of paragraphs per chunk (default: 3)
 * @param overlapParagraphs - Number of paragraphs to overlap between chunks (default: 1)
 * @returns Array of text chunks
 */
export function createParagraphChunks(
  content: string,
  paragraphsPerChunk: number = 3,
  overlapParagraphs: number = 1,
): string[] {
  // Split content into paragraphs (separated by double newlines or more)
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // If we have very few paragraphs, just return the whole content as one chunk
  if (paragraphs.length <= paragraphsPerChunk) {
    return content.trim() ? [content.trim()] : [];
  }

  const chunks: string[] = [];
  let position = 0;

  while (position < paragraphs.length) {
    const end = Math.min(position + paragraphsPerChunk, paragraphs.length);
    const chunkParagraphs = paragraphs.slice(position, end);

    // Join paragraphs with double newlines to preserve formatting
    const chunk = chunkParagraphs.join("\n\n");

    if (chunk.trim()) {
      chunks.push(chunk);
    }

    // Move position forward, accounting for overlap
    position = end - overlapParagraphs;

    // Prevent infinite loop
    if (position <= 0) position = end;

    // If we've reached the end, break
    if (end >= paragraphs.length) break;
  }

  return chunks;
}

/**
 * Automatically selects the appropriate chunking strategy based on file type
 *
 * @param content - The text content to chunk
 * @param fileExtension - File extension (e.g., '.md', '.ts', '.js')
 * @param options - Optional chunking parameters
 * @returns Array of text chunks
 */
export function createSmartChunks(
  content: string,
  fileExtension: string,
  options?: {
    chunkSize?: number;
    overlapSize?: number;
    paragraphsPerChunk?: number;
    overlapParagraphs?: number;
  },
): string[] {
  const docExtensions = [".md", ".mdx", ".txt", ".rst", ".adoc", ".org"];
  const isDocumentation = docExtensions.includes(fileExtension.toLowerCase());

  if (isDocumentation) {
    return createParagraphChunks(
      content,
      options?.paragraphsPerChunk,
      options?.overlapParagraphs,
    );
  } else {
    return createChunks(content, options?.chunkSize, options?.overlapSize);
  }
}
