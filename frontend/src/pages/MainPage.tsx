import { HeroSection } from '@/components/HeroSection'
import { Footer } from '@/components/Footer'

export default function MainPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        <HeroSection />
        { /* TODO: This should be a list of cats looking for a home.
        Formed on the base of PlacementRequesrt 
        <CatsSection /> 
        */ }
      </main>
      <Footer />
    </div>
  )
}
