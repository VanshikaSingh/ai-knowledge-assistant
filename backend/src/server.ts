import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { PDFParse } from "pdf-parse";
import { chunkText } from "./chunkText.js";
import { generateEmbeddings } from "./embedding.js";
import { addChunks, getAllChunks } from "./stores.js";
import { generateAnswer } from "./answer.js";

import { searchChunks } from "./search.js";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const ALLOWED_EXTENSIONS = [".pdf", ".txt"];
const ALLOWED_MIME_TYPES = ["application/pdf", "text/plain"];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const isAllowedExtension =
      ALLOWED_EXTENSIONS.includes(extension);

    const isAllowedMimeType =
      ALLOWED_MIME_TYPES.includes(file.mimetype);

    if (!isAllowedExtension || !isAllowedMimeType) {
      callback(new Error("Only PDF and TXT files are allowed"));
      return;
    }

    callback(null, true);
  },
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.post(
  "/upload",
  upload.single("document"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
      });
    }

    const extension = path
      .extname(req.file.originalname)
      .toLowerCase();

    try {
      let extractedText = "";

      if (extension === ".pdf") {
        const parser = new PDFParse({
          data: req.file.buffer,
        });

        try {
          const result = await parser.getText();
          extractedText = result.text;
        } finally {
          await parser.destroy();
        }
      }

      if (extension === ".txt") {
        extractedText = req.file.buffer.toString("utf-8");
      }

    const chunks = chunkText(extractedText);
    

const embeddings = await generateEmbeddings(
  chunks.map((chunk) => chunk.content)
);
const storedChunks = addChunks(
  req.file.originalname,
  chunks.map((chunk) => chunk.content),
  embeddings
);
      return res.status(200).json({
        message: "File processed successfully",
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        text: extractedText,
        chunks,
        storedChunks,
        embeddings,
        totalChunks: chunks.length,
      });
    } catch (error) {
      console.error("Document processing error:", error);

      return res.status(500).json({
        error: "Failed to extract text from document",
      });
    }
  }
);

// Error-handling middleware
app.use(
  (
    error: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server error:", error.message);

    return res.status(400).json({
      error: error.message,
    });
  }
);

app.post("/ask", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        error: "A valid query is required",
      });
    }

    const [queryEmbedding] = await generateEmbeddings([query.trim()]);

    const results = searchChunks(
      queryEmbedding,
      getAllChunks(),
      3,
    );
    const MIN_SIMILARITY = 0.3;

const relevantResults = results.filter(
  (result) => result.similarity >= MIN_SIMILARITY
);

if (relevantResults.length === 0) {
  return res.json({
    answer:
      "I couldn't find relevant information in your uploaded documents to answer that question.",
    sources: [],
  });
}
console.log(
  "Retrieval scores:",
  results.map((result) => ({
    filename: result.filename,
    similarity: result.similarity,
  }))
);
    if (results.length === 0) {
      return res.json({
        answer: "No matching document passages were found.",
        sources: [],
      });
    }

    const answer = await generateAnswer(query.trim(), relevantResults);

    return res.json({
      answer,
      sources: results.map((result) => ({
        filename: result.filename,
        content: result.content,
        similarity: result.similarity,
      })),
    });
  } catch (error) {
    console.error("Ask endpoint error:", error);

    return res.status(500).json({
      error: "Failed to generate an answer.",
    });
  }
});

app.post("/search", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({
        error: "A valid query is required",
      });
    }

    const storedChunks = getAllChunks();

    if (storedChunks.length === 0) {
      return res.status(404).json({
        error: "No documents have been uploaded yet",
      });
    }

    const queryEmbeddings = await generateEmbeddings([query]);

    const results = searchChunks(
      queryEmbeddings[0],
      storedChunks,
      3
    );

    return res.json({
      query,
      results,
    });
  } catch (error) {
    console.error("Search error:", error);

    return res.status(500).json({
      error: "Search failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});