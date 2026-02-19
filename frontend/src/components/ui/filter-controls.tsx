import type React from 'react'
import { cn } from '@/lib/utils'

/**
 * Small pill-shaped toggle chip used in filter panels.
 * Shared between MyPetsPage and RequestsPage.
 */
export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-150',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}

/**
 * Segmented toggle button used for sort direction controls.
 * Called "DirectionButton" in MyPetsPage, "SortButton" in RequestsPage — now unified.
 */
export function ToggleButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all duration-150',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
