import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { type ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart'
import type { HabitPetSummarySeriesPoint } from '@/api/generated/model'
import { differenceInMonths, format, parseISO } from 'date-fns'
import { computeGridTicks } from '@/lib/chart-ticks'

interface ChartDataPoint {
  timestamp: number
  value: number
  date: string
}

export interface HabitPetChartProps {
  series: HabitPetSummarySeriesPoint[]
  scaleMin: number
  scaleMax: number
  emptyLabel: string
}

// One series per chart — the pet's identity comes from the card heading, not the
// colour, so every facet shares a single hue and stays visually comparable.
const chartConfig = {
  value: {
    label: 'Score',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

function HabitTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: ChartDataPoint }[]
}) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <div className="font-medium">{format(parseISO(data.date), 'PPP')}</div>
      <div className="mt-0.5 text-muted-foreground">{data.value}</div>
    </div>
  )
}

export function HabitPetChart({ series, scaleMin, scaleMax, emptyLabel }: HabitPetChartProps) {
  const { chartData, ticks, tickFormat, xDomain, showVerticalGrid } = useMemo(() => {
    const empty = {
      chartData: [] as ChartDataPoint[],
      ticks: [] as number[],
      tickFormat: 'MMM',
      xDomain: [0, 1] as [number, number],
      showVerticalGrid: false,
    }

    const points: ChartDataPoint[] = series
      .map((point) => ({
        timestamp: parseISO(point.date ?? '').getTime(),
        value: point.value ?? 0,
        date: point.date ?? '',
      }))
      .filter((point) => Number.isFinite(point.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp)

    if (points.length === 0) return empty

    const firstPoint = points[0]
    const lastPoint = points.at(-1)
    if (!firstPoint || !lastPoint) return empty

    if (points.length === 1) {
      const pad = 86400000 * 3
      return {
        chartData: points,
        ticks: [firstPoint.timestamp],
        tickFormat: 'MMM d, yyyy',
        xDomain: [firstPoint.timestamp - pad, firstPoint.timestamp + pad] as [number, number],
        showVerticalGrid: false,
      }
    }

    const minTs = firstPoint.timestamp
    const maxTs = lastPoint.timestamp
    const pad = (maxTs - minTs) * 0.05 || 86400000
    const { ticks, tickFormat } = computeGridTicks(points)
    const months = differenceInMonths(new Date(maxTs), new Date(minTs))

    return {
      chartData: points,
      ticks,
      tickFormat,
      xDomain: [minTs - pad, maxTs + pad] as [number, number],
      showVerticalGrid: months >= 1 && ticks.length > 0,
    }
  }, [series])

  if (chartData.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-40 w-full">
      <LineChart accessibilityLayer data={chartData} margin={{ top: 12, left: 0, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={showVerticalGrid} />
        <XAxis
          dataKey="timestamp"
          type="number"
          scale="time"
          domain={xDomain}
          ticks={ticks}
          tickFormatter={(ts: number) => format(new Date(ts), tickFormat)}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        {/* Fixed to the habit's own scale so every pet's chart is comparable. */}
        <YAxis
          domain={[scaleMin, scaleMax]}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={32}
        />
        <ChartTooltip cursor={{ strokeDasharray: '3 3' }} content={<HabitTooltip />} />
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={{ r: 4, fill: 'var(--color-value)', stroke: 'var(--background)', strokeWidth: 1 }}
          activeDot={{
            r: 6,
            fill: 'var(--color-value)',
            stroke: 'var(--background)',
            strokeWidth: 2,
          }}
        />
      </LineChart>
    </ChartContainer>
  )
}
