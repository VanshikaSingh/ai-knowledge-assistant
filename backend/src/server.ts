import rateLimit from "express-rate-limit";

import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { PDFParse } from "pdf-parse";
import { chunkText } from "./chunkText.js";
import { generateEmbeddings } from "./embedding.js";
import {
  addChunks,
  getAllChunks,
  getAllDocuments,
} from "./stores.js";
import { generateAnswer } from "./answer.js";
import { searchChunks } from "./search.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_QUERY_LENGTH = 1000;
const MIN_SIMILARITY = 0.3;

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);
app.use(express.json({ limit: "1mb" }));
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use(["/ask", "/search", "/upload"], apiLimiter);

const ALLOWED_EXTENSIONS = [".pdf", ".txt"];
const ALLOWED_MIME_TYPES = ["application/pdf", "text/plain"];

const upload = multer({
  storage: multer.memoryStorage(),
 limits: {
  fileSize: 5 * 1024 * 1024,
  files: 1,
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

app.get("/documents", (req, res) => {
  try {
    const documents = getAllDocuments();

    return res.json({ documents });
  } catch (error) {
    console.error("Documents endpoint error:", error);

    return res.status(500).json({
      error: "Failed to retrieve documents",
    });
  }
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

  const extension = path.extname(req.file.originalname).toLowerCase();

if (extension === ".pdf") {
  // PDF headers are normally at the beginning of the file.
  const header = req.file.buffer
    .subarray(0, Math.min(req.file.buffer.length, 1024))
    .toString("latin1");

  if (!header.includes("%PDF-")) {
    return res.status(400).json({
      error: "The uploaded file is not a valid PDF",
    });
  }
}

if (extension === ".txt") {
  try {
    // Reject invalid UTF-8 rather than silently replacing bad bytes.
    new TextDecoder("utf-8", { fatal: true }).decode(req.file.buffer);
  } catch {
    return res.status(400).json({
      error: "The uploaded TXT file must contain valid UTF-8 text",
    });
  }
}


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
    } else if (extension === ".txt") {
      extractedText = req.file.buffer.toString("utf-8");
    }

    if (!extractedText.trim()) {
      return res.status(400).json({
        error: "The uploaded document contains no readable text",
      });
    }

    const chunks = chunkText(extractedText);

    if (chunks.length === 0) {
      return res.status(400).json({
        error: "No usable text could be extracted from the document",
      });
    }

    const embeddings = await generateEmbeddings(
      chunks.map((chunk) => chunk.content),
    );

    const storedChunks = addChunks(
      req.file.originalname,
      chunks.map((chunk) => chunk.content),
      embeddings,
    );

    // Return metadata only, not the entire document or embeddings.
    return res.status(200).json({
      message: "File processed successfully",
      filename: req.file.originalname,
      size: req.file.size,
      totalChunks: storedChunks.length,
    });
  } catch (error) {
    console.error("Document processing error:", error);

    return res.status(500).json({
      error: "Failed to process the document",
    });
  }
});

app.post("/ask", async (req, res) => {
  try {
    const { query } = req.body ?? {};

    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        error: "A valid query is required",
      });
    }

    const normalizedQuery = query.trim();

    if (normalizedQuery.length > MAX_QUERY_LENGTH) {
      return res.status(400).json({
        error: `Query must not exceed ${MAX_QUERY_LENGTH} characters`,
      });
    }

    const storedChunks = getAllChunks();

    if (storedChunks.length === 0) {
      return res.status(400).json({
        error: "Upload a document before asking questions",
      });
    }

    const [queryEmbedding] = await generateEmbeddings([normalizedQuery]);

    const results = searchChunks(queryEmbedding, storedChunks, 3);

    const relevantResults = results.filter(
      (result) => result.similarity >= MIN_SIMILARITY,
    );

    console.log(
      "Retrieval scores:",
      results.map((result) => ({
        filename: result.filename,
        similarity: result.similarity,
      })),
    );

    if (relevantResults.length === 0) {
      return res.json({
        answer:
          "I couldn't find relevant information in your uploaded documents to answer that question.",
        sources: [],
      });
    }


const generated = await generateAnswer(
  normalizedQuery,
  relevantResults,
);

return res.json({
  answer: generated.answer,
  citations: generated.citations,
  sources: relevantResults.map((result) => ({
    filename: result.filename,
    content: result.content,
    similarity: result.similarity,
  })),
});

  } catch (error) {
    console.error("Ask endpoint error:", error);

    return res.status(500).json({
      error: "Failed to generate an answer",
    });
  }
});

app.post("/search", async (req, res) => {
  try {
    const { query } = req.body ?? {};

    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        error: "A valid query is required",
      });
    }

    const normalizedQuery = query.trim();

    if (normalizedQuery.length > MAX_QUERY_LENGTH) {
      return res.status(400).json({
        error: `Query must not exceed ${MAX_QUERY_LENGTH} characters`,
      });
    }

    const storedChunks = getAllChunks();

    if (storedChunks.length === 0) {
      return res.status(400).json({
        error: "Upload a document before searching",
      });
    }

    const [queryEmbedding] = await generateEmbeddings([normalizedQuery]);

    const results = searchChunks(queryEmbedding, storedChunks, 3);

    return res.json({
      query: normalizedQuery,
      results,
    });
  } catch (error) {
    console.error("Search endpoint error:", error);

    return res.status(500).json({
      error: "Search failed",
    });
  }
});

// Keep error handling after the routes so upload and parsing errors reach it.
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "File size must not exceed 5 MB",
        });
      }

      return res.status(400).json({
        error: "Invalid file upload",
      });
    }

    if (error.message === "Only PDF and TXT files are allowed") {
      return res.status(400).json({
        error: error.message,
      });
    }

    if (error instanceof SyntaxError && "body" in error) {
      return res.status(400).json({
        error: "Invalid JSON request body",
      });
    }

    console.error("Unhandled server error:", error);

    return res.status(500).json({
      error: "An unexpected server error occurred",
    });
  },
);

export default app;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}