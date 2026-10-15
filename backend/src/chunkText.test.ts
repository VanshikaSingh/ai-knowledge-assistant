
import { describe, it, expect } from "vitest";
import { chunkText } from "./chunkText";

describe("chunkText", () => {
  it("returns no chunks for empty text", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("returns one chunk when text is shorter than the chunk size", () => {
    const chunks = chunkText("Hello world");

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("Hello world");
    expect(chunks[0].index).toBe(0);
  });

  it("splits long text into overlapping chunks", () => {
    const chunks = chunkText("A".repeat(2500));

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].content.length).toBe(1000);
    expect(chunks[1].content.length).toBe(1000);
    expect(chunks[0].content.slice(-200)).toBe(
      chunks[1].content.slice(0, 200),
    );
  });
});
