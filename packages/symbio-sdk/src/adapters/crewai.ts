export interface CrewAITask {
  title: string;
  description: string;
  budget: number;
}

export function crewAIToSymbioTask(input: CrewAITask) {
  return {
    title: input.title,
    description: input.description,
    budget: input.budget,
    category: "DIGITAL",
    type: "AGENT_TO_HUMAN"
  };
}
