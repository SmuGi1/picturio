// Adjust channels are stored as -1..1 (neutral 0) but shown as 0-200% (neutral 100%).
export const ADJUST_NEUTRAL_PCT = 100

export function valueToPercent(value: number): number {
  return Math.round((value + 1) * 100)
}

export function percentToValue(percent: number): number {
  return percent / 100 - 1
}
