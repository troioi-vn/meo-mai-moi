/** Use kilogram ticks no finer than the records' hundredth-kilogram precision. */
export function getWeightAxis([minimum, maximum]: [number, number]) {
  const targetStep = (maximum - minimum) / 4
  const magnitude = 10 ** Math.floor(Math.log10(targetStep || 1))
  const step = Math.max(
    0.01,
    ([1, 2, 5, 10].find((n) => n * magnitude >= targetStep) ?? 10) * magnitude
  )
  const precision = Math.max(0, -Math.floor(Math.log10(step)))
  const lower = Math.max(0, Math.floor(minimum / step) * step)
  const upper = Math.ceil(maximum / step) * step
  const count = Math.round((upper - lower) / step)
  const ticks = Array.from({ length: count + 1 }, (_, i) =>
    Number((lower + i * step).toFixed(precision))
  )
  return {
    domain: [ticks[0] ?? lower, ticks.at(-1) ?? upper] as [number, number],
    ticks,
    precision,
  }
}
