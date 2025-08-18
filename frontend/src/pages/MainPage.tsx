import { HeroSection } from '@/components/HeroSection'
import { ActivePlacementRequestsSection } from '@/components/ActivePlacementRequestsSection'
import { Footer } from '@/components/Footer'

export default function MainPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        <HeroSection />
        <ActivePlacementRequestsSection />
      </main>
      <Footer />
    </div>
  )
}
