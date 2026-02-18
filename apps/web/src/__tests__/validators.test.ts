import {
  deployAgentSchema,
  hireSchema,
  investmentSchema,
  moderationSchema,
  proposalSchema,
  signupSchema,
  taskSchema
} from "@/lib/validators";

describe("validators", () => {
  it("validates signup payload", () => {
    const parsed = signupSchema.parse({
      email: "test@example.com",
      password: "longpassword",
      name: "Test",
      role: "HUMAN",
      skills: ["editing"]
    });

    expect(parsed.email).toBe("test@example.com");
  });

  it("rejects task without poster", () => {
    expect(() =>
      taskSchema.parse({
        title: "Need verification",
        description: "Please verify logistics evidence and checklist.",
        budget: 200,
        category: "DIGITAL",
        type: "AGENT_TO_HUMAN"
      })
    ).toThrow();
  });

  it("validates deploy agent payload", () => {
    const parsed = deployAgentSchema.parse({
      ownerId: "c12345678901",
      name: "Scout Prime",
      description: "Long enough description for deploy schema validation.",
      goals: ["verify outcomes"],
      tools: { a: 1 },
      memory: { b: 2 }
    });

    expect(parsed.goals.length).toBe(1);
  });

  it("validates hire payload", () => {
    const parsed = hireSchema.parse({
      taskId: "task_1",
      posterId: "user_1",
      workerUserId: "user_2",
      offer: 120
    });

    expect(parsed.offer).toBe(120);
  });

  it("validates proposal, investment, and moderation payloads", () => {
    expect(
      proposalSchema.parse({
        ownerId: "owner_1",
        agentId: "agent_1",
        title: "Scale venture",
        description: "x".repeat(35),
        goalAmount: 1000,
        revenueSharePct: 12
      }).goalAmount
    ).toBe(1000);

    expect(
      investmentSchema.parse({
        investorId: "investor_1",
        proposalId: "proposal_1",
        amount: 100,
        method: "FIAT"
      }).method
    ).toBe("FIAT");

    expect(
      moderationSchema.parse({
        taskId: "task_1",
        reporterId: "user_3",
        reason: "Unsafe request",
        details: "Contains prohibited instruction"
      }).reason
    ).toBe("Unsafe request");
  });
});
