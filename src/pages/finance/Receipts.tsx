import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Loader2, Plus, Receipt as ReceiptIcon, FileText, Building2, ArrowRightLeft, Trash2, Eye, LayoutGrid, Table as TableIcon, FileCheck } from 'lucide-react';
import { useReceipts } from '@/hooks/finance/useReceipts';
import { useCategories } from '@/hooks/finance/useCategories';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Receipt, ReceiptSubtype } from '@/types/finance';
import { MissingVatAlert } from '@/components/finance/MissingVatAlert';
import { ReceiptTable } from '@/components/finance/ReceiptTable';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

type ViewMode = 'card' | 'table';
type TabType = 'slip' | 'invoice' | 'issued';

interface ReceiptCardProps {
  receipt: Receipt;
  categories: { id: string; name: string; icon: string }[];
  onCategoryChange: (id: string, categoryId: string | null) => void;
  onToggleReport: (id: string, include: boolean) => void;
  onDelete: (id: string) => void;
}

function ReceiptCard({ receipt, categories, onCategoryChange, onToggleReport, onDelete }: ReceiptCardProps) {
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
          <Link to={`/finance/receipts/${receipt.id}`}>
            <div className="h-20 bg-muted rounded overflow-hidden relative cursor-pointer hover:opacity-90">
              <img src={receipt.thumbnail_url} alt="" className="w-full h-full object-cover" />
              {receipt.match_status === 'matched' && (
                <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
                  <ArrowRightLeft className="h-3 w-3" />
                </div>
              )}
            </div>
          </Link>
        ) : (
          <Link to={`/finance/receipts/${receipt.id}`}>
            <div className="h-20 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs relative cursor-pointer hover:bg-muted/80">
              <FileText className="h-6 w-6" />
              {receipt.match_status === 'matched' && (
                <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
                  <ArrowRightLeft className="h-3 w-3" />
                </div>
              )}
            </div>
          </Link>
        )}
        
        {/* Vendor/Buyer Info */}
        <div className="flex items-start gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
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
        
        {/* Actions Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={receipt.is_included_in_report}
              onCheckedChange={checked => onToggleReport(receipt.id, !!checked)}
            />
            <span className="text-xs">Rapora dahil</span>
          </div>
          <div className="flex items-center gap-1">
            <Link to={`/finance/receipts/${receipt.id}`}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Belgeyi Sil</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu belgeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(receipt.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Receipts() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<TabType>('slip');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isReprocessingAll, setIsReprocessingAll] = useState(false);
  
  const { 
    receipts, 
    isLoading, 
    updateCategory, 
    toggleIncludeInReport, 
    deleteReceipt,
    missingVatReceipts,
    reprocessMultiple,
    reprocessProgress,
    reprocessedCount,
    reprocessResults,
  } = useReceipts(year);
  
  const { grouped } = useCategories();

  // Filter receipts based on active tab
  const filteredReceipts = receipts.filter(r => {
    if (activeTab === 'issued') {
      return r.document_type === 'issued';
    }
    // For slip and invoice tabs, filter by document_type = received AND receipt_subtype
    if (r.document_type === 'issued') return false;
    const subtype = (r as any).receipt_subtype as ReceiptSubtype | undefined;
    if (activeTab === 'slip') {
      return subtype !== 'invoice'; // slip or undefined
    }
    return subtype === 'invoice';
  });

  // Calculate stats for each tab
  const tabStats = {
    slip: {
      count: receipts.filter(r => r.document_type !== 'issued' && (r as any).receipt_subtype !== 'invoice').length,
      total: receipts.filter(r => r.document_type !== 'issued' && (r as any).receipt_subtype !== 'invoice' && r.is_included_in_report)
        .reduce((sum, r) => sum + (r.total_amount || 0), 0),
    },
    invoice: {
      count: receipts.filter(r => r.document_type !== 'issued' && (r as any).receipt_subtype === 'invoice').length,
      total: receipts.filter(r => r.document_type !== 'issued' && (r as any).receipt_subtype === 'invoice' && r.is_included_in_report)
        .reduce((sum, r) => sum + (r.total_amount || 0), 0),
    },
    issued: {
      count: receipts.filter(r => r.document_type === 'issued').length,
      total: receipts.filter(r => r.document_type === 'issued' && r.is_included_in_report)
        .reduce((sum, r) => sum + (r.total_amount || 0), 0),
    }
  };

  // Categories based on tab
  const categories = activeTab === 'issued' ? grouped.income : grouped.expense;

  const handleReprocessAll = async () => {
    setIsReprocessingAll(true);
    try {
      await reprocessMultiple(missingVatReceipts.map(r => r.id));
    } finally {
      setIsReprocessingAll(false);
    }
  };

  const handleDelete = (id: string) => {
    deleteReceipt.mutate(id);
  };

  const getUploadUrl = () => {
    if (activeTab === 'issued') return '/finance/receipts/upload?type=issued';
    if (activeTab === 'invoice') return '/finance/receipts/upload?type=received&subtype=invoice';
    return '/finance/receipts/upload?type=received&subtype=slip';
  };

  const getEmptyMessage = () => {
    if (activeTab === 'slip') return 'Henüz fiş yok.';
    if (activeTab === 'invoice') return 'Henüz alınan fatura yok.';
    return 'Henüz kesilen fatura yok.';
  };

  const getUploadLabel = () => {
    if (activeTab === 'slip') return 'Fiş yükle';
    if (activeTab === 'invoice') return 'Fatura yükle';
    return 'Fatura yükle';
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

        {/* Tabs - 3 tabs now */}
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="slip" className="gap-1 text-xs sm:text-sm">
              <ReceiptIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Fiş</span> ({tabStats.slip.count})
            </TabsTrigger>
            <TabsTrigger value="invoice" className="gap-1 text-xs sm:text-sm">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Fatura</span> ({tabStats.invoice.count})
            </TabsTrigger>
            <TabsTrigger value="issued" className="gap-1 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Kesilen</span> ({tabStats.issued.count})
            </TabsTrigger>
          </TabsList>

          {/* Slip Tab Content */}
          <TabsContent value="slip" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Gider: {formatCurrency(tabStats.slip.total)}
              </p>
              <div className="flex items-center gap-2">
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                <Link to="/finance/receipts/upload?type=received&subtype=slip">
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Fiş Yükle
                  </Button>
                </Link>
              </div>
            </div>
          </TabsContent>

          {/* Invoice Tab Content */}
          <TabsContent value="invoice" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Gider: {formatCurrency(tabStats.invoice.total)}
              </p>
              <div className="flex items-center gap-2">
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                <Link to="/finance/receipts/upload?type=received&subtype=invoice">
                  <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Fatura Yükle
                  </Button>
                </Link>
              </div>
            </div>
          </TabsContent>

          {/* Issued Tab Content */}
          <TabsContent value="issued" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Gelir: {formatCurrency(tabStats.issued.total)}
              </p>
              <div className="flex items-center gap-2">
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                <Link to="/finance/receipts/upload?type=issued">
                  <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4" />
                    Yükle
                  </Button>
                </Link>
              </div>
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
              {getEmptyMessage()}
              <Link 
                to={getUploadUrl()} 
                className="block mt-2 text-primary underline"
              >
                {getUploadLabel()}
              </Link>
            </CardContent>
          </Card>
        ) : viewMode === 'table' ? (
          <ReceiptTable
            receipts={filteredReceipts}
            categories={categories}
            onCategoryChange={(id, categoryId) => updateCategory.mutate({ id, categoryId })}
            onToggleReport={(id, include) => toggleIncludeInReport.mutate({ id, include })}
            onDelete={handleDelete}
            isReceived={activeTab !== 'issued'}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredReceipts.map(receipt => (
              <ReceiptCard
                key={receipt.id}
                receipt={receipt}
                categories={categories}
                onCategoryChange={(id, categoryId) => updateCategory.mutate({ id, categoryId })}
                onToggleReport={(id, include) => toggleIncludeInReport.mutate({ id, include })}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}

// View Toggle Component
function ViewToggle({ viewMode, setViewMode }: { viewMode: ViewMode; setViewMode: (mode: ViewMode) => void }) {
  return (
    <div className="flex items-center border rounded-lg">
      <Button 
        variant={viewMode === 'card' ? 'secondary' : 'ghost'} 
        size="sm"
        className="h-8 px-2"
        onClick={() => setViewMode('card')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button 
        variant={viewMode === 'table' ? 'secondary' : 'ghost'} 
        size="sm"
        className="h-8 px-2"
        onClick={() => setViewMode('table')}
      >
        <TableIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
