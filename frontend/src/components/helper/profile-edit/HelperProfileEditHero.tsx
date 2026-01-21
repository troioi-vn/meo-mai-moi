import { UserCog } from 'lucide-react'

export function HelperProfileEditHero() {
  return (
    <div className="mb-8 text-center">
      <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
        <UserCog className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">Edit Helper Profile</h1>
      <p className="text-muted-foreground max-w-lg mx-auto">
        Keep your profile up to date to help pet owners find the best match for their pets.
      </p>
    </div>
  )
}
