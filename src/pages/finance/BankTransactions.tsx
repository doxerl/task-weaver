import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Loader2, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { useBankTransactions } from '@/hooks/finance/useBankTransactions';
import { useCategories } from '@/hooks/finance/useCategories';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { BankTransaction } from '@/types/finance';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR').format(Math.abs(n));
const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

const monthNames = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

interface TransactionCardProps {
  tx: BankTransaction;
  categories: { id: string; icon: string; name: string }[];
  onCategoryChange: (id: string, categoryId: string | null) => void;
}

function TransactionCard({ tx, categories, onCategoryChange }: TransactionCardProps) {
  return (
    <Card className={cn(!tx.category_id && "ring-2 ring-amber-400")}>
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
          onValueChange={categoryId => onCategoryChange(tx.id, categoryId || null)}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Kategori seç..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
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
  );
}

export default function BankTransactions() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { transactions, isLoading, updateCategory, stats } = useBankTransactions(year);
  const { grouped } = useCategories();
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  // Group transactions by month
  const groupedByMonth = useMemo(() => {
    const months: Record<string, { 
      income: BankTransaction[]; 
      expense: BankTransaction[];
      incomeTotal: number;
      expenseTotal: number;
    }> = {};
    
    transactions.forEach(tx => {
      const date = new Date(tx.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months[monthKey]) {
        months[monthKey] = { income: [], expense: [], incomeTotal: 0, expenseTotal: 0 };
      }
      
      if (tx.amount > 0) {
        months[monthKey].income.push(tx);
        months[monthKey].incomeTotal += tx.amount;
      } else {
        months[monthKey].expense.push(tx);
        months[monthKey].expenseTotal += Math.abs(tx.amount);
      }
    });
    
    return Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  // Initialize open state for all months
  useMemo(() => {
    const initial: Record<string, boolean> = {};
    groupedByMonth.forEach(([key]) => {
      if (openMonths[key] === undefined) {
        initial[key] = true; // Default open
      }
    });
    if (Object.keys(initial).length > 0) {
      setOpenMonths(prev => ({ ...prev, ...initial }));
    }
  }, [groupedByMonth]);

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getMonthLabel = (key: string) => {
    const [yearStr, monthStr] = key.split('-');
    const monthIndex = parseInt(monthStr) - 1;
    return `${monthNames[monthIndex]} ${yearStr}`;
  };

  const handleCategoryChange = (id: string, categoryId: string | null) => {
    updateCategory.mutate({ id, categoryId });
  };

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
          <div className="space-y-4">
            {groupedByMonth.map(([monthKey, data]) => (
              <Collapsible 
                key={monthKey} 
                open={openMonths[monthKey] !== false}
                onOpenChange={() => toggleMonth(monthKey)}
              >
                <CollapsibleTrigger className="w-full">
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{getMonthLabel(monthKey)}</span>
                        <Badge variant="secondary" className="text-xs">
                          {data.income.length + data.expense.length} işlem
                        </Badge>
                      </div>
                      <ChevronDown className={cn(
                        "h-5 w-5 transition-transform",
                        openMonths[monthKey] !== false && "rotate-180"
                      )} />
                    </CardContent>
                  </Card>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="mt-2 space-y-3">
                  {/* Income Section */}
                  {data.income.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-700 dark:text-green-400">
                            Gelir ({data.income.length})
                          </span>
                        </div>
                        <span className="font-bold text-green-600">
                          +{formatCurrency(data.incomeTotal)} ₺
                        </span>
                      </div>
                      <div className="space-y-2 pl-2">
                        {data.income.map(tx => (
                          <TransactionCard 
                            key={tx.id} 
                            tx={tx} 
                            categories={grouped.all}
                            onCategoryChange={handleCategoryChange}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Expense Section */}
                  {data.expense.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-700 dark:text-red-400">
                            Gider ({data.expense.length})
                          </span>
                        </div>
                        <span className="font-bold text-red-600">
                          -{formatCurrency(data.expenseTotal)} ₺
                        </span>
                      </div>
                      <div className="space-y-2 pl-2">
                        {data.expense.map(tx => (
                          <TransactionCard 
                            key={tx.id} 
                            tx={tx} 
                            categories={grouped.all}
                            onCategoryChange={handleCategoryChange}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}
