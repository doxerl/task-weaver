import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCategories } from '@/hooks/finance/useCategories';
import { BottomTabBar } from '@/components/BottomTabBar';

const typeLabels: Record<string, string> = {
  INCOME: 'Gelir',
  EXPENSE: 'Gider',
  PARTNER: 'Ortak Cari',
  FINANCING: 'Finansman',
  INVESTMENT: 'Yatırım',
  EXCLUDED: 'Hariç'
};

export default function Categories() {
  const { grouped, isLoading } = useCategories();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Kategoriler</h1>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).filter(([key]) => key !== 'all').map(([type, cats]) => (
              <div key={type}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-2">
                  {typeLabels[type.toUpperCase()] || type}
                </h2>
                <Card>
                  <CardContent className="p-2 space-y-1">
                    {cats.map(cat => (
                      <div key={cat.id} className="flex items-center gap-3 p-2 rounded hover:bg-accent">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="flex-1">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">{cat.code}</span>
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: cat.color }}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}
