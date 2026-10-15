
const API_URL = "http://localhost:3000/ask";

type EvaluationCase = {
  question: string;
  shouldAnswer: boolean;
  expectedEvidence?: string;
};

const cases: EvaluationCase[] = [
  {
    question: "What is Eddie's job at the amusement park?",
    shouldAnswer: true,
    expectedEvidence: "maintenance man at Ruby Pier",
  },
  {
    question: "What is Eddie's mother's name?",
    shouldAnswer: false,
  },
  {
    question: "What is the capital of Japan?",
    shouldAnswer: false,
  },
];

type Source = {
  filename?: string;
  content?: string;
  similarity?: number;
};

type AskResponse = {
  answer?: string;
  sources?: Source[];
  error?: string;
};

function admitsMissingInfo(answer: string): boolean {
  const normalized = answer.toLowerCase();

  return (
    /\b(couldn't|could not|cannot|can't|unable to)\b.{0,100}\b(find|determine|identify|answer|provide|establish)\b/i.test(
      normalized,
    ) ||
    /\b(not|no)\b.{0,100}\b(enough information|available information|specific name|answer|evidence)\b/i.test(
      normalized,
    ) ||
    /\b(do not|don't|does not|doesn't|did not|didn't)\b.{0,100}\b(contain|mention|provide|state|include|specify)\b/i.test(
      normalized,
    ) ||
    /\b(information|answer|name)\b.{0,100}\b(not provided|not available|not specified|not mentioned|could not be found)\b/i.test(
      normalized,
    )
  );
}

async function evaluate() {
  let passed = 0;
  let needsReview = 0;
  let evidenceChecks = 0;
  let evidenceFound = 0;

  for (const testCase of cases) {
    console.log("\n==================================");
    console.log(`Question: ${testCase.question}`);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: testCase.question }),
      });

      const data = (await response.json()) as AskResponse;

      if (!response.ok) {
        console.log("Request failed:", data.error ?? response.status);
        needsReview++;
        continue;
      }

      const answer = data.answer ?? "";
      const sources = data.sources ?? [];
      const abstained = admitsMissingInfo(answer);

      console.log("\nAnswer:", answer);
      console.log("Retrieved sources:", sources.length);

      sources.forEach((source, index) => {
        console.log(
          `\n${index + 1}. ${source.filename ?? "Document"} | ` +
            `Similarity: ${source.similarity?.toFixed(3) ?? "N/A"}`,
        );
        console.log(source.content ?? "");
      });

      // Heuristic check: does the answer appear to answer or abstain?
      const behaviorMatches = testCase.shouldAnswer
        ? answer.trim().length > 0 && !abstained
        : abstained;

      console.log(
        "\nExpected behavior:",
        testCase.shouldAnswer ? "Answer" : "Abstain",
      );
      console.log(
        "Preliminary check:",
        behaviorMatches ? "PASS" : "REVIEW",
      );

      if (!behaviorMatches) {
        console.log("Needs investigation:", testCase.question);
        console.log("Detected abstention:", abstained);
      }

      if (behaviorMatches) {
        passed++;
      } else {
        needsReview++;
      }

      // Check whether retrieved chunks contain the expected evidence words.
      if (testCase.expectedEvidence) {
        evidenceChecks++;

        const retrievedText = sources
          .map((source) => source.content ?? "")
          .join(" ")
          .toLowerCase();

        const expectedWords = testCase.expectedEvidence
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean);

        const matchedWords = expectedWords.filter((word) =>
          retrievedText.includes(word),
        );

        const found = matchedWords.length === expectedWords.length;

        if (found) {
          evidenceFound++;
        }

        console.log(
          `Evidence words matched: ${matchedWords.length}/${expectedWords.length}`,
        );
        console.log("Expected evidence:", testCase.expectedEvidence);
        console.log(
          "Evidence in retrieved chunks:",
          found ? "FOUND" : "NOT FOUND",
        );
      } else {
        console.log(
          "Evidence check: N/A — no reference evidence defined for this case.",
        );
      }
    } catch (error) {
      console.log("Request failed:", error);
      needsReview++;
    }
  }

  console.log("\n==================================");
  console.log(`Answer behavior checks passed: ${passed}/${cases.length}`);
  console.log(`Needs review / request failures: ${needsReview}`);

  if (evidenceChecks > 0) {
    console.log(`Evidence retrieval: ${evidenceFound}/${evidenceChecks}`);
    console.log(
      `Evidence hit rate: ${((evidenceFound / evidenceChecks) * 100).toFixed(1)}%`,
    );
  }

  console.log(
    "\nThese are heuristic checks, not a complete correctness benchmark.",
  );
}

evaluate();
