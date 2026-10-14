
import OpenAI from "openai";

const openai = new OpenAI();

type Source = {
  filename?: string;
  content: string;
};

export async function generateAnswer(
  question: string,
  sources: Source[],
): Promise<string> {
  const context = sources
    .map(
      (source, index) =>
        `[Source ${index + 1}: ${source.filename ?? "Document"}]\n${source.content}`,
    )
    .join("\n\n");

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    instructions: `
You are a document-based knowledge assistant.

Answer the user's question using only the supplied document excerpts.
Explain the answer clearly and concisely.
Do not invent facts or use outside knowledge to fill gaps.
If the excerpts do not contain enough information, say so.
Refer to the source filenames when useful.
    `.trim(),
    input: `Document excerpts:\n${context}\n\nQuestion: ${question}`,
  });

  return response.output_text;
}
