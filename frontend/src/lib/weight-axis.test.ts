import { describe, expect, it } from 'vite-plus/test'
import { getWeightAxis } from './weight-axis'

describe('weight axis', () => {
  it.each([
    [4.39, 4.53],
    [0.005, 0.035],
    [3.9, 5.4],
    [0, 80],
  ] as [number, number][])('uses distinct readable labels between %s and %s kg', (min, max) => {
    const axis = getWeightAxis([min, max])
    const labels = axis.ticks.map((tick) => tick.toFixed(axis.precision))
    expect(new Set(labels).size).toBe(labels.length)
    expect(axis.domain[0]).toBeLessThanOrEqual(min)
    expect(axis.domain[1]).toBeGreaterThanOrEqual(max)
    expect(axis.ticks.length).toBeGreaterThan(1)
    expect(axis.ticks.length).toBeLessThanOrEqual(7)
  })

  it('retains hundredth-kilogram differences for a nearly stable weight', () => {
    const axis = getWeightAxis([4.39, 4.53])
    expect(axis.precision).toBe(2)
    expect(axis.ticks).toContain(4.45)
    expect(axis.ticks).toContain(4.5)
  })
})
