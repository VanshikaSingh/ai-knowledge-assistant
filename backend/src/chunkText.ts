export type TextChunk = {
  index: number;
  content: string;
};

export function chunkText(
  text: string,
  chunkSize = 1000,
  overlap = 200
): TextChunk[] {
  if (chunkSize <= 0 || overlap < 0 || overlap >= chunkSize) {
    throw new Error("Invalid chunk size or overlap");
  }

  const cleanedText = text.replace(/\s+/g, " ").trim();

  if (!cleanedText) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < cleanedText.length) {
    const end = Math.min(start + chunkSize, cleanedText.length);

    const content = cleanedText.slice(start, end).trim();

    if (content) {
      chunks.push({
        index,
        content,
      });

      index++;
    }

    if (end === cleanedText.length) {
      break;
    }

    start = end - overlap;
  }

  return chunks;
}