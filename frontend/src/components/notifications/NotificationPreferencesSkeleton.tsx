import { Skeleton } from '@/components/ui/skeleton'

export function NotificationPreferencesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Control how you receive notifications for different events.
        </p>
      </div>
      <div className="space-y-6">
        {[1, 2, 3].map((groupIdx) => (
          <div key={groupIdx} className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="divide-y">
              {[1, 2].map((itemIdx) => (
                <div key={itemIdx} className="px-4 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-1" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-6 w-11" />
                    <Skeleton className="h-6 w-11" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
