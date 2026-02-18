import { TaskCategory, TaskType, UserRole } from "@prisma/client";
import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(80),
  role: z.nativeEnum(UserRole),
  skills: z.array(z.string().min(1).max(80)).default([]),
  location: z.string().max(80).optional(),
  portfolioUrl: z.string().url().optional(),
  bio: z.string().max(400).optional()
});

export const deployAgentSchema = z.object({
  ownerId: z.string().min(10),
  name: z.string().min(2).max(100),
  description: z.string().min(20).max(1000),
  goals: z.array(z.string().min(2).max(120)).min(1),
  tools: z.record(z.any()).default({}),
  memory: z.record(z.any()).default({})
});

export const taskSchema = z
  .object({
    title: z.string().min(4).max(120),
    description: z.string().min(20).max(4000),
    budget: z.coerce.number().positive().max(1000000),
    category: z.nativeEnum(TaskCategory),
    type: z.nativeEnum(TaskType),
    location: z.string().max(120).optional(),
    posterUserId: z.string().optional(),
    posterAgentId: z.string().optional()
  })
  .refine((data) => data.posterUserId || data.posterAgentId, {
    message: "Either posterUserId or posterAgentId is required"
  });

export const hireSchema = z
  .object({
    taskId: z.string(),
    posterId: z.string(),
    workerUserId: z.string().optional(),
    workerAgentId: z.string().optional(),
    offer: z.coerce.number().positive().max(1000000)
  })
  .refine((data) => data.workerUserId || data.workerAgentId, {
    message: "Either workerUserId or workerAgentId is required"
  });

export const proposalSchema = z.object({
  ownerId: z.string(),
  agentId: z.string(),
  title: z.string().min(4).max(140),
  description: z.string().min(30).max(5000),
  goalAmount: z.coerce.number().positive(),
  revenueSharePct: z.coerce.number().min(0.1).max(90)
});

export const investmentSchema = z.object({
  investorId: z.string(),
  proposalId: z.string(),
  amount: z.coerce.number().positive(),
  method: z.enum(["FIAT", "CRYPTO"])
});

export const moderationSchema = z.object({
  taskId: z.string(),
  reporterId: z.string(),
  reason: z.string().min(5).max(200),
  details: z.string().max(1000).optional()
});

export const profileUpdateSchema = z.object({
  userId: z.string(),
  name: z.string().min(2).max(80).optional(),
  location: z.string().max(80).optional(),
  portfolioUrl: z.string().url().optional(),
  bio: z.string().max(400).optional(),
  skills: z.array(z.string().min(1).max(80)).optional()
});

export const reportStatusUpdateSchema = z.object({
  reportId: z.string(),
  status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED"])
});
