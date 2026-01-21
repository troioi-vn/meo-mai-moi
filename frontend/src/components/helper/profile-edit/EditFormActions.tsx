import { Button } from '@/components/ui/button'

export function EditFormActions({
  isSubmitting,
  onCancel,
}: {
  isSubmitting: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
      <Button
        type="submit"
        aria-label="Update Helper Profile"
        disabled={isSubmitting}
        className="flex-1 h-12 text-lg font-semibold"
      >
        {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
        className="h-12 px-8"
      >
        Cancel
      </Button>
    </div>
  )
}
