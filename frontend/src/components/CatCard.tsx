import { Link } from 'react-router-dom'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import placeholderImage from '@/assets/images/placeholder--cat.webp'

interface CatCardProps {
  id: string
  name: string
  breed: string
  age: number
  location: string
  imageUrl?: string
}

export function CatCard({ id, name, breed, age, location, imageUrl }: CatCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
      <img src={imageUrl ?? placeholderImage} alt={name} className="w-full h-48 object-cover" />
      <CardHeader className="flex-grow">
        <CardTitle className="text-xl font-semibold text-foreground">{name}</CardTitle>
        <p className="text-sm text-gray-500">
          {breed} - {age} years old
        </p>
      </CardHeader>
      <CardContent className="text-foreground">
        <p>{location}</p>
      </CardContent>
      <CardFooter className="mt-auto">
        <Link to={`/cats/${id}`} className="w-full">
          <Button className="w-full">View Profile</Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
