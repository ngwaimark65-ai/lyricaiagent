import type { Subject } from "./types";

/**
 * Lightweight, client-side heuristic used only to decide when the UI may
 * *offer* learning tools. The real subject/intent classification will run
 * server-side alongside the model call.
 */
const SUBJECT_SIGNALS: Record<Subject, string[]> = {
  mathematics: ["algebra", "equation", "derivative", "integral", "geometry", "trigonometry", "matrix", "fraction", "calculus", "probability"],
  physics: ["velocity", "newton", "quantum", "momentum", "thermodynamics", "circuit", "voltage", "kinematics", "physics"],
  chemistry: ["molecule", "reaction", "stoichiometry", "periodic", "acid", "base", "covalent", "chemistry", "titration"],
  biology: ["cell", "mitochondria", "photosynthesis", "dna", "enzyme", "organelle", "genetics", "biology", "osmosis"],
  history: ["revolution", "empire", "war", "treaty", "colonial", "dynasty", "history", "civilisation", "civilization"],
  geography: ["climate", "erosion", "tectonic", "population density", "biome", "geography", "latitude"],
  economics: ["inflation", "supply and demand", "gdp", "elasticity", "monetary", "economics", "market failure"],
  accounting: ["balance sheet", "ledger", "debit", "credit", "depreciation", "accounting", "trial balance"],
  "computer-science": ["algorithm", "big o", "recursion", "data structure", "compiler", "binary tree", "pointer", "javascript", "python"],
  languages: ["grammar", "conjugate", "tense", "vocabulary", "translate", "pronunciation", "essay structure"],
};

const LEARNING_INTENT = [
  "explain",
  "what is",
  "how does",
  "why does",
  "teach me",
  "study",
  "exam",
  "revision",
  "homework",
  "solve",
  "prove",
  "define",
  "difference between",
];

export const SUBJECT_LABEL: Record<Subject, string> = {
  mathematics: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  history: "History",
  geography: "Geography",
  economics: "Economics",
  accounting: "Accounting",
  "computer-science": "Computer Science",
  languages: "Languages",
};

export function detectSubject(text: string): Subject | null {
  const value = text.toLowerCase();
  let best: { subject: Subject; hits: number } | null = null;

  for (const [subject, signals] of Object.entries(SUBJECT_SIGNALS) as [Subject, string[]][]) {
    const hits = signals.filter((signal) => value.includes(signal)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { subject, hits };
  }

  return best?.subject ?? null;
}

export function hasLearningIntent(text: string): boolean {
  const value = text.toLowerCase();
  return LEARNING_INTENT.some((signal) => value.includes(signal));
}

export function isEducational(text: string): boolean {
  return detectSubject(text) !== null || hasLearningIntent(text);
}
