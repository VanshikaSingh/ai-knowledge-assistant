
import { useState, type ChangeEvent, type DragEvent } from "react";
import "./App.css";

type DocumentItem = {
  id: number;
  name: string;
  size: string;
  chunks?: number;
};

type UploadResponse = {
  filename?: string;
  totalChunks?: number;
  message?: string;
  error?: string;
};

type SearchResult = {
  id?: string | number;
  filename?: string;
  content: string;
  similarity?: number;
  score?: number;
};

type AskResponse = {
  answer?: string;
  sources?: SearchResult[];
  error?: string;
};

const API_URL = "http://localhost:3000";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      setSelectedFile(file);
      setError("");
      setSuccess("");
    }

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files[0];

    if (file) {
      setSelectedFile(file);
      setError("");
      setSuccess("");
    }
  }

  async function handleUpload() {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("document", selectedFile);

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as UploadResponse;

      if (!response.ok) {
        throw new Error(
          result.error ?? result.message ?? "Upload failed.",
        );
      }

      setDocuments((current) => [
        ...current,
        {
          id: Date.now(),
          name: selectedFile.name,
          size: formatFileSize(selectedFile.size),
          chunks: result.totalChunks,
        },
      ]);

      setSuccess(
        typeof result.totalChunks === "number"
          ? `Document processed successfully. ${result.totalChunks} chunks created.`
          : "Document processed successfully.",
      );

      setSelectedFile(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while uploading.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSearch() {
    const query = question.trim();

    if (!query || isSearching) return;

    setIsSearching(true);
    setSearchError("");
    setAnswer("");
    setSources([]);
console.log(query, "query");
    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      const data = (await response.json()) as AskResponse;

      if (!response.ok) {
        throw new Error(
          data.error ?? "Failed to generate an answer.",
        );
      }

      setAnswer(data.answer ?? "");
      setSources(data.sources ?? []);
console.log(data, "data");
      if (!data.answer) {
        setSearchError(
          "The server returned no answer. Check the /ask endpoint response.",
        );
      }
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? err.message
          : "Unable to get an answer.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" />
              <path d="M14 3.75v4h4" />
              <path d="M9 12h6" />
              <path d="M9 15.5h6" />
            </svg>
          </div>

          <span>
            Knowledge<span className="brand-light">AI</span>
          </span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <button className="nav-item active">
          <span>⌂</span> Knowledge base
        </button>

        <button className="nav-item" disabled>
          <span>◷</span> Recent questions
          <span className="coming-soon">Soon</span>
        </button>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <p className="status-title">Development mode</p>
            <p className="status-subtitle">
              Backend · localhost:3000
            </p>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace / Knowledge base
          </span>

          <span className="local-badge">
            <span className="status-dot" />
            Local environment
          </span>
        </header>

        <section className="page-content">
          <div className="hero">
            <div className="eyebrow">
              YOUR PERSONAL KNOWLEDGE BASE
            </div>
           
              <h1>
                Your documents,
                <br />
                made searchable.
              </h1>
              <p>
                Upload your documents, find relevant information, and get answers
                grounded in your content.
              </p>
          </div>

          <section className="upload-section">
            <div className="section-heading">
              <div>
                <h2>Add your documents</h2>
                <p>
                  Start by uploading a document for the assistant to
                  process.
                </p>
              </div>

              <span className="step-badge">STEP 01</span>
            </div>

            <div
              className="dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="upload-icon">↑</div>
              <h3>Drop your file here</h3>
              <p>or choose a file from your computer</p>

              <label className="choose-file-button">
                Choose file
                <input
                  type="file"
                  accept=".pdf,.txt,application/pdf,text/plain"
                  onChange={handleFileChange}
                />
              </label>

              <span className="file-hint">
                PDF or TXT
              </span>
            </div>

            {selectedFile && (
              <div className="selected-file">
                <div className="file-icon">DOC</div>

                <div className="file-details">
                  <strong>{selectedFile.name}</strong>
                  <span>{formatFileSize(selectedFile.size)}</span>
                </div>

                <button
                  className="remove-button"
                  onClick={() => setSelectedFile(null)}
                  aria-label="Remove selected file"
                >
                  ×
                </button>

                <button
                  className="primary-button"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? "Processing..." : "Upload document"}
                </button>
              </div>
            )}

            {error && (
              <p className="feedback error">{error}</p>
            )}

            {success && (
              <p className="feedback success">{success}</p>
            )}
          </section>

          <section className="documents-section">
            <div className="section-heading">
              <div>
                <h2>Your documents</h2>
                <p>Documents uploaded during this session.</p>
              </div>

              <span className="count-badge">
                {documents.length}
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="empty-state">
                <h3>Your knowledge base is empty</h3>
                <p>
                  Upload your first PDF or TXT file. It will be
                  processed by your backend and its chunks will be
                  indexed for search.
                </p>
              </div>
            ) : (
              <div className="document-list">
                {documents.map((document) => (
                  <div className="document-row" key={document.id}>
                    <div className="file-icon">DOC</div>

                    <div className="file-details">
                      <strong>{document.name}</strong>
                      <span>
                        {document.size}
                        {typeof document.chunks === "number"
                          ? ` · ${document.chunks} chunks`
                          : ""}
                      </span>
                    </div>

                    <span className="processed-badge">
                      Processed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="question-section">
            <div className="section-heading">
              <div>
                <h2>Ask your documents</h2>
                <p>
                  Ask a question and get an answer based on your
                  uploaded documents.
                </p>
              </div>

              <span className="step-badge">STEP 02</span>
            </div>

            <form
              className="question-form"
              onSubmit={(event) => {
                event.preventDefault();
                 handleSearch();
              }}
            >
              <span className="search-icon">⌕</span>

              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What does this document say about...?"
                aria-label="Question about your documents"
              />

              <button
                type="submit"
                disabled={!question.trim() || isSearching}
              >
                {isSearching ? "Thinking..." : "Ask AI"}
                <span> ↗</span>
              </button>
            </form>

            {isSearching && (
              <p className="question-hint">
                Searching your documents and generating an answer...
              </p>
            )}

            {searchError && (
              <p className="feedback error">{searchError}</p>
            )}

            {answer && (
              <div className="search-results">
                <h3>Answer</h3>

                <article className="search-result">
                  <p>{answer}</p>
                </article>

                {sources.length > 0 && (
                  <details>
                    <summary>
                      View supporting passages ({sources.length})
                    </summary>

                    <div className="source-list">
                      {sources.map((source, index) => (
                        <article
                          className="search-result"
                          key={source.id ?? index}
                        >
                          <div className="search-result-header">
                            <strong>
                              {source.filename ??
                                `Source ${index + 1}`}
                            </strong>

                            {typeof source.similarity === "number" && (
                              <span className="result-score">
                                Similarity:{" "}
                                {(source.similarity * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>

                          <p>{source.content}</p>
                        </article>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </section>

          <footer>
            <span>KnowledgeAI</span>
            <span>Built with React, TypeScript &amp; OpenAI</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;
