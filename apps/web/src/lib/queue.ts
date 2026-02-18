import { Queue } from "bullmq";

const queue = process.env.REDIS_URL
  ? new Queue("hire-jobs", {
      connection: {
        url: process.env.REDIS_URL
      }
    })
  : null;

export const hireQueue = {
  async add(name: string, payload: Record<string, unknown>) {
    if (!queue) {
      return null;
    }
    return queue.add(name, payload);
  }
};
