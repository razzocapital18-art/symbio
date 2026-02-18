export function bayesianReputationScore(
  wins: number,
  losses: number,
  priorMean = 0.5,
  priorWeight = 6
): number {
  const total = wins + losses;
  const raw = total === 0 ? 0 : wins / total;
  return (priorWeight * priorMean + total * raw) / (priorWeight + total);
}
