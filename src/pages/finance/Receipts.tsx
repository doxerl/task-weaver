import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';
import { useReceipts } from '@/hooks/finance/useReceipts';
import { useCategories } from '@/hooks/finance/useCategories';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

export default function Receipts() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { receipts, isLoading, updateCategory, toggleIncludeInReport, stats } = useReceipts(year);
  const { grouped } = useCategories();

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">Fiş/Faturalar</h1>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {stats.includedInReport}/{stats.total} rapora dahil • {formatCurrency(stats.totalAmount)}
          </p>
          <Link to="/finance/receipts/upload">
            <button className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm">
              <Plus className="h-4 w-4" />
              Yükle
            </button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : receipts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Henüz fiş yok.
              <Link to="/finance/receipts/upload" className="block mt-2 text-primary underline">
                Fiş yükle
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {receipts.map(receipt => (
              <Card key={receipt.id} className={cn(receipt.is_included_in_report && "ring-2 ring-green-500")}>
                <CardContent className="p-3 space-y-2">
                  {receipt.thumbnail_url ? (
                    <div className="h-24 bg-muted rounded overflow-hidden">
                      <img src={receipt.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                      PDF
                    </div>
                  )}
                  
                  <p className="text-sm font-medium truncate">{receipt.vendor_name || 'Bilinmiyor'}</p>
                  <p className="text-lg font-bold">{formatCurrency(receipt.total_amount || 0)}</p>
                  
                  <Select
                    value={receipt.category_id || ''}
                    onValueChange={categoryId => updateCategory.mutate({ id: receipt.id, categoryId: categoryId || null })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Kategori..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grouped.expense.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={receipt.is_included_in_report}
                      onCheckedChange={checked => 
                        toggleIncludeInReport.mutate({ id: receipt.id, include: !!checked })
                      }
                    />
                    <span className="text-xs">Rapora dahil</span>
                  </div>
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
