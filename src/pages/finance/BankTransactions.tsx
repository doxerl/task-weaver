import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, X, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  onDelete: (id: string) => void;
}

function TransactionCard({ tx, categories, onCategoryChange, onDelete }: TransactionCardProps) {
  return (
    <Card className={cn(!tx.category_id && "ring-2 ring-amber-400")}>
      <CardContent className="p-3">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{formatDate(tx.transaction_date)}</p>
            <p className="text-sm truncate">{tx.description}</p>
          </div>
          <div className="flex items-start gap-2">
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>İşlemi Sil</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{tx.description}" işlemini silmek istediğinize emin misiniz?
                    <br /><br />
                    <strong>Bu işlem geri alınamaz.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(tx.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const { transactions, isLoading, updateCategory, deleteTransaction, deleteAllTransactions, stats } = useBankTransactions(year);
  const { grouped } = useCategories();

  // Get available months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(tx => {
      const date = new Date(tx.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Filter transactions by month and category
  const filteredTransactions = useMemo(() => {
    let result = transactions;
    
    if (selectedMonth !== 'all') {
      result = result.filter(tx => {
        const date = new Date(tx.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === selectedMonth;
      });
    }
    
    if (categoryFilter === 'uncategorized') {
      result = result.filter(tx => !tx.category_id);
    } else if (categoryFilter !== 'all') {
      result = result.filter(tx => tx.category_id === categoryFilter);
    }
    
    return result;
  }, [transactions, selectedMonth, categoryFilter]);

  // Calculate summary for filtered transactions
  const summary = useMemo(() => {
    const income = filteredTransactions.filter(tx => tx.amount > 0);
    const expense = filteredTransactions.filter(tx => tx.amount < 0);
    const incomeTotal = income.reduce((sum, tx) => sum + tx.amount, 0);
    const expenseTotal = expense.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const uncategorized = filteredTransactions.filter(tx => !tx.category_id).length;
    
    return {
      income,
      expense,
      incomeTotal,
      expenseTotal,
      net: incomeTotal - expenseTotal,
      uncategorized
    };
  }, [filteredTransactions]);

  const getMonthLabel = (key: string) => {
    const [yearStr, monthStr] = key.split('-');
    const monthIndex = parseInt(monthStr) - 1;
    return `${monthNames[monthIndex]} ${yearStr}`;
  };

  const handleCategoryChange = (id: string, categoryId: string | null) => {
    updateCategory.mutate({ id, categoryId });
  };

  const handleDelete = (id: string) => {
    deleteTransaction.mutate(id);
  };

  const handleDeleteAll = () => {
    deleteAllTransactions.mutate();
  };

  const clearFilters = () => {
    setSelectedMonth('all');
    setCategoryFilter('all');
  };

  const hasActiveFilters = selectedMonth !== 'all' || categoryFilter !== 'all';

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">Banka İşlemleri</h1>
          
          {transactions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1">
                  <Trash2 className="h-4 w-4" />
                  Tümünü Sil
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>⚠️ Tüm Veritabanını Temizle</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      <strong>{stats.total} işlem</strong> ve ilgili tüm yüklenen dosyalar kalıcı olarak silinecek.
                    </p>
                    <p className="text-destructive font-semibold">
                      Bu işlem GERİ ALINAMAZ!
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteAllTransactions.isPending}
                  >
                    {deleteAllTransactions.isPending ? 'Siliniyor...' : 'Tümünü Sil'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2">
          {/* Month Selector */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tüm Aylar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Aylar</SelectItem>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{getMonthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tüm Kategoriler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kategoriler</SelectItem>
              <SelectItem value="uncategorized">⚠️ Kategorisiz</SelectItem>
              {grouped.all.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Selector */}
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Aktif:</span>
            {selectedMonth !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {getMonthLabel(selectedMonth)}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => setSelectedMonth('all')}
                />
              </Badge>
            )}
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {categoryFilter === 'uncategorized' 
                  ? 'Kategorisiz' 
                  : grouped.all.find(c => c.id === categoryFilter)?.name || categoryFilter
                }
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => setCategoryFilter('all')}
                />
              </Badge>
            )}
            <button 
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={clearFilters}
            >
              Temizle
            </button>
          </div>
        )}

        {/* Stats Badge */}
        <div className="flex gap-2 text-sm">
          <Badge variant="outline">{filteredTransactions.length} işlem</Badge>
          {summary.uncategorized > 0 && (
            <Badge variant="destructive">{summary.uncategorized} kategorisiz</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {hasActiveFilters ? (
                <>
                  Filtrelere uygun işlem bulunamadı.
                  <button 
                    className="block mt-2 text-primary underline mx-auto"
                    onClick={clearFilters}
                  >
                    Filtreleri temizle
                  </button>
                </>
              ) : (
                <>
                  Henüz işlem yok.
                  <Link to="/finance/bank-import" className="block mt-2 text-primary underline">
                    Banka ekstresi yükle
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Monthly Summary Card */}
            <Card className="bg-gradient-to-r from-muted/50 to-muted/30">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  📊 {selectedMonth !== 'all' ? getMonthLabel(selectedMonth) : year} Özeti
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">💰 Gelir</p>
                    <p className="font-bold text-green-600">+{formatCurrency(summary.incomeTotal)} ₺</p>
                    <p className="text-xs text-muted-foreground">{summary.income.length} işlem</p>
                  </div>
                  <div className="text-center border-x border-border">
                    <p className="text-xs text-muted-foreground mb-1">💸 Gider</p>
                    <p className="font-bold text-red-600">-{formatCurrency(summary.expenseTotal)} ₺</p>
                    <p className="text-xs text-muted-foreground">{summary.expense.length} işlem</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">📈 Net</p>
                    <p className={cn("font-bold", summary.net >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {summary.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.net))} ₺
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Income Section */}
            {summary.income.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/30 border-l-4 border-green-500">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      Gelir ({summary.income.length})
                    </span>
                  </div>
                  <span className="font-bold text-green-600">
                    +{formatCurrency(summary.incomeTotal)} ₺
                  </span>
                </div>
                <div className="space-y-2 pl-2">
                  {summary.income.map(tx => (
                    <TransactionCard 
                      key={tx.id} 
                      tx={tx} 
                      categories={grouped.all}
                      onCategoryChange={handleCategoryChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Expense Section */}
            {summary.expense.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-700 dark:text-red-400">
                      Gider ({summary.expense.length})
                    </span>
                  </div>
                  <span className="font-bold text-red-600">
                    -{formatCurrency(summary.expenseTotal)} ₺
                  </span>
                </div>
                <div className="space-y-2 pl-2">
                  {summary.expense.map(tx => (
                    <TransactionCard 
                      key={tx.id} 
                      tx={tx} 
                      categories={grouped.all}
                      onCategoryChange={handleCategoryChange}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}
