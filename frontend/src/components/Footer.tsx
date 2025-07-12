import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t py-4 flex justify-center items-center gap-4 bg-muted">
      <Button variant="ghost" size="icon" aria-label="Instagram">
        <Instagram className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Facebook">
        <Facebook className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="GitHub">
        <Github className="h-5 w-5" />
      </Button>
    </footer>
  );
}
