import { buildHealthPayload } from "../health";
import { addMessage, getMessages } from "../rooms";

describe("realtime utilities", () => {
  it("builds health payload", () => {
    const payload = buildHealthPayload();
    expect(payload.ok).toBe(true);
    expect(payload.service).toBe("symbio-realtime");
    expect(typeof payload.at).toBe("string");
  });

  it("stores room messages", () => {
    const roomId = "room-test";
    const message = addMessage(roomId, "agent", "hello world");
    const messages = getMessages(roomId);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[messages.length - 1]?.id).toBe(message.id);
    expect(messages[messages.length - 1]?.content).toBe("hello world");
  });
});
