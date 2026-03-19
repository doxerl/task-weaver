import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageSelector';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  backLabel?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  rightContent?: React.ReactNode;
  showSettings?: boolean;
  className?: string;
}

export function AppHeader({
  title,
  subtitle,
  backPath,
  backLabel,
  icon,
  badge,
  rightContent,
  showSettings = true,
  className = '',
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettingsPage = location.pathname === '/settings';

  return (
    <header className={`border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 ${className}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {backPath && (
              <Link to={backPath}>
                <Button variant="ghost" size="sm" className="gap-1 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel && <span className="hidden sm:inline">{backLabel}</span>}
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2 min-w-0">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold truncate">{title}</h1>
                  {badge}
                </div>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            {rightContent}
            {showSettings && !isSettingsPage && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
