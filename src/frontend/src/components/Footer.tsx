import { Heart } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const appIdentifier = typeof window !== 'undefined' ? window.location.hostname : 'glotaxa';

  return (
    <footer className="border-t border-border bg-muted/30 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            © {currentYear} Glotaxa. Built with{' '}
            <Heart className="w-4 h-4 text-red-500 fill-red-500 inline-block" /> using{' '}
            <a
              href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(appIdentifier)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4"
            >
              caffeine.ai
            </a>
          </p>
          <p className="mt-2 text-xs">
            VAT calculations are provided for informational purposes. Always consult with a tax professional for
            compliance.
          </p>
        </div>
      </div>
    </footer>
  );
}
