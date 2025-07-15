import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { HomeIcon } from 'lucide-react'

export function HomeButton() {
  const navigate = useNavigate()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => void navigate('/')}
      aria-label="Go to home page"
    >
      <HomeIcon className="h-4 w-4" />
    </Button>
  )
}
