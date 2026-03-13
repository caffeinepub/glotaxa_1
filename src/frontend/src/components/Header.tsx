import { Button } from "@/components/ui/button";
import { Calculator, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

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
    <header
      className="sticky top-0 z-50"
      style={{
        background: "oklch(0.995 0.005 240)",
        borderBottom: "1px solid oklch(0.88 0.025 240)",
        boxShadow:
          "0 1px 3px oklch(0.38 0.13 255 / 0.06), 0 4px 12px oklch(0.38 0.13 255 / 0.04)",
      }}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-lg"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.42 0.14 255), oklch(0.48 0.16 195))",
                boxShadow: "0 4px 12px oklch(0.42 0.14 255 / 0.3)",
              }}
            >
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.38 0.13 255), oklch(0.48 0.16 195))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Glotaxa
            </h1>
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
