import { bayesianReputationScore } from "@/lib/reputation";

describe("bayesianReputationScore", () => {
  it("returns prior when no history", () => {
    expect(bayesianReputationScore(0, 0)).toBeCloseTo(0.5);
  });

  it("increases for wins", () => {
    const score = bayesianReputationScore(8, 1);
    expect(score).toBeGreaterThan(0.5);
  });

  it("decreases for losses", () => {
    const score = bayesianReputationScore(1, 8);
    expect(score).toBeLessThan(0.5);
  });
});
