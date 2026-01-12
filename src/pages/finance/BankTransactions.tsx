import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useBankTransactions } from '@/hooks/finance/useBankTransactions';
import { useCategories } from '@/hooks/finance/useCategories';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.abs(n));
const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

export default function BankTransactions() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { transactions, isLoading, updateCategory, stats } = useBankTransactions(year);
  const { grouped } = useCategories();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">Banka İşlemleri</h1>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="flex gap-2 text-sm">
          <Badge variant="outline">{stats.total} işlem</Badge>
          {stats.uncategorized > 0 && (
            <Badge variant="destructive">{stats.uncategorized} kategorisiz</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Henüz işlem yok.
              <Link to="/finance/bank-import" className="block mt-2 text-primary underline">
                Banka ekstresi yükle
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <Card key={tx.id} className={cn(!tx.category_id && "ring-2 ring-amber-400")}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{formatDate(tx.transaction_date)}</p>
                      <p className="text-sm truncate">{tx.description}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-bold", tx.amount > 0 ? "text-green-600" : "text-red-600")}>
                        {tx.amount > 0 ? '+' : '-'}{formatCurrency(tx.amount)} ₺
                      </p>
                      {tx.ai_confidence > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          AI {Math.round(tx.ai_confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Select
                    value={tx.category_id || ''}
                    onValueChange={categoryId => updateCategory.mutate({ id: tx.id, categoryId: categoryId || null })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Kategori seç..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grouped.all.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}
