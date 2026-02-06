import { HeroSection } from '@/components/layout/HeroSection'
import { ActivePlacementRequestsSection } from '@/components/pets/ActivePlacementRequestsSection'
import { Footer } from '@/components/layout/Footer'

export default function MainPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <main className="flex-1">
        <HeroSection />
        <ActivePlacementRequestsSection />
      </main>
      <Footer />
    </div>
  )
}
