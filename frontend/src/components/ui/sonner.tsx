'use client'

// In tests, 'sonner' may be mocked or unavailable; provide a safe fallback
// Importing as namespace to allow optional access in tests
import * as SonnerModule from 'sonner'

import { useTheme } from '@/hooks/use-theme'

// Use the real Toaster if available, otherwise a no-op component
const SonnerToaster = (SonnerModule as { Toaster: React.ComponentType<unknown> }).Toaster ?? (() => null)

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <SonnerToaster
      theme={theme === 'system' ? 'system' : theme === 'dark' ? 'dark' : 'light'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
