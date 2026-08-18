export type TargetDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER'
export type IndicatorStatus = 'GREEN' | 'YELLOW' | 'RED'

/**
 * Fraction of target achieved, direction-aware. For LOWER_IS_BETTER
 * indicators (e.g. incident counts) an actual value below target scores
 * >= 1, so the same 0.9/0.6 bands used for HIGHER_IS_BETTER apply unchanged.
 */
function achievementRatio(actualValue: number, targetValue: number, targetDirection: TargetDirection): number {
  if (!targetValue || targetValue <= 0) return 1
  if (targetDirection === 'LOWER_IS_BETTER') {
    return actualValue <= 0 ? 1 : targetValue / actualValue
  }
  return actualValue / targetValue
}

export function computeIndicatorStatus(
  actualValue: number,
  targetValue: number,
  targetDirection: TargetDirection = 'HIGHER_IS_BETTER'
): IndicatorStatus {
  const achievement = achievementRatio(actualValue, targetValue, targetDirection)
  if (achievement >= 0.9) return 'GREEN'
  if (achievement >= 0.6) return 'YELLOW'
  return 'RED'
}

/** 0-100 achievement percentage, consistent with computeIndicatorStatus's bands. */
export function computeAchievementPct(
  actualValue: number,
  targetValue: number,
  targetDirection: TargetDirection = 'HIGHER_IS_BETTER'
): number {
  const achievement = achievementRatio(actualValue, targetValue, targetDirection)
  return Math.min(100, Math.max(0, Math.round(achievement * 100)))
}

/**
 * Raw-value boundaries (in the indicator's own unit) between the RED/YELLOW/GREEN
 * zones, for driving gauges and chart shading. `lower < upper` always; which side
 * is "good" depends on direction.
 */
export function getIndicatorZoneThresholds(targetValue: number, targetDirection: TargetDirection) {
  if (!targetValue || targetValue <= 0) return { lower: 0, upper: 0 }
  if (targetDirection === 'LOWER_IS_BETTER') {
    return { lower: targetValue / 0.9, upper: targetValue / 0.6 }
  }
  return { lower: targetValue * 0.6, upper: targetValue * 0.9 }
}
