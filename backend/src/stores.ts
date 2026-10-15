
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import path from "node:path";

export type StoredChunk = {
  id: string;
  filename: string;
  content: string;
  embedding: number[];
};

// The database file is created in the backend directory.
const db = new Database(path.resolve(process.cwd(), "knowledge.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL
  );
`);

const insertChunk = db.prepare(`
  INSERT INTO chunks (id, filename, content, embedding)
  VALUES (?, ?, ?, ?)
`);

const insertChunks = db.transaction(
  (chunks: StoredChunk[]) => {
    for (const chunk of chunks) {
      insertChunk.run(
        chunk.id,
        chunk.filename,
        chunk.content,
        JSON.stringify(chunk.embedding),
      );
    }
  },
);

export function addChunks(
  filename: string,
  contents: string[],
  embeddings: number[][],
): StoredChunk[] {
  if (contents.length !== embeddings.length) {
    throw new Error("Each chunk must have a corresponding embedding");
  }

  const newChunks: StoredChunk[] = contents.map((content, index) => ({
    id: randomUUID(),
    filename,
    content,
    embedding: embeddings[index],
  }));

  insertChunks(newChunks);

  return newChunks;
}

export function getAllChunks(): StoredChunk[] {
  const rows = db
    .prepare("SELECT id, filename, content, embedding FROM chunks")
    .all() as {
      id: string;
      filename: string;
      content: string;
      embedding: string;
    }[];

  return rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    content: row.content,
    embedding: JSON.parse(row.embedding) as number[],
  }));
}
