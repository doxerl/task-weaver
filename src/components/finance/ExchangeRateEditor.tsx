import { useState, useCallback, useEffect } from 'react';
import { useExchangeRates } from '@/hooks/finance/useExchangeRates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, Loader2, Calculator, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export function ExchangeRateEditor() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { rates, upsertRate, isLoading, yearlyAverageRate } = useExchangeRates(selectedYear);
  const [editingRates, setEditingRates] = useState<Record<number, string>>({});
  const [savingMonth, setSavingMonth] = useState<number | null>(null);
  const [savedMonths, setSavedMonths] = useState<Set<number>>(new Set());
  
  // Available years
  const years = [currentYear - 1, currentYear, currentYear + 1];
  
  // Reset editing state when year changes
  useEffect(() => {
    setEditingRates({});
    setSavedMonths(new Set());
  }, [selectedYear]);
  
  // Debounced save function
  const saveRate = useCallback(async (month: number, rateValue: number) => {
    if (isNaN(rateValue) || rateValue <= 0) {
      return;
    }
    
    setSavingMonth(month);
    
    try {
      await upsertRate.mutateAsync({
        year: selectedYear,
        month,
        rate: rateValue,
        source: 'manual',
      });
      
      // Show saved indicator
      setSavedMonths(prev => new Set(prev).add(month));
      setTimeout(() => {
        setSavedMonths(prev => {
          const next = new Set(prev);
          next.delete(month);
          return next;
        });
      }, 2000);
      
      // Clear editing state for this month
      setEditingRates(prev => {
        const next = { ...prev };
        delete next[month];
        return next;
      });
    } catch (error) {
      toast.error('Kur kaydedilemedi');
    } finally {
      setSavingMonth(null);
    }
  }, [selectedYear, upsertRate]);
  
  // Handle input change with debounce
  const handleRateChange = useCallback((month: number, value: string) => {
    setEditingRates(prev => ({ ...prev, [month]: value }));
  }, []);
  
  // Handle blur to save
  const handleBlur = useCallback((month: number) => {
    const value = editingRates[month];
    if (value !== undefined) {
      const rate = parseFloat(value.replace(',', '.'));
      if (!isNaN(rate) && rate > 0) {
        saveRate(month, rate);
      }
    }
  }, [editingRates, saveRate]);
  
  // Get rate value for display
  const getRateValue = (month: number): string => {
    // If editing, show edited value
    if (editingRates[month] !== undefined) {
      return editingRates[month];
    }
    // Otherwise show saved value
    const rate = rates.find(r => r.month === month);
    return rate ? rate.rate.toString() : '';
  };
  
  // Get source for a month
  const getSource = (month: number): string | null => {
    const rate = rates.find(r => r.month === month);
    return rate?.source || null;
  };
  
  // Count filled months
  const filledMonths = rates.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Year Selector */}
      <div className="flex gap-2">
        {years.map(y => (
          <Button
            key={y}
            variant={selectedYear === y ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedYear(y)}
          >
            {y}
          </Button>
        ))}
      </div>
      
      {/* Status */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {filledMonths === 12 ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-amber-500" />
        )}
        <span>{filledMonths}/12 ay kur verisi girilmiş</span>
      </div>
      
      {/* Rate Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Ay</TableHead>
              <TableHead className="w-32">Kur (TL)</TableHead>
              <TableHead className="w-20">Kaynak</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MONTH_NAMES.map((monthName, idx) => {
              const month = idx + 1;
              const isSaving = savingMonth === month;
              const isSaved = savedMonths.has(month);
              const source = getSource(month);
              const hasRate = !!source;
              
              return (
                <TableRow key={month}>
                  <TableCell className="font-medium">{monthName}</TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="w-28 h-8 text-sm"
                      value={getRateValue(month)}
                      onChange={(e) => handleRateChange(month, e.target.value)}
                      onBlur={() => handleBlur(month)}
                      placeholder="0.0000"
                      disabled={isSaving}
                    />
                  </TableCell>
                  <TableCell>
                    {source && (
                      <Badge variant="outline" className="text-xs">
                        {source === 'manual' ? 'Manuel' : source}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : isSaved ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : hasRate ? (
                      <Check className="h-4 w-4 text-muted-foreground/30" />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Yearly Average */}
      {yearlyAverageRate && (
        <div className="flex items-center gap-2 text-sm p-3 bg-muted/50 rounded-lg">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Yıllık Ortalama:</span>
          <span className="font-medium">{yearlyAverageRate.toFixed(4)} TL/USD</span>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        Her ay için aylık ortalama USD/TRY kurunu girin. Bu kurlar finansal raporların USD cinsinden gösteriminde kullanılacaktır.
      </p>
    </div>
  );
}
