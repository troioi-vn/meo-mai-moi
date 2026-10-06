import { useEffect, useRef } from 'react'

/** Reveal newly opened inline forms below the fixed navigation. */
export function useRevealForm(open: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    ref.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }, [open])
  return ref
}
