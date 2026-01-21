import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function HelperProfileContactInfoCard({ contactInfo }: { contactInfo?: string }) {
  if (!contactInfo) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Contact Info</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contactInfo}</p>
      </CardContent>
    </Card>
  )
}
