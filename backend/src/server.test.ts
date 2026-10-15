
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./server.js";

describe("API endpoints", () => {
  it("GET /health returns a healthy status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("POST /ask rejects an empty query", async () => {
    const response = await request(app)
      .post("/ask")
      .send({ query: "" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("A valid query is required");
  });

  it("POST /search rejects a missing query", async () => {
    const response = await request(app)
      .post("/search")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("A valid query is required");
  });

  it("POST /upload rejects unsupported file types", async () => {
    const response = await request(app)
      .post("/upload")
      .attach("document", Buffer.from("test content"), {
        filename: "test.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Only PDF and TXT files are allowed",
    );
  });
});
