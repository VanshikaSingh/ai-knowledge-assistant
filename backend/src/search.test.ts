
import { describe, it, expect } from "vitest";
import { searchChunks } from "./search";
import type { StoredChunk } from "./stores";

const chunks: StoredChunk[] = [
  {
    id: "1",
    filename: "people.txt",
    content: "Eddie works as a maintenance man.",
    embedding: [1, 0, 0],
  },
  {
    id: "2",
    filename: "people.txt",
    content: "The sky is blue.",
    embedding: [0, 1, 0],
  },
  {
    id: "3",
    filename: "people.txt",
    content: "Eddie works at an amusement park.",
    embedding: [0.9, 0.1, 0],
  },
];

describe("searchChunks", () => {
  it("ranks the most similar chunk first", () => {
    const results = searchChunks([1, 0, 0], chunks);

    expect(results[0].id).toBe("1");
    expect(results[0].similarity).toBeCloseTo(1);
  });

  it("returns only topK results", () => {
    const results = searchChunks([1, 0, 0], chunks, 2);

    expect(results).toHaveLength(2);
  });

  it("ranks results from highest to lowest similarity", () => {
    const results = searchChunks([1, 0, 0], chunks);

    expect(results[0].similarity).toBeGreaterThanOrEqual(
      results[1].similarity,
    );
    expect(results[1].similarity).toBeGreaterThanOrEqual(
      results[2].similarity,
    );
  });

  it("returns zero similarity when a vector has zero magnitude", () => {
    const zeroVectorChunk: StoredChunk[] = [
      {
        id: "4",
        filename: "empty.txt",
        content: "Test content",
        embedding: [0, 0, 0],
      },
    ];

    const results = searchChunks([1, 0, 0], zeroVectorChunk);

    expect(results[0].similarity).toBe(0);
  });
});
