import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageSelector';

interface AppHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Back navigation path */
  backPath?: string;
  /** Back button label (shown on larger screens) */
  backLabel?: string;
  /** Icon to display before title */
  icon?: React.ReactNode;
  /** Badge to display after title */
  badge?: React.ReactNode;
  /** Additional content for the right side (after language toggle) */
  rightContent?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable app header with language toggle
 * Provides consistent header layout across all pages
 */
export function AppHeader({
  title,
  subtitle,
  backPath,
  backLabel,
  icon,
  badge,
  rightContent,
  className = '',
}: AppHeaderProps) {
  return (
    <header className={`border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 ${className}`}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back + Title */}
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
          
          {/* Right: Language Toggle + Custom Content */}
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle />
            {rightContent}
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
