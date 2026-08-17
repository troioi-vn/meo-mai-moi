import {
  differenceInMonths,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  addMonths,
  addQuarters,
  addYears,
  isBefore,
  isAfter,
} from 'date-fns'

/**
 * Picks X-axis ticks and a date format for a time-scaled chart, adapting the
 * granularity to the span of the data: per-point under a month, then monthly,
 * quarterly, and yearly. Shared by the weight history and habit charts.
 */
export function computeGridTicks(points: { timestamp: number }[]) {
  const firstPoint = points[0]
  const lastPoint = points.at(-1)

  if (points.length < 2) {
    return {
      ticks: points.map((d) => d.timestamp),
      tickFormat: 'MMM d, yyyy',
    }
  }

  if (!firstPoint || !lastPoint) {
    return {
      ticks: [],
      tickFormat: 'MMM',
    }
  }

  const minTs = firstPoint.timestamp
  const maxTs = lastPoint.timestamp
  const minDate = new Date(minTs)
  const maxDate = new Date(maxTs)
  const months = differenceInMonths(maxDate, minDate)

  // < 1 month: show data point dates, no vertical grid
  if (months < 1) {
    return {
      ticks: points.map((d) => d.timestamp),
      tickFormat: 'MMM d',
    }
  }

  const ticks: number[] = []

  if (months <= 12) {
    let cur = startOfMonth(addMonths(minDate, 1))
    while (isBefore(cur, maxDate)) {
      ticks.push(cur.getTime())
      cur = addMonths(cur, 1)
    }
    return { ticks, tickFormat: months <= 6 ? 'MMM' : "MMM ''yy" }
  }

  if (months <= 24) {
    let cur = startOfQuarter(minDate)
    if (!isAfter(cur, minDate)) cur = addQuarters(cur, 1)
    while (isBefore(cur, maxDate)) {
      ticks.push(cur.getTime())
      cur = addQuarters(cur, 1)
    }
    return { ticks, tickFormat: "MMM ''yy" }
  }

  // > 2 years: yearly
  let cur = startOfYear(addYears(minDate, 1))
  while (isBefore(cur, maxDate)) {
    ticks.push(cur.getTime())
    cur = addYears(cur, 1)
  }
  return { ticks, tickFormat: 'yyyy' }
}
