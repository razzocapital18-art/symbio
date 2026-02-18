import { GET } from "@/app/api/health/route";

describe("health route", () => {
  it("returns ok", async () => {
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
