import type { ReactNode } from 'react'
import { LanguageSwitcherCompact } from '@/components/LanguageSwitcherCompact'
import { cn } from '@/lib/utils'

interface AuthPageLayoutProps {
  children: ReactNode
  className?: string
  maxWidthClassName?: string
}

export function AuthPageLayout({
  children,
  className,
  maxWidthClassName = 'max-w-md',
}: AuthPageLayoutProps) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-6 sm:px-6">
      <div className={cn('w-full space-y-4', maxWidthClassName, className)}>
        <div className="flex justify-end">
          <LanguageSwitcherCompact />
        </div>
        {children}
      </div>
    </div>
  )
}
