export function PageLoadingSpinner() {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] w-full items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <img src="/loading.svg" alt="" className="h-32 w-32 rounded-3xl" />
    </div>
  )
}
