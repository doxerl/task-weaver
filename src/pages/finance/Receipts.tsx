import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Plus, Receipt as ReceiptIcon, FileText, Building2, ArrowRightLeft } from 'lucide-react';
import { useReceipts } from '@/hooks/finance/useReceipts';
import { useCategories } from '@/hooks/finance/useCategories';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { DocumentType, Receipt } from '@/types/finance';
import { MissingVatAlert } from '@/components/finance/MissingVatAlert';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

interface ReceiptCardProps {
  receipt: Receipt;
  categories: { id: string; name: string; icon: string }[];
  onCategoryChange: (id: string, categoryId: string | null) => void;
  onToggleReport: (id: string, include: boolean) => void;
}

function ReceiptCard({ receipt, categories, onCategoryChange, onToggleReport }: ReceiptCardProps) {
  const isReceived = receipt.document_type !== 'issued';
  const displayName = isReceived 
    ? (receipt.seller_name || receipt.vendor_name || 'Bilinmiyor')
    : (receipt.buyer_name || 'Bilinmiyor');
  
  return (
    <Card className={cn(
      receipt.is_included_in_report && "ring-2 ring-green-500",
      receipt.match_status === 'matched' && "ring-2 ring-blue-500"
    )}>
      <CardContent className="p-3 space-y-2">
        {/* Thumbnail */}
        {receipt.thumbnail_url ? (
          <div className="h-20 bg-muted rounded overflow-hidden relative">
            <img src={receipt.thumbnail_url} alt="" className="w-full h-full object-cover" />
            {receipt.match_status === 'matched' && (
              <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
                <ArrowRightLeft className="h-3 w-3" />
              </div>
            )}
          </div>
        ) : (
          <div className="h-20 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs relative">
            <FileText className="h-6 w-6" />
            {receipt.match_status === 'matched' && (
              <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
                <ArrowRightLeft className="h-3 w-3" />
              </div>
            )}
          </div>
        )}
        
        {/* Vendor/Buyer Info */}
        <div className="flex items-start gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            {(receipt.seller_tax_no || receipt.vendor_tax_no) && (
              <p className="text-xs text-muted-foreground">
                VKN: {receipt.seller_tax_no || receipt.vendor_tax_no}
              </p>
            )}
          </div>
        </div>
        
        {/* Amount Breakdown */}
        <div className="space-y-1 text-xs">
          {receipt.subtotal && (
            <div className="flex justify-between text-muted-foreground">
              <span>Ara Toplam:</span>
              <span>{formatCurrency(receipt.subtotal)}</span>
            </div>
          )}
          {receipt.vat_amount && (
            <div className="flex justify-between text-muted-foreground">
              <span>KDV {receipt.vat_rate ? `(%${receipt.vat_rate})` : ''}:</span>
              <span>{formatCurrency(receipt.vat_amount)}</span>
            </div>
          )}
          {receipt.withholding_tax_amount && (
            <div className="flex justify-between text-muted-foreground">
              <span>Stopaj:</span>
              <span>-{formatCurrency(receipt.withholding_tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-1 border-t">
            <span>Toplam:</span>
            <span className={isReceived ? "text-destructive" : "text-green-600"}>
              {isReceived ? '-' : '+'}{formatCurrency(receipt.total_amount || 0)}
            </span>
          </div>
        </div>
        
        {/* Category Select */}
        <Select
          value={receipt.category_id || ''}
          onValueChange={categoryId => onCategoryChange(receipt.id, categoryId || null)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Kategori..." />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Include in Report */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={receipt.is_included_in_report}
            onCheckedChange={checked => onToggleReport(receipt.id, !!checked)}
          />
          <span className="text-xs">Rapora dahil</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Receipts() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<DocumentType>('received');
  const [isReprocessingAll, setIsReprocessingAll] = useState(false);
  
  const { 
    receipts, 
    isLoading, 
    updateCategory, 
    toggleIncludeInReport, 
    missingVatReceipts,
    reprocessMultiple,
    reprocessProgress,
    reprocessedCount,
    reprocessResults,
  } = useReceipts(year);
  
  const { grouped } = useCategories();

  const filteredReceipts = receipts.filter(r => 
    activeTab === 'received' 
      ? r.document_type !== 'issued' 
      : r.document_type === 'issued'
  );

  const tabStats = {
    received: {
      count: receipts.filter(r => r.document_type !== 'issued').length,
      total: receipts.filter(r => r.document_type !== 'issued' && r.is_included_in_report)
        .reduce((sum, r) => sum + (r.total_amount || 0), 0),
    },
    issued: {
      count: receipts.filter(r => r.document_type === 'issued').length,
      total: receipts.filter(r => r.document_type === 'issued' && r.is_included_in_report)
        .reduce((sum, r) => sum + (r.total_amount || 0), 0),
    }
  };

  const categories = activeTab === 'received' ? grouped.expense : grouped.income;

  const handleReprocessAll = async () => {
    setIsReprocessingAll(true);
    try {
      await reprocessMultiple(missingVatReceipts.map(r => r.id));
    } finally {
      setIsReprocessingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
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

        {/* Missing VAT Alert */}
        <MissingVatAlert
          receipts={missingVatReceipts}
          onReprocess={handleReprocessAll}
          isProcessing={isReprocessingAll}
          progress={reprocessProgress}
          processedCount={reprocessedCount}
          results={reprocessResults}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as DocumentType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received" className="gap-2">
              <ReceiptIcon className="h-4 w-4" />
              Alınan ({tabStats.received.count})
            </TabsTrigger>
            <TabsTrigger value="issued" className="gap-2">
              <FileText className="h-4 w-4" />
              Kesilen ({tabStats.issued.count})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Gider: {formatCurrency(tabStats.received.total)}
              </p>
              <Link to="/finance/receipts/upload?type=received">
                <button className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm">
                  <Plus className="h-4 w-4" />
                  Yükle
                </button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="issued" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Gelir: {formatCurrency(tabStats.issued.total)}
              </p>
              <Link to="/finance/receipts/upload?type=issued">
                <button className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm">
                  <Plus className="h-4 w-4" />
                  Yükle
                </button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>

        {/* Receipt List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredReceipts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {activeTab === 'received' ? 'Henüz alınan fiş/fatura yok.' : 'Henüz kesilen fatura yok.'}
              <Link 
                to={`/finance/receipts/upload?type=${activeTab}`} 
                className="block mt-2 text-primary underline"
              >
                {activeTab === 'received' ? 'Fiş/Fatura yükle' : 'Fatura yükle'}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredReceipts.map(receipt => (
              <ReceiptCard
                key={receipt.id}
                receipt={receipt}
                categories={categories}
                onCategoryChange={(id, categoryId) => updateCategory.mutate({ id, categoryId })}
                onToggleReport={(id, include) => toggleIncludeInReport.mutate({ id, include })}
              />
            ))}
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}