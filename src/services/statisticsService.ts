/**
 * Accuracy as a whole-number percentage (spec 6.6):
 * correct answers / total questions attempted × 100.
 * Returns 0 when nothing has been attempted, instead of dividing by zero.
 */
export function calculateAccuracy(correct: number, attempted: number): number {
  if (attempted <= 0) return 0;
  return Math.round((correct / attempted) * 100);
}
