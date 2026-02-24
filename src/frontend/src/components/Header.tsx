import { Calculator } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-chart-1 to-chart-2">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Glotaxa</h1>
        </div>
      </div>
    </header>
  );
}
