import { Loader2 } from 'lucide-react'

export function PageLoadingSpinner() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
