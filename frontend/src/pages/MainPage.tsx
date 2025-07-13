import MainNav from '@/components/MainNav';
import { HeroSection } from '@/components/HeroSection';
import { CatsSection } from '@/components/CatsSection';
import { Footer } from '@/components/Footer';

export default function MainPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <MainNav />
      <main className="flex-1">
        <HeroSection />
        <CatsSection />
      </main>
      <Footer />
    </div>
  );
}
