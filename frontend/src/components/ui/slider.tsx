import * as React from 'react'
import { cn } from '@/lib/utils'

function Slider({ className, ...props }: React.ComponentProps<'input'> & { type?: 'range' }) {
  return (
    <input
      type="range"
      className={cn(
        'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Slider }
