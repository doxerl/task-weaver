import { useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useYear } from '@/contexts/YearContext';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Loader2, Plus, Receipt as ReceiptIcon, FileText, Building2, ArrowRightLeft, Trash2, Eye, LayoutGrid, Table as TableIcon, FileCheck, Download, ChevronDown, Globe, Shield, Upload } from 'lucide-react';
import { useReceipts } from '@/hooks/finance/useReceipts';
import { useCategories } from '@/hooks/finance/useCategories';
import { useOfficialDataStatus } from '@/hooks/finance/useOfficialDataStatus';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Receipt, ReceiptSubtype, DocumentType } from '@/types/finance';
import { MissingVatAlert } from '@/components/finance/MissingVatAlert';
import { ReceiptTable } from '@/components/finance/ReceiptTable';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const formatCurrency = (n: number, currency: string = 'TRY') => {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }
  if (currency === 'EUR') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
  }
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
};

type ViewMode = 'card' | 'table';
type TabType = 'slip' | 'invoice' | 'issued';
type ExportFilter = 'all' | 'slip' | 'invoice' | 'issued' | 'foreign' | 'domestic';

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
        
        {/* Amount Breakdown - Her zaman TRY göster */}
        <div className="space-y-1 text-xs">
          {(receipt.subtotal_try || receipt.subtotal) && (
            <div className="flex justify-between text-muted-foreground">
              <span>Ara Toplam:</span>
              <span>{formatCurrency(receipt.subtotal_try || receipt.subtotal || 0, 'TRY')}</span>
            </div>
          )}
          {receipt.is_foreign_invoice ? (
            <div className="flex justify-between text-muted-foreground">
              <span>KDV:</span>
              <span>%0</span>
            </div>
          ) : (receipt.vat_amount_try || receipt.vat_amount) ? (
            <div className="flex justify-between text-muted-foreground">
              <span>KDV {receipt.vat_rate ? `(%${receipt.vat_rate})` : ''}:</span>
              <span>{formatCurrency(receipt.vat_amount_try || receipt.vat_amount || 0, 'TRY')}</span>
            </div>
          ) : null}
          {receipt.withholding_tax_amount && (
            <div className="flex justify-between text-muted-foreground">
              <span>Stopaj:</span>
              <span>-{formatCurrency(receipt.withholding_tax_amount, 'TRY')}</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-1 border-t">
            <span>Toplam:</span>
            <div className={cn("text-right", isReceived ? "text-destructive" : "text-green-600")}>
              {isReceived ? '-' : '+'}{formatCurrency(receipt.amount_try || receipt.total_amount || 0, 'TRY')}
              {receipt.currency && receipt.currency !== 'TRY' && receipt.total_amount && (
                <span className="block text-xs text-muted-foreground font-normal">
                  ({formatCurrency(receipt.total_amount, receipt.currency)})
                </span>
              )}
            </div>
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
  const { selectedYear: year, setSelectedYear: setYear } = useYear();
  const [activeTab, setActiveTab] = useState<TabType>('slip');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isReprocessingAll, setIsReprocessingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { isAnyLocked } = useOfficialDataStatus(year);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    uploadReceipt,
    uploadReceiptsBatch,
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

  const handleExportExcel = async (filter: ExportFilter) => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-receipts', {
        body: { year, filter }
      });
      
      if (error) throw error;
      
      // Download file
      const binaryString = atob(data.xlsxBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.filename}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({ 
        title: 'Excel dosyası indirildi',
        description: `${data.stats.total} kayıt export edildi`
      });
    } catch (err: any) {
      console.error('Export error:', err);
      toast({ 
        title: 'Export başarısız', 
        description: err.message || 'Bir hata oluştu',
        variant: 'destructive' 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getUploadUrl = () => {
    if (activeTab === 'issued') return '/finance/receipts/upload?type=issued';
    if (activeTab === 'invoice') return '/finance/receipts/upload?type=received&subtype=invoice';
    return '/finance/receipts/upload?type=received&subtype=slip';
  };

  const getEmptyMessage = () => {
    if (activeTab === 'slip') return 'Henüz alınan fiş yok.';
    if (activeTab === 'invoice') return 'Henüz alınan fatura yok.';
    return 'Henüz kesilen fatura yok.';
  };

  const getUploadLabel = () => {
    if (activeTab === 'slip') return 'Alınan fiş yükle';
    if (activeTab === 'invoice') return 'Alınan fatura yükle';
    return 'Kesilen fatura yükle';
  };

  // Get document type based on active tab
  const getDocumentType = (): DocumentType => {
    return activeTab === 'issued' ? 'issued' : 'received';
  };

  // Get receipt subtype based on active tab
  const getReceiptSubtype = (): ReceiptSubtype => {
    return activeTab === 'invoice' ? 'invoice' : 'slip';
  };

  // Validate file type
  const isValidFile = (file: File): boolean => {
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/xml', 'application/xml',
      'text/html', 'application/zip', 'application/x-zip-compressed'
    ];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'xml', 'html', 'htm', 'zip'];
    return validTypes.includes(file.type) || (ext ? validExtensions.includes(ext) : false);
  };

  // Process dropped or selected files
  const processFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(isValidFile);

    if (validFiles.length === 0) {
      toast({
        title: 'Geçersiz dosya formatı',
        description: 'JPG, PNG, PDF, XML, ZIP veya HTML dosyaları yükleyebilirsiniz.',
        variant: 'destructive'
      });
      return;
    }

    if (validFiles.length < files.length) {
      toast({
        title: 'Bazı dosyalar atlandı',
        description: `${files.length - validFiles.length} dosya desteklenmeyen formatta.`,
      });
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadTotal(validFiles.length);

    const documentType = getDocumentType();
    const receiptSubtype = getReceiptSubtype();

    try {
      // Separate ZIP and non-ZIP files
      const zipFiles = validFiles.filter(f => f.name.toLowerCase().endsWith('.zip'));
      const nonZipFiles = validFiles.filter(f => !f.name.toLowerCase().endsWith('.zip'));

      let successCount = 0;
      let errorCount = 0;

      // Upload ZIP files one by one
      for (const file of zipFiles) {
        try {
          await uploadReceipt.mutateAsync({
            file,
            documentType,
            receiptSubtype: documentType === 'received' ? receiptSubtype : undefined
          });
          successCount++;
        } catch {
          errorCount++;
        }
        setUploadProgress(prev => prev + 1);
      }

      // Upload non-ZIP files
      if (nonZipFiles.length >= 3) {
        // Use batch upload for 3+ files
        const results = await uploadReceiptsBatch.mutateAsync({
          files: nonZipFiles,
          documentType,
          receiptSubtype: documentType === 'received' ? receiptSubtype : undefined,
          onProgress: (progress) => {
            if (progress) {
              setUploadProgress(zipFiles.length + progress.processedFiles);
            }
          }
        });
        successCount += results.filter(r => r.status === 'success').length;
        errorCount += results.filter(r => r.status === 'failed').length;
      } else {
        // Upload 1-2 files individually
        for (const file of nonZipFiles) {
          try {
            await uploadReceipt.mutateAsync({
              file,
              documentType,
              receiptSubtype: documentType === 'received' ? receiptSubtype : undefined
            });
            successCount++;
          } catch {
            errorCount++;
          }
          setUploadProgress(prev => prev + 1);
        }
      }

      // Show result toast
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: 'Yükleme tamamlandı',
          description: `${successCount} belge başarıyla yüklendi.`
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: 'Yükleme kısmen tamamlandı',
          description: `${successCount} başarılı, ${errorCount} başarısız.`,
          variant: 'default'
        });
      } else if (errorCount > 0) {
        toast({
          title: 'Yükleme başarısız',
          description: `${errorCount} belge yüklenemedi.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Yükleme hatası',
        description: 'Dosyalar yüklenirken bir hata oluştu.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadTotal(0);
    }
  }, [activeTab, toast, uploadReceipt, uploadReceiptsBatch]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone entirely
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [isUploading, processFiles]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    e.target.value = '';
  }, [processFiles]);

  return (
    <div
      className="min-h-screen bg-background pb-20 relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xml,.html,.htm,.zip"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 p-8 border-4 border-dashed border-primary rounded-2xl bg-primary/10">
            <Upload className="h-16 w-16 text-primary animate-bounce" />
            <div className="text-center">
              <p className="text-xl font-bold text-primary">Dosyaları buraya bırakın</p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === 'issued' ? 'Kesilen fatura olarak yüklenecek' :
                 activeTab === 'invoice' ? 'Alınan fatura olarak yüklenecek' :
                 'Alınan fiş olarak yüklenecek'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">JPG, PNG, PDF, XML, ZIP</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload progress overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center">
          <Card className="w-80">
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div className="text-center">
                <p className="font-medium">Yükleniyor...</p>
                <p className="text-sm text-muted-foreground">{uploadProgress}/{uploadTotal} dosya</p>
              </div>
              <Progress value={(uploadProgress / uploadTotal) * 100} className="w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Official Data Lock Warning */}
        {isAnyLocked && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              Resmi veri modu aktif. Fişler hesaplamalara dahil edilmiyor.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/finance/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">Fiş/Faturalar</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isExporting || isLoading}
                className="gap-1"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{isExporting ? 'İndiriliyor...' : 'Excel'}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={() => handleExportExcel('all')}>
                📊 Tümünü Export Et
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExportExcel('slip')}>
                🧾 Sadece Alınan Fişler
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportExcel('invoice')}>
                📄 Sadece Alınan Faturalar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportExcel('issued')}>
                📝 Sadece Kesilen Faturalar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExportExcel('domestic')}>
                🇹🇷 Sadece Yurtiçi Belgeler
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportExcel('foreign')}>
                🌍 Sadece Yurtdışı Belgeler
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <span className="hidden sm:inline">Alınan Fiş</span>
              <span className="sm:hidden">Fiş</span>
              <span className="text-muted-foreground">({tabStats.slip.count})</span>
            </TabsTrigger>
            <TabsTrigger value="invoice" className="gap-1 text-xs sm:text-sm">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Alınan Fatura</span>
              <span className="sm:hidden">A.Fatura</span>
              <span className="text-muted-foreground">({tabStats.invoice.count})</span>
            </TabsTrigger>
            <TabsTrigger value="issued" className="gap-1 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Kesilen Fatura</span>
              <span className="sm:hidden">Kesilen</span>
              <span className="text-muted-foreground">({tabStats.issued.count})</span>
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
                    <span className="hidden sm:inline">Alınan Fiş Yükle</span>
                    <span className="sm:hidden">Yükle</span>
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
                    <span className="hidden sm:inline">Alınan Fatura Yükle</span>
                    <span className="sm:hidden">Yükle</span>
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
                    <span className="hidden sm:inline">Kesilen Fatura Yükle</span>
                    <span className="sm:hidden">Yükle</span>
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
