import type { StoredChunk } from "./stores.js";
//rank document chunks by how similar they are to the user's question - 
// calculates the cosine similarity between the question embedding and each chunk embedding.

function cosineSimilarity(
  vectorA: number[],
  vectorB: number[]
): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] ** 2;
    magnitudeB += vectorB[i] ** 2;
  }

  const denominator =
    Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

export function searchChunks(
  queryEmbedding: number[],
  chunks: StoredChunk[],
  topK = 3
) {
  return chunks
    .map((chunk) => ({
      ...chunk,
      similarity: cosineSimilarity(
        queryEmbedding,
        chunk.embedding
      ),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}