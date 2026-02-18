export function buildHealthPayload() {
  return {
    ok: true,
    service: "symbio-realtime",
    at: new Date().toISOString()
  };
}
