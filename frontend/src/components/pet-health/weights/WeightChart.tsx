import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis, LabelList } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { WeightHistory } from '@/api/pets'
import { format, parseISO } from 'date-fns'

interface WeightChartProps {
  weights: WeightHistory[]
}

const chartConfig = {
  weight: {
    label: 'Weight',
    color: 'hsl(160 60% 45%)', // Teal/green color matching the design
  },
} satisfies ChartConfig

export function WeightChart({ weights }: WeightChartProps) {
  const chartData = useMemo(() => {
    // Sort by date ascending for the chart
    const sorted = [...weights].sort(
      (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
    )

    return sorted.map((w, index, arr) => {
      // Ensure weight_kg is a number (API may return string)
      const weightNum = typeof w.weight_kg === 'string' ? parseFloat(w.weight_kg) : w.weight_kg
      const isLast = index === arr.length - 1
      return {
        date: w.record_date,
        month: format(parseISO(w.record_date), 'MMM'),
        weight: weightNum,
        // Only show label for the last point (matching the design)
        label: isLast ? `${weightNum.toFixed(1)}kg` : '',
      }
    })
  }, [weights])

  if (weights.length === 0) {
    return (
      <div className="flex items-center justify-center h-50 text-muted-foreground">
        No weight records yet
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-50 w-full">
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          top: 30,
          left: 12,
          right: 12,
          bottom: 12,
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis hide domain={['dataMin - 0.5', 'dataMax + 0.5']} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              formatter={(value) => [`${Number(value).toFixed(2)} kg`, 'Weight']}
            />
          }
        />
        <Line
          dataKey="weight"
          type="monotone"
          stroke="var(--color-weight)"
          strokeWidth={2}
          dot={{
            fill: 'var(--color-weight)',
            r: 4,
          }}
          activeDot={{
            r: 6,
          }}
        >
          <LabelList
            dataKey="label"
            position="top"
            offset={12}
            className="fill-foreground"
            fontSize={12}
          />
        </Line>
      </LineChart>
    </ChartContainer>
  )
}
