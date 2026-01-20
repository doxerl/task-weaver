import { useCallback, useState, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useYear } from '@/contexts/YearContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Upload, Loader2, ArrowLeft, X, FileText, Receipt as ReceiptIcon, Plus, Camera, ImageIcon, Archive, Code, FileCheck, Globe, Home, Check, AlertCircle, Copy, RefreshCw, Download, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useReceipts, BatchProgress, BatchFileResult } from '@/hooks/finance/useReceipts';
import { useExchangeRates } from '@/hooks/finance/useExchangeRates';
import { cn } from '@/lib/utils';
import { BottomTabBar } from '@/components/BottomTabBar';
import { DocumentType, Receipt, ReceiptSubtype } from '@/types/finance';
import { UploadedReceiptCard } from '@/components/finance/UploadedReceiptCard';
import { ReceiptEditSheet } from '@/components/finance/ReceiptEditSheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';

type ReceiptFilter = 'all' | 'domestic' | 'foreign';
type ExportFilter = 'all' | 'slip' | 'invoice' | 'issued' | 'foreign';

// Helper to get file type info
function getFileTypeInfo(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'zip') return { type: 'zip', label: 'ZIP Arşiv', icon: Archive, color: 'text-amber-500' };
  if (ext === 'xml') return { type: 'xml', label: 'e-Fatura', icon: Code, color: 'text-green-500' };
  if (file.type === 'application/pdf' || ext === 'pdf') return { type: 'pdf', label: 'PDF', icon: FileText, color: 'text-red-500' };
  return { type: 'image', label: 'Görsel', icon: ImageIcon, color: 'text-blue-500' };
}

// Status icon component
function FileStatusIcon({ status }: { status: BatchFileResult['status'] }) {
  switch (status) {
    case 'success':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'duplicate':
      return <Copy className="h-4 w-4 text-amber-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
  }
}

export default function ReceiptUpload() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { selectedYear } = useYear();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async (filter: ExportFilter) => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-receipts', {
        body: { year: selectedYear, filter }
      });
      
      if (error) throw error;
      
      const binaryString = atob(data.xlsxBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.filename}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({ 
        title: 'Excel dosyası indirildi',
        description: `${data.stats.total} kayıt export edildi`
      });
    } catch (err) {
      console.error('Export error:', err);
      toast({ title: 'Export başarısız', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get('type') as DocumentType) || 'received';
  const initialSubtype = (searchParams.get('subtype') as ReceiptSubtype) || 'slip';
  
  // Fetch recent receipts from DB (last 20)
  const { 
    receipts: dbReceipts,
    isLoading: isLoadingReceipts,
    uploadReceipt,
    uploadReceiptsBatch,
    batchProgress,
    isBatchUploading,
    uploadProgress, 
    deleteReceipt, 
    updateReceipt,
    reprocessReceipt,
    toggleIncludeInReport,
    isReprocessing
  } = useReceipts();

  // Exchange rates for TRY conversion
  const { getCurrencyRate } = useExchangeRates();
  
  const [documentType, setDocumentType] = useState<DocumentType>(initialType);
  const [receiptSubtype, setReceiptSubtype] = useState<ReceiptSubtype>(initialSubtype);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(0);
  
  // Uploaded receipts - start with empty, then merge with newly uploaded
  const [sessionUploadedIds, setSessionUploadedIds] = useState<Set<string>>(new Set());
  
  // Show recent receipts from DB (limit to last 100 for this session view)
  const recentReceipts = dbReceipts.slice(0, 100);
  
  // Currency symbol helper
  const getCurrencySymbol = (currency?: string | null) => {
    switch (currency?.toUpperCase()) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'TRY':
      default: return '₺';
    }
  };

  // Format receipt amount with correct currency
  const formatReceiptAmount = (receipt: Receipt) => {
    const isForeign = receipt.is_foreign_invoice || (receipt.currency && receipt.currency !== 'TRY');
    const symbol = getCurrencySymbol(isForeign ? (receipt.original_currency || receipt.currency) : 'TRY');
    const amount = isForeign ? (receipt.original_amount || receipt.total_amount || 0) : (receipt.total_amount || 0);
    const locale = isForeign ? 'en-US' : 'tr-TR';
    
    return `${symbol}${amount.toLocaleString(locale, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };
  
  // Edit sheet state
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  // Filter state for summary
  const [receiptFilter, setReceiptFilter] = useState<ReceiptFilter>('all');
  
  // Local batch progress for UI
  const [localBatchProgress, setLocalBatchProgress] = useState<BatchProgress | null>(null);
  const displayBatchProgress = localBatchProgress || batchProgress;

  // Summary calculations with filter support and exchange rate conversion
  const receiptSummary = useMemo(() => {
    // Separate ALL receipts by type (for filtering display)
    const allDomestic = recentReceipts.filter(r => !r.is_foreign_invoice && (!r.currency || r.currency === 'TRY'));
    const allForeign = recentReceipts.filter(r => r.is_foreign_invoice || (r.currency && r.currency !== 'TRY'));
    
    // Included receipts only (for "Tümü" filter totals)
    const included = recentReceipts.filter(r => r.is_included_in_report);
    const includedDomestic = included.filter(r => !r.is_foreign_invoice && (!r.currency || r.currency === 'TRY'));
    const includedForeign = included.filter(r => r.is_foreign_invoice || (r.currency && r.currency !== 'TRY'));
    
    // Helper function to calculate foreign totals
    const calculateForeignTotals = (receipts: typeof allForeign) => {
      let totalTRY = 0;
      const byCurrency: Record<string, { amount: number; tryAmount: number; rate: number | null }> = {};
      
      receipts.forEach(r => {
        const cur = r.original_currency || r.currency || 'USD';
        const originalAmount = r.original_amount || r.total_amount || 0;
        
        let tryAmount = r.amount_try || 0;
        let rate: number | null = null;
        
        if (!tryAmount && r.receipt_date) {
          const receiptDate = new Date(r.receipt_date);
          const year = receiptDate.getFullYear();
          const month = receiptDate.getMonth() + 1;
          rate = getCurrencyRate(cur, year, month);
          if (rate) {
            tryAmount = originalAmount * rate;
          }
        } else if (r.exchange_rate_used) {
          rate = r.exchange_rate_used;
        }
        
        totalTRY += tryAmount;
        
        if (!byCurrency[cur]) {
          byCurrency[cur] = { amount: 0, tryAmount: 0, rate };
        }
        byCurrency[cur].amount += originalAmount;
        byCurrency[cur].tryAmount += tryAmount;
        if (rate) byCurrency[cur].rate = rate;
      });
      
      return { totalTRY, byCurrency };
    };
    
    // TRY totals for included receipts (for "Tümü" filter)
    const domesticTRY = includedDomestic.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const { totalTRY: foreignTRY, byCurrency: foreignByCurrency } = calculateForeignTotals(includedForeign);
    
    // TRY totals for ALL receipts (for individual filters)
    const allDomesticTRY = allDomestic.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const { totalTRY: allForeignTRY, byCurrency: allForeignByCurrency } = calculateForeignTotals(allForeign);
    
    // Filtered receipts based on current filter (show ALL receipts of type, not just included)
    const filteredReceipts = receiptFilter === 'domestic' ? allDomestic 
                           : receiptFilter === 'foreign' ? allForeign 
                           : recentReceipts;
    
    return {
      totalCount: recentReceipts.length,
      includedCount: included.length,
      // Counts for filter buttons (show ALL, not just included)
      allDomesticCount: allDomestic.length,
      allForeignCount: allForeign.length,
      // Counts for included only
      domesticCount: includedDomestic.length,
      foreignCount: includedForeign.length,
      // Included totals (for "Tümü" filter)
      domesticTRY,
      foreignTRY,
      grandTotalTRY: domesticTRY + foreignTRY,
      foreignByCurrency,
      // ALL totals (for individual filters)
      allDomesticTRY,
      allForeignTRY,
      allForeignByCurrency,
      filteredReceipts,
    };
  }, [recentReceipts, receiptFilter, getCurrencyRate]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
    
    // Generate previews and auto-detect subtype
    selected.forEach(file => {
      // Auto-detect subtype based on file type
      const fileInfo = getFileTypeInfo(file);
      if (documentType === 'received') {
        if (fileInfo.type === 'pdf' || fileInfo.type === 'xml') {
          setReceiptSubtype('invoice');
        } else if (fileInfo.type === 'image') {
          // Keep current or default to slip for images
          if (receiptSubtype !== 'invoice') {
            setReceiptSubtype('slip');
          }
        }
      }
      
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviews(prev => [...prev, url]);
      } else {
        setPreviews(prev => [...prev, '']);
      }
    });
  }, [documentType, receiptSubtype]);

  const removeFile = (index: number) => {
    // Revoke object URL to prevent memory leaks
    if (previews[index]) {
      URL.revokeObjectURL(previews[index]);
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    // Check if any file is a ZIP - use single upload for ZIPs
    const hasZip = files.some(f => f.name.toLowerCase().endsWith('.zip'));
    const nonZipFiles = files.filter(f => !f.name.toLowerCase().endsWith('.zip'));
    const zipFiles = files.filter(f => f.name.toLowerCase().endsWith('.zip'));
    
    setUploading(true);
    setCompleted(0);
    const uploadedIds: string[] = [];
    
    // Handle ZIP files with single upload (they contain multiple files)
    for (const file of zipFiles) {
      const result = await uploadReceipt.mutateAsync({ 
        file, 
        documentType,
        receiptSubtype: documentType === 'received' ? receiptSubtype : undefined
      });
      if (Array.isArray(result)) {
        uploadedIds.push(...result.map(r => r.id));
      } else if (result) {
        uploadedIds.push((result as Receipt).id);
      }
      setCompleted(prev => prev + 1);
    }
    
    // Handle non-ZIP files with batch upload if there are multiple
    if (nonZipFiles.length > 0) {
      if (nonZipFiles.length >= 3) {
        // Use batch processing for 3+ files
        const results = await uploadReceiptsBatch.mutateAsync({
          files: nonZipFiles,
          documentType,
          receiptSubtype: documentType === 'received' ? receiptSubtype : undefined,
          onProgress: setLocalBatchProgress
        });
        
        results
          .filter(r => r.status === 'success' && r.receipt)
          .forEach(r => uploadedIds.push(r.receipt!.id));
      } else {
        // Use single upload for 1-2 files
        for (const file of nonZipFiles) {
          const result = await uploadReceipt.mutateAsync({ 
            file, 
            documentType,
            receiptSubtype: documentType === 'received' ? receiptSubtype : undefined
          });
          if (Array.isArray(result)) {
            uploadedIds.push(...result.map(r => r.id));
          } else if (result) {
            uploadedIds.push((result as Receipt).id);
          }
          setCompleted(prev => prev + 1);
        }
      }
    }
    
    // Clean up previews
    previews.forEach(url => url && URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setUploading(false);
    setLocalBatchProgress(null);
    
    // Track which receipts were uploaded in this session
    setSessionUploadedIds(prev => new Set([...prev, ...uploadedIds]));
  };

  const handleDelete = async (id: string) => {
    await deleteReceipt.mutateAsync(id);
    setSessionUploadedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleEdit = (id: string) => {
    const receipt = recentReceipts.find(r => r.id === id);
    if (receipt) {
      setEditingReceipt(receipt);
      setEditSheetOpen(true);
    }
  };

  const handleReprocess = async (id: string) => {
    await reprocessReceipt.mutateAsync(id);
  };

  const handleToggleInclude = async (id: string, include: boolean) => {
    await toggleIncludeInReport.mutateAsync({ id, include });
  };

  const handleSaveEdit = async (id: string, data: Partial<Receipt>) => {
    await updateReceipt.mutateAsync({ id, data });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/finance/receipts" className="p-2 hover:bg-accent rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold">Fiş/Fatura Yükle</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isExporting}
                className="gap-1"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isExporting ? 'İndiriliyor...' : 'Excel'}
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
              <DropdownMenuItem onClick={() => handleExportExcel('foreign')}>
                🌍 Sadece Yurtdışı Belgeler
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Document Type Selection - Kesilen / Alınan */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setDocumentType('received');
              setReceiptSubtype('slip');
            }}
            disabled={uploading}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              documentType === 'received' 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <ReceiptIcon className="h-5 w-5 text-primary" />
              <span className="font-semibold">Alınan</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Gider fişi/faturası
            </p>
          </button>
          
          <button
            onClick={() => setDocumentType('issued')}
            disabled={uploading}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left",
              documentType === 'issued' 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Kesilen</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Gelir faturası
            </p>
          </button>
        </div>

        {/* Receipt Subtype Selection - Only for "Alınan" */}
        {documentType === 'received' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setReceiptSubtype('slip')}
              disabled={uploading}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-left",
                receiptSubtype === 'slip' 
                  ? "border-orange-500 bg-orange-500/10" 
                  : "border-border hover:border-orange-500/50"
              )}
            >
              <div className="flex items-center gap-2">
                <ReceiptIcon className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-sm">Fiş</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Market, restoran, benzin vb.
              </p>
            </button>
            
            <button
              onClick={() => setReceiptSubtype('invoice')}
              disabled={uploading}
              className={cn(
                "p-3 rounded-lg border-2 transition-all text-left",
                receiptSubtype === 'invoice' 
                  ? "border-blue-500 bg-blue-500/10" 
                  : "border-border hover:border-blue-500/50"
              )}
            >
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Fatura</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                e-Fatura, e-Arşiv, PDF
              </p>
            </button>
          </div>
        )}

        {/* File Upload Area */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Hidden inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,.pdf,.xml,.zip"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />

            {uploading || isBatchUploading ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg border-primary bg-primary/5">
                {displayBatchProgress ? (
                  // Batch upload progress
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                        <span className="font-medium text-sm">
                          Batch {displayBatchProgress.currentBatch}/{displayBatchProgress.totalBatches} işleniyor...
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {displayBatchProgress.processedFiles}/{displayBatchProgress.totalFiles}
                      </span>
                    </div>
                    
                    <Progress 
                      value={(displayBatchProgress.processedFiles / displayBatchProgress.totalFiles) * 100} 
                      className="w-full h-2" 
                    />
                    
                    {/* Stats */}
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="h-3 w-3" />
                        {displayBatchProgress.successCount} başarılı
                      </span>
                      {displayBatchProgress.duplicateCount > 0 && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Copy className="h-3 w-3" />
                          {displayBatchProgress.duplicateCount} duplike
                        </span>
                      )}
                      {displayBatchProgress.failedCount > 0 && (
                        <span className="flex items-center gap-1 text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {displayBatchProgress.failedCount} hata
                        </span>
                      )}
                    </div>
                    
                    {/* File list */}
                    <ScrollArea className="max-h-48 border rounded-lg">
                      <div className="p-2 space-y-1">
                        {displayBatchProgress.results.map((result, idx) => (
                          <div 
                            key={idx} 
                            className={cn(
                              "flex items-center gap-2 p-2 rounded text-sm",
                              result.status === 'processing' && "bg-primary/10",
                              result.status === 'success' && "bg-green-500/10",
                              result.status === 'failed' && "bg-destructive/10",
                              result.status === 'duplicate' && "bg-amber-500/10",
                            )}
                          >
                            <FileStatusIcon status={result.status} />
                            <span className="truncate flex-1">{result.fileName}</span>
                            {result.status === 'success' && result.receipt?.total_amount && (
                              <span className={cn(
                                "text-xs font-medium",
                                result.receipt.is_foreign_invoice ? "text-blue-600" : "text-green-600"
                              )}>
                                {formatReceiptAmount(result.receipt)}
                                {result.receipt.is_foreign_invoice && (
                                  <span className="ml-1 text-[10px] text-muted-foreground">(Yurtdışı)</span>
                                )}
                              </span>
                            )}
                            {result.status === 'failed' && (
                              <span className="text-xs text-destructive truncate max-w-[100px]">
                                {result.error}
                              </span>
                            )}
                            {result.status === 'duplicate' && (
                              <span className="text-xs text-amber-600">
                                {result.duplicateType === 'receipt_no' && 'Fiş No eşleşti'}
                                {result.duplicateType === 'file_date' && 'Dosya+Tarih eşleşti'}
                                {result.duplicateType === 'soft' && 'Benzer belge'}
                                {!result.duplicateType && 'Zaten mevcut'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  // Simple single file progress
                  <>
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <p className="text-sm font-medium">Yükleniyor {completed}/{files.length}</p>
                    <Progress value={(completed / files.length) * 100} className="w-full" />
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Mobile: Camera + Gallery buttons */}
                {isMobile ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg transition-colors border-primary bg-primary/5 hover:bg-primary/10"
                    >
                      <Camera className="h-10 w-10 text-primary" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Kamera ile Çek</p>
                        <p className="text-xs text-muted-foreground">Fotoğraf çek</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg transition-colors border-muted-foreground/25 hover:border-primary/50"
                    >
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Galeriden Seç</p>
                        <p className="text-xs text-muted-foreground">JPG, PDF, XML, ZIP</p>
                      </div>
                    </button>
                  </div>
                ) : (
                  /* Desktop: Single drop zone */
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors border-muted-foreground/25 hover:border-primary/50"
                  >
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {receiptSubtype === 'slip' ? 'Fiş seçin' : 'Fatura seçin'}
                    </p>
                    <p className="text-xs text-muted-foreground">JPG, PNG, PDF, XML, ZIP</p>
                  </button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* File Previews - Before Upload */}
        {files.length > 0 && !uploading && !isBatchUploading && (
          <>
            {/* Compact list view for many files */}
            {files.length > 5 ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm">{files.length} dosya seçildi</span>
                    <button 
                      onClick={() => {
                        previews.forEach(url => url && URL.revokeObjectURL(url));
                        setFiles([]);
                        setPreviews([]);
                      }}
                      className="text-xs text-destructive hover:underline"
                    >
                      Tümünü Kaldır
                    </button>
                  </div>
                  <ScrollArea className="max-h-60">
                    <div className="space-y-1">
                      {files.map((file, i) => {
                        const fileInfo = getFileTypeInfo(file);
                        const FileIcon = fileInfo.icon;
                        return (
                          <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                            <FileIcon className={cn("h-4 w-4 flex-shrink-0", fileInfo.color)} />
                            <span className="text-sm truncate flex-1">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(0)} KB
                            </span>
                            <button
                              onClick={() => removeFile(i)}
                              className="p-1 hover:bg-destructive/10 rounded"
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ) : (
              // Detailed preview for few files
              <div className="space-y-3">
                {files.map((file, i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex gap-3">
                        {/* Preview */}
                        {(() => {
                          const fileInfo = getFileTypeInfo(file);
                          const FileIcon = fileInfo.icon;
                          return (
                            <div className="w-24 h-24 flex-shrink-0 bg-muted">
                              {previews[i] ? (
                                <img 
                                  src={previews[i]} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                  <FileIcon className={cn("h-8 w-8", fileInfo.color)} />
                                  <span className={cn("text-[10px] font-medium", fileInfo.color)}>{fileInfo.label}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        
                        {/* File Info */}
                        {(() => {
                          const fileInfo = getFileTypeInfo(file);
                          return (
                            <div className="flex-1 py-3 pr-3">
                              <p className="font-medium text-sm truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {(file.size / 1024).toFixed(0)} KB • {fileInfo.label}
                              </p>
                              <div className="flex items-center gap-1 mt-2 flex-wrap">
                                {documentType === 'issued' ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                                    📤 Kesilen
                                  </span>
                                ) : receiptSubtype === 'slip' ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600">
                                    🧾 Fiş
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                                    📄 Fatura
                                  </span>
                                )}
                                {fileInfo.type === 'zip' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                                    📦 Çoklu dosya
                                  </span>
                                )}
                                {fileInfo.type === 'xml' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                                    ✓ %100 doğruluk
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => removeFile(i)}
                          className="self-start p-2 hover:bg-destructive/10 rounded-lg m-2"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Upload button with batch info */}
            <button
              onClick={handleUpload}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium"
            >
              {files.length >= 3 ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {files.length} Dosya Toplu Yükle (3'lü batch)
                </span>
              ) : (
                `${files.length} Dosya Yükle`
              )}
            </button>
          </>
        )}

        {/* Recent Receipts - Persisted from DB */}
        {isLoadingReceipts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recentReceipts.length > 0 ? (
          <div className="space-y-4">
            {/* Summary Card with Filter */}
            <Card className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                {/* Header with Filter Buttons */}
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">📊 Özet</h3>
                    <span className="text-xs text-muted-foreground">
                      {receiptSummary.includedCount} / {receiptSummary.totalCount} belge rapora dahil
                    </span>
                  </div>
                  
                  {/* Filter Chips */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReceiptFilter('all')}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1.5",
                        receiptFilter === 'all' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      Tümü ({receiptSummary.totalCount})
                    </button>
                    <button
                      onClick={() => setReceiptFilter('domestic')}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1.5",
                        receiptFilter === 'domestic' 
                          ? "bg-orange-500 text-white" 
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <Home className="h-3 w-3" />
                      Yurtiçi ({receiptSummary.allDomesticCount})
                    </button>
                    <button
                      onClick={() => setReceiptFilter('foreign')}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1.5",
                        receiptFilter === 'foreign' 
                          ? "bg-blue-500 text-white" 
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <Globe className="h-3 w-3" />
                      Yurtdışı ({receiptSummary.allForeignCount})
                    </button>
                  </div>
                </div>
                
                {/* Summary Content Based on Filter */}
                {receiptFilter === 'all' && (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Domestic Total */}
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Home className="h-3 w-3" />
                        Yurtiçi
                      </p>
                      <p className="text-lg font-bold">
                        ₺{receiptSummary.domesticTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    
                    {/* Foreign Total */}
                    {receiptSummary.foreignCount > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Yurtdışı
                        </p>
                        <div className="space-y-0.5">
                          {Object.entries(receiptSummary.foreignByCurrency).map(([cur, data]) => (
                            <p key={cur} className="text-sm font-medium text-blue-600">
                              {cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur}
                              {data.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                            </p>
                          ))}
                          <p className="text-xs text-muted-foreground">
                            ≈ ₺{receiptSummary.foreignTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {receiptFilter === 'domestic' && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Toplam Yurtiçi Fatura</p>
                    <p className="text-2xl font-bold">
                      ₺{receiptSummary.allDomesticTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {receiptSummary.allDomesticCount} adet belge
                    </p>
                  </div>
                )}
                
                {receiptFilter === 'foreign' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Toplam Yurtdışı Fatura</p>
                    {Object.entries(receiptSummary.allForeignByCurrency).map(([cur, data]) => (
                      <div key={cur} className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold text-blue-600">
                            {cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur}
                            {data.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </span>
                          {data.rate && (
                            <p className="text-xs text-muted-foreground">
                              Kur: 1 {cur} = {data.rate.toFixed(2)} TRY
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          → ₺{data.tryAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                    {receiptSummary.allForeignCount === 0 && (
                      <p className="text-sm text-muted-foreground">Yurtdışı fatura bulunmuyor</p>
                    )}
                  </div>
                )}
                
                {/* Grand Total - Always show */}
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {receiptFilter === 'all' ? 'Genel Toplam' : receiptFilter === 'domestic' ? 'Yurtiçi Toplam' : 'Yurtdışı Toplam'} (TRY)
                    </span>
                    <span className="text-xl font-bold text-green-600">
                      ₺{(receiptFilter === 'all' 
                          ? receiptSummary.grandTotalTRY 
                          : receiptFilter === 'domestic' 
                            ? receiptSummary.allDomesticTRY 
                            : receiptSummary.allForeignTRY
                        ).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                📋 {receiptFilter === 'all' ? 'Son Yüklenen Belgeler' : receiptFilter === 'domestic' ? 'Yurtiçi Belgeler' : 'Yurtdışı Belgeler'} ({receiptFilter === 'all' ? recentReceipts.length : receiptSummary.filteredReceipts.length})
              </h2>
              <Link 
                to="/finance/receipts" 
                className="text-sm text-primary hover:underline"
              >
                Tümünü Gör →
              </Link>
            </div>
            
            <div className="space-y-3">
              {(receiptFilter === 'all' ? recentReceipts : receiptSummary.filteredReceipts).map((receipt) => (
                <UploadedReceiptCard
                  key={receipt.id}
                  receipt={receipt}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onReprocess={handleReprocess}
                  onToggleInclude={handleToggleInclude}
                  isReprocessing={isReprocessing}
                />
              ))}
            </div>

            {/* Add More Button */}
            <Card className="border-dashed">
              <CardContent className="p-4">
                {isMobile ? (
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent"
                    >
                      <Camera className="h-5 w-5 text-primary" />
                      <span className="text-sm">Kamera</span>
                    </button>
                    <div className="h-6 w-px bg-border" />
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-accent"
                    >
                      <Plus className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Galeri</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-2"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Başka Belge Ekle</span>
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      {/* Edit Sheet */}
      <ReceiptEditSheet
        receipt={editingReceipt}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        onSave={handleSaveEdit}
      />

      <BottomTabBar />
    </div>
  );
}
