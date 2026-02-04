import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useYear } from '@/contexts/YearContext';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, X, Trash2, FileX, ChevronDown, Check, Shield } from 'lucide-react';
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
import { useOfficialDataStatus } from '@/hooks/finance/useOfficialDataStatus';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { BankTransaction, TransactionCategory } from '@/types/finance';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(Math.round(Math.abs(n)));
const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR');

const monthNames = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

interface GroupedCategories {
  income: TransactionCategory[];
  expense: TransactionCategory[];
  partner: TransactionCategory[];
  financing: TransactionCategory[];
  investment: TransactionCategory[];
  excluded: TransactionCategory[];
}

interface TransactionCardProps {
  tx: BankTransaction;
  grouped: GroupedCategories;
  onCategoryChange: (id: string, categoryId: string | null) => void;
  onDelete: (id: string) => void;
  onToggleExcluded: (id: string, isExcluded: boolean) => void;
}

function TransactionCard({ tx, grouped, onCategoryChange, onDelete, onToggleExcluded }: TransactionCardProps) {
  const isIncome = tx.amount > 0;
  
  // Calculate VAT if not stored
  const vatAmount = tx.vat_amount ?? (tx.is_commercial !== false ? Math.abs(tx.amount) - Math.abs(tx.amount) / 1.20 : 0);
  const netAmount = tx.net_amount ?? (tx.is_commercial !== false ? Math.abs(tx.amount) / 1.20 : Math.abs(tx.amount));
  
  // Ortak kategorilerini gelir/gider durumuna göre filtrele
  const filteredPartner = grouped.partner.filter(cat => {
    const nameLower = cat.name.toLowerCase();
    if (isIncome) {
      // Gelir için: Tahsilat, Alınan, İade gibi kelimeler
      return nameLower.includes('tahsilat') || nameLower.includes('alınan') || nameLower.includes('iade');
    } else {
      // Gider için: Ödeme, Verilen gibi kelimeler
      return nameLower.includes('ödeme') || nameLower.includes('verilen');
    }
  });

  return (
    <Card className={cn(
      !tx.category_id && "ring-2 ring-amber-400",
      tx.is_excluded && "opacity-60 bg-muted/50"
    )}>
      <CardContent className="p-3">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{formatDate(tx.transaction_date)}</p>
              {tx.is_excluded && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-orange-100 text-orange-700 border-orange-300">
                  <FileX className="h-3 w-3 mr-0.5" />
                  Tahakkuk
                </Badge>
              )}
              {tx.is_commercial === false && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground">
                  Ticari Dışı
                </Badge>
              )}
            </div>
            <p className="text-sm truncate">{tx.description}</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="text-right">
              <p className={cn("font-bold", tx.amount > 0 ? "text-green-600" : "text-red-600")}>
                {tx.amount > 0 ? '+' : '-'}{formatCurrency(tx.amount)} ₺
              </p>
              {tx.is_commercial !== false && (
                <div className="text-[10px] text-muted-foreground">
                  <span className="text-purple-600">KDV: {formatCurrency(vatAmount)} ₺</span>
                  <span className="mx-1">|</span>
                  <span>Net: {formatCurrency(netAmount)} ₺</span>
                </div>
              )}
              {tx.ai_confidence > 0 && (
                <Badge variant="secondary" className="text-xs mt-1">
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
            {/* Ana Kategori - Gelir veya Gider */}
            <SelectGroup>
              <SelectLabel>{isIncome ? '📥 Gelir' : '📤 Gider'}</SelectLabel>
              {(isIncome ? grouped.income : grouped.expense).map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>

            {/* Ortak İşlemleri - Filtrelenmiş */}
            {filteredPartner.length > 0 && (
              <SelectGroup>
                <SelectLabel>{isIncome ? '🤝 Ortaktan Alınan' : '🤝 Ortağa Verilen'}</SelectLabel>
                {filteredPartner.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {/* Finansman - Sadece gelir için */}
            {isIncome && grouped.financing.length > 0 && (
              <SelectGroup>
                <SelectLabel>🏦 Finansman</SelectLabel>
                {grouped.financing.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {/* Mevduat/Yatırım */}
            {grouped.investment.length > 0 && (
              <SelectGroup>
                <SelectLabel>💰 Mevduat/Yatırım</SelectLabel>
                {grouped.investment.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {/* Hariç Tut */}
            {grouped.excluded.length > 0 && (
              <SelectGroup>
                <SelectLabel>🚫 Hariç Tut</SelectLabel>
                {grouped.excluded.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
        
        {/* Tahakkuk Toggle */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <FileX className="h-3 w-3" />
            Banka ekstresinde yok (Tahakkuk)
          </span>
          <Switch
            checked={tx.is_excluded || false}
            onCheckedChange={(checked) => onToggleExcluded(tx.id, checked)}
            className="scale-75"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function BankTransactions() {
  const { selectedYear: year, setSelectedYear: setYear } = useYear();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [commercialFilter, setCommercialFilter] = useState<string>('all');
  const [excludedFilter, setExcludedFilter] = useState<string>('all');
  
  const { transactions, isLoading, updateCategory, deleteTransaction, deleteAllTransactions, toggleExcluded, stats } = useBankTransactions(year);
  const { grouped } = useCategories();
  const { isAnyLocked } = useOfficialDataStatus(year);

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

  // Filter transactions by month, category, and commercial status
  const filteredTransactions = useMemo(() => {
    let result = transactions;
    
    if (selectedMonth !== 'all') {
      result = result.filter(tx => {
        const date = new Date(tx.transaction_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === selectedMonth;
      });
    }
    
    if (selectedCategories.includes('uncategorized')) {
      result = result.filter(tx => !tx.category_id);
    } else if (selectedCategories.length > 0) {
      result = result.filter(tx => tx.category_id && selectedCategories.includes(tx.category_id));
    }
    
    if (commercialFilter === 'commercial') {
      result = result.filter(tx => tx.is_commercial !== false);
    } else if (commercialFilter === 'non-commercial') {
      result = result.filter(tx => tx.is_commercial === false);
    }
    
    if (excludedFilter === 'excluded') {
      result = result.filter(tx => tx.is_excluded === true);
    } else if (excludedFilter === 'included') {
      result = result.filter(tx => tx.is_excluded !== true);
    }
    
    return result;
  }, [transactions, selectedMonth, selectedCategories, commercialFilter, excludedFilter]);

  // Calculate summary for filtered transactions
  const summary = useMemo(() => {
    const income = filteredTransactions.filter(tx => tx.amount > 0);
    const expense = filteredTransactions.filter(tx => tx.amount < 0);
    
    // Brüt toplamlar (KDV dahil)
    const incomeTotal = income.reduce((sum, tx) => sum + tx.amount, 0);
    const expenseTotal = expense.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const uncategorized = filteredTransactions.filter(tx => !tx.category_id).length;
    
    // Ticari / Ticari dışı ayrımı
    const commercialIncome = income.filter(tx => tx.is_commercial !== false);
    const nonCommercialIncome = income.filter(tx => tx.is_commercial === false);
    const commercialExpense = expense.filter(tx => tx.is_commercial !== false);
    const nonCommercialExpense = expense.filter(tx => tx.is_commercial === false);
    
    // Net toplamlar (KDV hariç) - Ticari işlemlerden KDV ayrıştır
    const incomeNetTotal = commercialIncome.reduce((sum, tx) => {
      const net = tx.net_amount ?? (tx.amount / 1.20);
      return sum + net;
    }, 0) + nonCommercialIncome.reduce((sum, tx) => sum + tx.amount, 0);
    
    const expenseNetTotal = commercialExpense.reduce((sum, tx) => {
      const net = tx.net_amount ?? (Math.abs(tx.amount) / 1.20);
      return sum + net;
    }, 0) + nonCommercialExpense.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    // KDV hesaplamaları
    const vatCalculated = commercialIncome.reduce((sum, tx) => {
      return sum + (tx.vat_amount ?? (tx.amount - tx.amount / 1.20));
    }, 0);
    const vatDeductible = commercialExpense.reduce((sum, tx) => {
      const absAmount = Math.abs(tx.amount);
      return sum + (tx.vat_amount ?? (absAmount - absAmount / 1.20));
    }, 0);
    
    return {
      income,
      expense,
      incomeTotal,       // Brüt gelir (KDV dahil)
      expenseTotal,      // Brüt gider (KDV dahil)
      incomeNetTotal,    // Net gelir (KDV hariç)
      expenseNetTotal,   // Net gider (KDV hariç)
      net: incomeNetTotal - expenseNetTotal,  // Net kazanç (KDV hariç)
      uncategorized,
      vatCalculated,
      vatDeductible,
      vatNet: vatCalculated - vatDeductible
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

  const handleToggleExcluded = (id: string, isExcluded: boolean) => {
    toggleExcluded.mutate({ id, isExcluded });
  };

  const handleDeleteAll = () => {
    deleteAllTransactions.mutate();
  };

  const clearFilters = () => {
    setSelectedMonth('all');
    setSelectedCategories([]);
    setCommercialFilter('all');
    setExcludedFilter('all');
  };

  const toggleCategory = (catId: string) => {
    if (catId === 'uncategorized') {
      // "Kategorisiz" seçildiğinde diğerlerini temizle
      setSelectedCategories(prev => 
        prev.includes('uncategorized') ? [] : ['uncategorized']
      );
    } else {
      setSelectedCategories(prev => {
        // Kategorisiz varsa kaldır
        const filtered = prev.filter(id => id !== 'uncategorized');
        if (filtered.includes(catId)) {
          return filtered.filter(id => id !== catId);
        } else {
          return [...filtered, catId];
        }
      });
    }
  };

  const hasActiveFilters = selectedMonth !== 'all' || selectedCategories.length > 0 || commercialFilter !== 'all' || excludedFilter !== 'all';

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Official Data Lock Warning */}
        {isAnyLocked && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Resmi veri modu aktif. Banka işlemleri hesaplamalara dahil edilmiyor.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 hover:bg-accent rounded-lg">
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
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tüm Aylar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Aylar</SelectItem>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{getMonthLabel(m)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Filter - Multi Select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[160px] justify-between h-10 px-3">
                {selectedCategories.length === 0 
                  ? 'Tüm Kategoriler' 
                  : `${selectedCategories.length} Kategori`
                }
                <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-2 max-h-[320px] overflow-auto bg-popover" align="start">
              {selectedCategories.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mb-2 text-muted-foreground"
                  onClick={() => setSelectedCategories([])}
                >
                  <X className="h-4 w-4 mr-1" /> Temizle
                </Button>
              )}
              
              {/* Kategorisiz */}
              <div 
                className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                onClick={() => toggleCategory('uncategorized')}
              >
                <Checkbox 
                  checked={selectedCategories.includes('uncategorized')}
                  onCheckedChange={() => toggleCategory('uncategorized')}
                />
                <span className="text-sm">⚠️ Kategorisiz</span>
              </div>
              
              <div className="my-2 border-t border-border" />
              
              {/* Kategoriler */}
              {grouped.all.map(cat => (
                <div 
                  key={cat.id}
                  className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer"
                  onClick={() => toggleCategory(cat.id)}
                >
                  <Checkbox 
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => toggleCategory(cat.id)}
                  />
                  <span className="text-sm truncate">{cat.icon} {cat.name}</span>
                </div>
              ))}
            </PopoverContent>
          </Popover>

          {/* Commercial Filter */}
          <Select value={commercialFilter} onValueChange={setCommercialFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Ticari" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="commercial">🏢 Ticari</SelectItem>
              <SelectItem value="non-commercial">👤 Ticari Dışı</SelectItem>
            </SelectContent>
          </Select>

          {/* Excluded Filter */}
          <Select value={excludedFilter} onValueChange={setExcludedFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Kaynak" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="included">📄 Banka Ekstresi</SelectItem>
              <SelectItem value="excluded">📝 Tahakkuk</SelectItem>
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
            {selectedCategories.map(catId => {
              const cat = grouped.all.find(c => c.id === catId);
              const label = catId === 'uncategorized' 
                ? '⚠️ Kategorisiz' 
                : `${cat?.icon || ''} ${cat?.name || catId}`;
              return (
                <Badge key={catId} variant="secondary" className="gap-1">
                  {label}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSelectedCategories(prev => prev.filter(id => id !== catId))}
                  />
                </Badge>
              );
            })}
            {commercialFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {commercialFilter === 'commercial' ? '🏢 Ticari' : '👤 Ticari Dışı'}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => setCommercialFilter('all')}
                />
              </Badge>
            )}
            {excludedFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                {excludedFilter === 'excluded' ? '📝 Tahakkuk' : '📄 Banka Ekstresi'}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => setExcludedFilter('all')}
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
        <div className="flex gap-2 text-sm flex-wrap">
          <Badge variant="outline">{filteredTransactions.length} işlem</Badge>
          {summary.uncategorized > 0 && (
            <Badge variant="destructive">{summary.uncategorized} kategorisiz</Badge>
          )}
          {filteredTransactions.filter(tx => tx.is_excluded).length > 0 && (
            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
              {filteredTransactions.filter(tx => tx.is_excluded).length} tahakkuk
            </Badge>
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
                  <Link to="/bank-import" className="block mt-2 text-primary underline">
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
                    <p className="text-xs text-muted-foreground mb-1">💰 Gelir (Brüt)</p>
                    <p className="font-bold text-green-600">+{formatCurrency(summary.incomeTotal)} ₺</p>
                    <p className="text-[10px] text-muted-foreground">
                      Net: {formatCurrency(summary.incomeNetTotal)} ₺
                    </p>
                    <p className="text-xs text-muted-foreground">{summary.income.length} işlem</p>
                  </div>
                  <div className="text-center border-x border-border">
                    <p className="text-xs text-muted-foreground mb-1">💸 Gider (Brüt)</p>
                    <p className="font-bold text-red-600">-{formatCurrency(summary.expenseTotal)} ₺</p>
                    <p className="text-[10px] text-muted-foreground">
                      Net: {formatCurrency(summary.expenseNetTotal)} ₺
                    </p>
                    <p className="text-xs text-muted-foreground">{summary.expense.length} işlem</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">📈 Net Kazanç</p>
                    <p className={cn("font-bold", summary.net >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {summary.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.net))} ₺
                    </p>
                    <p className="text-[10px] text-muted-foreground">(KDV Hariç)</p>
                  </div>
                </div>
                
                {/* VAT Summary */}
                {(summary.vatCalculated > 0 || summary.vatDeductible > 0) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">🧾 KDV Özeti (Ticari İşlemler)</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Hesaplanan</p>
                        <p className="text-sm font-semibold text-red-500">{formatCurrency(summary.vatCalculated)} ₺</p>
                      </div>
                      <div className="text-center border-x border-border">
                        <p className="text-[10px] text-muted-foreground">İndirilecek</p>
                        <p className="text-sm font-semibold text-blue-500">{formatCurrency(summary.vatDeductible)} ₺</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-muted-foreground">Net KDV</p>
                        <p className={cn("text-sm font-semibold", summary.vatNet >= 0 ? "text-red-600" : "text-green-600")}>
                          {formatCurrency(Math.abs(summary.vatNet))} ₺
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                      grouped={grouped}
                      onCategoryChange={handleCategoryChange}
                      onDelete={handleDelete}
                      onToggleExcluded={handleToggleExcluded}
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
                      grouped={grouped}
                      onCategoryChange={handleCategoryChange}
                      onDelete={handleDelete}
                      onToggleExcluded={handleToggleExcluded}
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
