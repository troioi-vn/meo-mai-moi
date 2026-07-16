import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

export function FinanceField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
