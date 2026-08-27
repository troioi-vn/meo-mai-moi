export function PageLoadingSpinner() {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center gap-4"
      role="status"
    >
      <img src="/loading.svg" alt="" className="h-32 w-32 rounded-3xl" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  )
}
