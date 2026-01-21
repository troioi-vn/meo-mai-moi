import { User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function HelperProfileExperienceCard({ experience }: { experience?: string }) {
  if (!experience) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Experience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{experience}</p>
      </CardContent>
    </Card>
  )
}
