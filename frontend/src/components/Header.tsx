import { Calculator, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onNavigateDashboard?: () => void;
  onLogout?: () => void;
}

export function Header({ onNavigateDashboard, onLogout }: HeaderProps) {
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    onLogout?.();
  };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-chart-1 to-chart-2">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Glotaxa</h1>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-2">
              {onNavigateDashboard && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNavigateDashboard}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
