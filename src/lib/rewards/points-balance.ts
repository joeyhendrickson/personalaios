import { sumEarnedPoints } from '@/lib/points/sum-earned-points'

export function computeRewardsBalance(
  ledger: Array<{ points?: number | null }> | null | undefined,
  redeemedPointCosts: number[]
): { totalPoints: number; totalRedeemed: number; currentPoints: number } {
  const totalPoints = sumEarnedPoints(ledger)
  const totalRedeemed = redeemedPointCosts.reduce((sum, cost) => sum + (Number(cost) || 0), 0)
  return {
    totalPoints,
    totalRedeemed,
    currentPoints: totalPoints - totalRedeemed,
  }
}
