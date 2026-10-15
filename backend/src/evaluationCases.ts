
export type EvaluationCase = {
  question: string;
  expectedAnswer: string;
  shouldAnswer: boolean;
};

export const evaluationCases: EvaluationCase[] = [
  {
    question: "What is Eddie's job at the amusement park?",
    expectedAnswer: "Maintenance man at Ruby Pier",
    shouldAnswer: true,
  },
  {
    question: "What is Eddie's mother's name?",
    expectedAnswer: "The document does not provide her name",
    shouldAnswer: false,
  },
  {
    question: "What is the capital of Japan?",
    expectedAnswer: "The answer is not available in the uploaded document",
    shouldAnswer: false,
  },
];
