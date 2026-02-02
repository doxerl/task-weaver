import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, CalendarDays, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabItem {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
  matchPaths?: string[];
}

const tabConfig: TabItem[] = [
  {
    path: '/finance',
    labelKey: 'navigation.finance',
    icon: <Wallet className="h-5 w-5" />,
    matchPaths: ['/finance'],
  },
  {
    path: '/today',
    labelKey: 'navigation.today',
    icon: <Calendar className="h-5 w-5" />,
    matchPaths: ['/today'],
  },
  {
    path: '/week',
    labelKey: 'navigation.week',
    icon: <CalendarDays className="h-5 w-5" />,
    matchPaths: ['/week'],
  },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const isActive = (tab: TabItem) => {
    const paths = tab.matchPaths || [tab.path];
    return paths.some(p => location.pathname.startsWith(p));
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-around px-4">
        {tabConfig.map((tab) => {
          const active = isActive(tab);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              <span className="text-xs font-medium">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
