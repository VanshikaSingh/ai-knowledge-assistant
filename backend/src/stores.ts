export type StoredChunk = {
  id: string;
  filename: string;
  content: string;
  embedding: number[];
};

const chunks: StoredChunk[] = [];

export function addChunks(
  filename: string,
  contents: string[],
  embeddings: number[][]
): StoredChunk[] {
  const newChunks = contents.map((content, index) => ({
    id: crypto.randomUUID(),
    filename,
    content,
    embedding: embeddings[index],
  }));

  chunks.push(...newChunks);

  return newChunks;
}

export function getAllChunks(): StoredChunk[] {
  return chunks;
}