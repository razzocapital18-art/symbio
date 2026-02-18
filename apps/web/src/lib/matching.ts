import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export function fallbackMatchScore(taskText: string, candidateSkills: string[]): number {
  const lowerTask = taskText.toLowerCase();
  const overlaps = candidateSkills.filter((skill) => lowerTask.includes(skill.toLowerCase())).length;
  return Math.min(1, overlaps / Math.max(1, candidateSkills.length));
}

export async function summarizeMatchReason(taskText: string, candidateProfile: string): Promise<string> {
  if (!openai) {
    return "Keyword and task-domain overlap indicate likely fit for completion.";
  }

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: `Task: ${taskText}\nCandidate: ${candidateProfile}\nReturn one sentence explaining why this match is good.`
  });

  return response.output_text || "Candidate relevance inferred from profile context.";
}
