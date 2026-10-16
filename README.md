# AI Knowledge Assistant

A full-stack Retrieval-Augmented Generation (RAG) application that lets users upload technical documents and ask natural-language questions. The application retrieves relevant passages from uploaded files and uses an LLM to generate evidence-grounded answers with source citations.

**Live Demo:** https://ai-knowledge-assistant-xxwy.onrender.com

## Features

- **Document ingestion:** Upload PDF and TXT files.
- **Text processing:** Extract and clean document text, then split it into overlapping chunks.
- **Semantic search:** Generate text embeddings and retrieve relevant passages using cosine similarity.
- **Grounded question answering:** Use retrieved context to generate answers with OpenAI.
- **Source citations:** Associate answers with the retrieved passages that support them.
- **Abstention:** Avoid answering when the available context does not adequately support an answer.
- **Document management:** View uploaded documents and their chunk counts.
- **Input validation:** Validate uploads and queries, enforce file-size limits, and handle invalid requests.
- **Automated tests:** Test text chunking, semantic search, and API behavior.
- **Evaluation:** Run a small evaluation set to check answer behavior and retrieval quality.

## Architecture

```text
                 React + TypeScript
                        |
                 Upload / Ask
                        |
                        v
               Express REST API
                        |
          +-------------+-------------+
          |                           |
          v                           v
    Document Ingestion           Question Query
          |                           |
     PDF / TXT                  Query Embedding
          |                           |
     Text Extraction                 |
          |                           |
     Text Chunking                   |
          |                           |
     OpenAI Embeddings                |
          |                           |
          v                           v
       SQLite Database <---- Semantic Retrieval
                                      |
                               Relevant Chunks
                                      |
                                      v
                              OpenAI LLM
                                      |
                                      v
                           Answer + Citations
```

## How RAG Works

This project uses Retrieval-Augmented Generation rather than relying only on the language model's pretrained knowledge.

1. **Ingest:** The backend accepts a PDF or TXT file and extracts its text.
2. **Chunk:** The text is split into smaller overlapping passages to improve retrieval.
3. **Embed:** OpenAI's embedding model converts each passage into a numerical vector.
4. **Store:** Document chunks and their embeddings are stored in SQLite.
5. **Retrieve:** A user's question is embedded and compared with stored vectors using cosine similarity.
6. **Generate:** The most relevant passages are passed to the language model as context.
7. **Cite:** The API returns an answer with references to the retrieved source passages.

The retrieved document content is treated as untrusted input. The system is instructed to answer from the available evidence rather than follow instructions embedded in uploaded documents.

## Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- CSS

**Backend**
- Node.js
- Express
- TypeScript
- Multer for file uploads
- SQLite with `better-sqlite3`

**AI and Retrieval**
- OpenAI embeddings: `text-embedding-3-small`
- OpenAI answer generation: `gpt-4.1-mini`
- Cosine similarity for semantic retrieval
- Retrieval-Augmented Generation (RAG)

**Testing and Deployment**
- Vitest
- Supertest
- Render
- GitHub

## Running Locally

### Prerequisites

- Node.js and npm
- An OpenAI API key

### 1. Clone the repository

```bash
git clone https://github.com/VanshikaSingh/ai-knowledge-assistant.git
cd ai-knowledge-assistant
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key
```

Start the backend:

```bash
npm run dev
```

The backend runs on port `3000` by default.

### 3. Configure the frontend

In a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

Never commit API keys or other secrets to version control.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check API health |
| GET | `/documents` | List uploaded documents |
| POST | `/upload` | Upload and process a PDF or TXT file |
| POST | `/search` | Retrieve relevant document passages |
| POST | `/ask` | Generate an answer with source citations |

For request bodies and response schemas, refer to the backend implementation in `backend/src/server.ts`.

## Testing and Evaluation

Run the backend tests:

```bash
cd backend
npm test
```

Build the backend:

```bash
npm run build
```

Run the evaluation script using the project's configured environment:

```bash
npx tsx src/evaluate.ts
```

The evaluation script checks a small set of answerable and unanswerable questions, along with retrieval behavior. This is a basic development evaluation, not a comprehensive benchmark of answer quality or hallucination rates.

## Engineering Considerations

- **Chunking trade-offs:** Chunk size and overlap influence retrieval precision and the amount of context passed to the model.
- **Retrieval threshold:** Similarity thresholds help filter weak matches, but similarity is not a calibrated measure of answer confidence.
- **Grounding:** The model is instructed to answer using retrieved evidence and abstain when evidence is insufficient.
- **Testing:** Unit and API tests cover core behavior; additional integration, security, and retrieval-quality tests would strengthen production readiness.
- **Persistence:** The current Render deployment uses SQLite without a configured persistent disk. Uploaded data may be lost if the instance's filesystem is reset or the service is replaced. Durable storage is a known limitation.
- **Cost and latency:** Embedding generation and answer generation require external API calls. Render's free instance may also introduce cold-start delays.

## Future Improvements

- Add durable, production-grade database storage.
- Introduce a vector index for efficient retrieval at larger document volumes.
- Expand retrieval evaluation with precision, recall, and ranking metrics.
- Add document deletion, re-indexing, and duplicate-upload handling.
- Add authentication, per-user document isolation, and usage limits.
- Improve observability, error reporting, and deployment monitoring.

## Author

**Vanshika Singh**

[GitHub](https://github.com/VanshikaSingh/ai-knowledge-assistant)
