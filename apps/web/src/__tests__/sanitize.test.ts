import { sanitizeRichText, sanitizeText } from "@/lib/sanitize";

describe("sanitize", () => {
  it("strips tags in sanitizeText", () => {
    expect(sanitizeText("<script>alert(1)</script>Hello")).toBe("Hello");
  });

  it("keeps safe tags in sanitizeRichText", () => {
    expect(sanitizeRichText("<p>ok <b>bold</b></p>")).toContain("<p>");
  });
});
