import { CheckCircle2, Home, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlacementRequestDetail } from '@/types/placement'

interface ActivePlacementSectionProps {
  request: PlacementRequestDetail
  actionLoading: string | null
  onFinalize: () => Promise<void>
}

export function ActivePlacementSection({
  request,
  actionLoading,
  onFinalize,
}: ActivePlacementSectionProps) {
  if (!request.available_actions.can_finalize) return null

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Active Placement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <Home className="h-4 w-4" />
            <span>
              {request.request_type === 'pet_sitting'
                ? 'Pet is currently with sitter'
                : 'Pet is currently with foster'}
            </span>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full" disabled={actionLoading === 'finalize'}>
                {actionLoading === 'finalize' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Pet is Returned
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Pet Return</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you confirming that {request.pet.name} has been returned to you? This will end
                  the {request.request_type === 'pet_sitting' ? 'pet sitting' : 'fostering'} period
                  and mark the placement as completed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void onFinalize()}>
                  Confirm Return
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
