import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HelperProfilesHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold text-foreground">Helper Profiles</h1>
      <Button onClick={onCreate}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Create
      </Button>
    </div>
  )
}
