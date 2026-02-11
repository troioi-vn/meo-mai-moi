import { useCallback, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis, LabelList } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import type { WeightHistory } from '@/api/generated/model'
import {
  format,
  parseISO,
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
import { useTranslation } from 'react-i18next'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'
import { Trash2 } from 'lucide-react'
import { toast } from '@/lib/i18n-toast'

// ── Types ────────────────────────────────────────────────────────────

interface ChartDataPoint {
  timestamp: number
  weight: number
  date: string
  label: string
  original: WeightHistory
}

export interface WeightChartProps {
  weights: WeightHistory[]
  canEdit?: boolean
  onUpdate?: (
    id: number,
    payload: Partial<{ weight_kg: number; record_date: string }>
  ) => Promise<WeightHistory>
  onDelete?: (id: number) => Promise<boolean>
}

// ── Config ───────────────────────────────────────────────────────────

const chartConfig = {
  weight: {
    label: 'Weight',
    color: 'hsl(160 60% 45%)',
  },
} satisfies ChartConfig

// ── Custom tooltip ───────────────────────────────────────────────────

function WeightTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: ChartDataPoint }[]
}) {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <div className="font-medium">{format(parseISO(data.date), 'PPP')}</div>
      <div className="mt-0.5 text-muted-foreground">
        {data.weight.toFixed(2)} kg
      </div>
    </div>
  )
}

// ── Grid tick computation ────────────────────────────────────────────

function computeGridTicks(chartData: ChartDataPoint[]) {
  if (chartData.length < 2) {
    return {
      ticks: chartData.map((d) => d.timestamp),
      tickFormat: 'MMM d, yyyy',
    }
  }

  const minTs = chartData[0].timestamp
  const maxTs = chartData[chartData.length - 1].timestamp
  const minDate = new Date(minTs)
  const maxDate = new Date(maxTs)
  const months = differenceInMonths(maxDate, minDate)

  // < 1 month: show data point dates, no vertical grid
  if (months < 1) {
    return {
      ticks: chartData.map((d) => d.timestamp),
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

// ── Main component ───────────────────────────────────────────────────

export function WeightChart({
  weights,
  canEdit,
  onUpdate,
  onDelete,
}: WeightChartProps) {
  const { t } = useTranslation(['pets', 'common'])
  const containerRef = useRef<HTMLDivElement>(null)

  // Inline-edit state
  const [editState, setEditState] = useState<{
    weight: WeightHistory
    anchorX: number
    anchorY: number
  } | null>(null)
  const [editWeight, setEditWeight] = useState<number | ''>('')
  const [editDate, setEditDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Derived data ───────────────────────────────────────────────────

  const { chartData, ticks, tickFormat, xDomain, yDomain, showVerticalGrid } =
    useMemo(() => {
      const empty = {
        chartData: [] as ChartDataPoint[],
        ticks: [] as number[],
        tickFormat: 'MMM',
        xDomain: [0, 1] as [number, number],
        yDomain: [0, 1] as [number, number],
        showVerticalGrid: false,
      }
      if (weights.length === 0) return empty

      // Sort ascending by date
      const sorted = [...weights].sort(
        (a, b) =>
          new Date(a.record_date ?? '').getTime() -
          new Date(b.record_date ?? '').getTime()
      )

      const chartData: ChartDataPoint[] = sorted.map((w, i, arr) => {
        const weightNum =
          typeof w.weight_kg === 'string'
            ? parseFloat(w.weight_kg)
            : (w.weight_kg ?? 0)
        const raw = w.record_date ?? ''
        // Normalize to YYYY-MM-DD (API may return full ISO timestamp)
        const dateStr = raw.includes('T') ? raw.split('T')[0] : raw
        return {
          timestamp: parseISO(dateStr).getTime(),
          weight: weightNum,
          date: dateStr,
          label: i === arr.length - 1 ? `${weightNum.toFixed(1)} kg` : '',
          original: w,
        }
      })

      // Y domain
      const wVals = chartData.map((d) => d.weight)
      const minW = Math.min(...wVals)
      const maxW = Math.max(...wVals)
      const wPad = (maxW - minW) * 0.15 || 0.5
      const yDomain: [number, number] = [
        Math.max(0, minW - wPad),
        maxW + wPad,
      ]

      // Single point
      if (chartData.length === 1) {
        const ts = chartData[0].timestamp
        const pad = 86400000 * 15 // 15 days
        return {
          chartData,
          ticks: [ts],
          tickFormat: 'MMM d, yyyy',
          xDomain: [ts - pad, ts + pad] as [number, number],
          yDomain,
          showVerticalGrid: false,
        }
      }

      // X domain with padding
      const minTs = chartData[0].timestamp
      const maxTs = chartData[chartData.length - 1].timestamp
      const tPad = (maxTs - minTs) * 0.05 || 86400000
      const xDomain: [number, number] = [minTs - tPad, maxTs + tPad]

      // Grid ticks
      const { ticks, tickFormat } = computeGridTicks(chartData)
      const months = differenceInMonths(new Date(maxTs), new Date(minTs))

      return {
        chartData,
        ticks,
        tickFormat,
        xDomain,
        yDomain,
        showVerticalGrid: months >= 1 && ticks.length > 0,
      }
    }, [weights])

  // ── Edit handlers ──────────────────────────────────────────────────

  const isEditable = canEdit && !!onUpdate

  const openEdit = useCallback(
    (point: ChartDataPoint, cx: number, cy: number) => {
      if (!isEditable) return
      setEditState({ weight: point.original, anchorX: cx, anchorY: cy })
      setEditWeight(point.weight)
      setEditDate(point.date)
      setConfirmDelete(false)
    },
    [isEditable]
  )

  const closeEdit = useCallback(() => {
    setEditState(null)
    setConfirmDelete(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!editState || !onUpdate || editWeight === '' || !editDate) return
    setSubmitting(true)
    try {
      await onUpdate(editState.weight.id ?? 0, {
        weight_kg: editWeight,
        record_date: editDate,
      })
      toast.success('pets:weight.updateSuccess')
      closeEdit()
    } catch {
      toast.error('pets:weight.updateError')
    } finally {
      setSubmitting(false)
    }
  }, [editState, onUpdate, editWeight, editDate, closeEdit])

  const handleDelete = useCallback(async () => {
    if (!editState || !onDelete) return
    setSubmitting(true)
    try {
      await onDelete(editState.weight.id ?? 0)
      toast.success('pets:weight.deleteSuccess')
      closeEdit()
    } catch {
      toast.error('pets:weight.deleteError')
    } finally {
      setSubmitting(false)
    }
  }, [editState, onDelete, closeEdit])

  // ── Render ─────────────────────────────────────────────────────────

  if (weights.length === 0) {
    return (
      <div className="flex items-center justify-center h-50 text-muted-foreground">
        {t('weight.noHistory')}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <ChartContainer config={chartConfig} className="h-50 w-full">
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 30, left: 0, right: 12, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={showVerticalGrid}
          />
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
          <YAxis
            domain={yDomain}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            width={45}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          {!editState && (
            <ChartTooltip cursor={false} content={<WeightTooltip />} />
          )}
          <Line
            dataKey="weight"
            type="monotone"
            stroke="var(--color-weight)"
            strokeWidth={2}
            dot={(props: Record<string, unknown>) => {
              const { cx, cy, payload, key } = props as {
                cx?: number
                cy?: number
                payload?: ChartDataPoint
                key?: string
              }
              if (cx == null || cy == null) return <g key={key} />
              return (
                <circle
                  key={key}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="var(--color-weight)"
                  stroke="var(--background)"
                  strokeWidth={1}
                  cursor={isEditable ? 'pointer' : 'default'}
                  onClick={(e) => {
                    if (!payload) return
                    e.stopPropagation()
                    openEdit(payload, cx, cy)
                  }}
                />
              )
            }}
            activeDot={(props: Record<string, unknown>) => {
              const { cx, cy, payload, key } = props as {
                cx?: number
                cy?: number
                payload?: ChartDataPoint
                key?: string
              }
              if (cx == null || cy == null) return <g key={key} />
              return (
                <circle
                  key={key}
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill="var(--color-weight)"
                  stroke="var(--background)"
                  strokeWidth={2}
                  cursor={isEditable ? 'pointer' : 'default'}
                  onClick={(e) => {
                    if (!payload) return
                    e.stopPropagation()
                    openEdit(payload, cx, cy)
                  }}
                />
              )
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

      {/* Inline edit popover */}
      {editState && isEditable && (
        <Popover
          open
          onOpenChange={(open) => {
            if (!open) closeEdit()
          }}
        >
          <PopoverAnchor asChild>
            <div
              className="absolute w-0 h-0 pointer-events-none"
              style={{ left: editState.anchorX, top: editState.anchorY }}
            />
          </PopoverAnchor>
          <PopoverContent className="w-64" side="top" sideOffset={12}>
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('weight.deleteConfirm', {
                    weight: editState.weight.weight_kg,
                    date: format(
                      parseISO(editState.weight.record_date ?? ''),
                      'PPP'
                    ),
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void handleDelete()}
                    disabled={submitting}
                  >
                    {t('common:actions.delete')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setConfirmDelete(false) }}
                    disabled={submitting}
                  >
                    {t('common:actions.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('weight.form.weightLabel')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editWeight}
                    onChange={(e) => {
                      setEditWeight(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }}
                    className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('weight.form.dateLabel')}
                  </label>
                  <div className="mt-1">
                    <YearMonthDatePicker
                      value={editDate}
                      onChange={setEditDate}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => void handleSave()}
                    disabled={submitting}
                  >
                    {t('weight.form.save')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={closeEdit}
                    disabled={submitting}
                  >
                    {t('common:actions.cancel')}
                  </Button>
                  {onDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => { setConfirmDelete(true) }}
                      disabled={submitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
