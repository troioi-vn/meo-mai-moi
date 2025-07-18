import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { calculateAge } from '@/types/cat'
import placeholderImage from '@/assets/images/placeholder--cat.webp'


import type { Cat } from '@/types/cat'

interface CatCardProps {
  cat: Cat
}

export function CatCard({ cat }: CatCardProps) {
  const age = calculateAge(cat.birthday)

  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
      <img
        src={cat.photo_url ?? placeholderImage}
        alt={cat.name}
        className="w-full h-48 object-cover"
      />
      <CardHeader className="flex-grow">
        <CardTitle className="text-xl font-semibold text-foreground">{cat.name}</CardTitle>
        <p className="text-sm text-gray-500">
          {cat.breed} - {age} years old
        </p>
      </CardHeader>
      <CardContent className="text-foreground">
        <p>{cat.location}</p>
      </CardContent>
      <CardFooter className="mt-auto">
        <Link to={`/cats/${cat.id}`} className="w-full">
          <Button className="w-full">View Profile</Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
