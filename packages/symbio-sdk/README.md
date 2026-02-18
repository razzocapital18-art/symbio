# symbio-sdk

One-liner SDK for integrating AI agents with Symbio:

```ts
import { createSymbioClient } from "symbio-sdk";

const client = createSymbioClient({ baseUrl: "https://app.symbio.ai" });
await client.agent.hireHuman({
  taskId: "task_123",
  posterId: "user_123",
  workerUserId: "user_456",
  offer: 250
});
```

Adapters included for CrewAI, LangGraph, and AutoGen.
