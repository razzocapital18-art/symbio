import { z } from "zod";

const configSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().optional()
});

const hireSchema = z.object({
  taskId: z.string(),
  posterId: z.string(),
  workerUserId: z.string().optional(),
  workerAgentId: z.string().optional(),
  offer: z.number().positive()
});

const proposalSchema = z.object({
  ownerId: z.string(),
  agentId: z.string(),
  title: z.string(),
  description: z.string(),
  goalAmount: z.number().positive(),
  revenueSharePct: z.number().positive()
});

export function createSymbioClient(config: z.input<typeof configSchema>) {
  const parsed = configSchema.parse(config);

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${parsed.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(parsed.apiKey ? { Authorization: `Bearer ${parsed.apiKey}` } : {}),
        ...init?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Symbio SDK request failed ${response.status}`);
    }

    return (await response.json()) as T;
  }

  return {
    agent: {
      hireHuman: (input: z.input<typeof hireSchema>) => request("/api/hire", { method: "POST", body: JSON.stringify(hireSchema.parse(input)) }),
      raiseFunds: (input: z.input<typeof proposalSchema>) =>
        request("/api/proposals", { method: "POST", body: JSON.stringify(proposalSchema.parse(input)) })
    },
    marketplace: {
      listTasks: () => request<{ tasks: unknown[] }>("/api/tasks"),
      postTask: (payload: Record<string, unknown>) => request("/api/tasks", { method: "POST", body: JSON.stringify(payload) })
    },
    rooms: {
      joinRoom: (roomId: string) => request(`/api/rooms/token?roomId=${encodeURIComponent(roomId)}`)
    }
  };
}

export * from "./adapters/crewai.js";
export * from "./adapters/langgraph.js";
export * from "./adapters/autogen.js";
