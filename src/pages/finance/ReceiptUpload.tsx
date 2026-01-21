import { useCallback, useState, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useYear } from '@/contexts/YearContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type ReceiptFilter = 'all' | 'domestic' | 'foreign' | 'received' | 'issued';
type ExportFilter = 'all' | 'slip' | 'invoice' | 'issued' | 'foreign' | 'domestic';

// Entity grouping type for summary
interface EntityGroup {
  count: number;
  total: number;
  vat: number;
  subtotal: number;
  taxNo?: string;
  receipts: Receipt[];
}

// Helper to get file type info
function getFileTypeInfo(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'zip') return { type: 'zip', label: 'ZIP Arşiv', icon: Archive, color: 'text-amber-500' };
  if (ext === 'xml') return { type: 'xml', label: 'e-Fatura', icon: Code, color: 'text-green-500' };
  if (ext === 'html' || ext === 'htm') return { type: 'html', label: 'E-posta/HTML', icon: Code, color: 'text-purple-500' };
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
  const { selectedYear, setSelectedYear } = useYear();
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
  } = useReceipts(selectedYear);

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
    const allDomestic = recentReceipts.filter(r => !r.is_foreign_invoice);
    const allForeign = recentReceipts.filter(r => r.is_foreign_invoice);
    
    // Alınan (Received) vs Kesilen (Issued) separation
    const allReceived = recentReceipts.filter(r => r.document_type === 'received');
    const allIssued = recentReceipts.filter(r => r.document_type === 'issued');
    
    // Included receipts only (for "Tümü" filter totals)
    const included = recentReceipts.filter(r => r.is_included_in_report);
    const includedDomestic = included.filter(r => !r.is_foreign_invoice);
    const includedForeign = included.filter(r => r.is_foreign_invoice);
    
    // Group received documents by seller (Kesen Tüzel Kişilik)
    const receivedByVendor: Record<string, EntityGroup> = {};
    allReceived.forEach(r => {
      const vendor = r.seller_name || r.vendor_name || 'Bilinmeyen Satıcı';
      if (!receivedByVendor[vendor]) {
        receivedByVendor[vendor] = { 
          count: 0, 
          total: 0, 
          vat: 0, 
          subtotal: 0,
          taxNo: r.seller_tax_no || r.vendor_tax_no || undefined,
          receipts: [] 
        };
      }
      // Use TRY equivalent for totals (amount_try if foreign, total_amount otherwise)
      const tryAmount = r.is_foreign_invoice 
        ? (r.amount_try || r.total_amount || 0) 
        : (r.total_amount || 0);
      receivedByVendor[vendor].count++;
      receivedByVendor[vendor].total += tryAmount;
      receivedByVendor[vendor].vat += r.vat_amount || 0;
      receivedByVendor[vendor].subtotal += r.subtotal || (tryAmount - (r.vat_amount || 0));
      receivedByVendor[vendor].receipts.push(r);
    });
    
    // Group issued documents by buyer (Kesilen Tüzel Kişilik)
    const issuedByBuyer: Record<string, EntityGroup> = {};
    allIssued.forEach(r => {
      const buyer = r.buyer_name || 'Bilinmeyen Alıcı';
      if (!issuedByBuyer[buyer]) {
        issuedByBuyer[buyer] = { 
          count: 0, 
          total: 0, 
          vat: 0, 
          subtotal: 0,
          taxNo: r.buyer_tax_no || undefined,
          receipts: [] 
        };
      }
      // Use TRY equivalent for totals
      const tryAmount = r.is_foreign_invoice 
        ? (r.amount_try || r.total_amount || 0) 
        : (r.total_amount || 0);
      issuedByBuyer[buyer].count++;
      issuedByBuyer[buyer].total += tryAmount;
      issuedByBuyer[buyer].vat += r.vat_amount || 0;
      issuedByBuyer[buyer].subtotal += r.subtotal || (tryAmount - (r.vat_amount || 0));
      issuedByBuyer[buyer].receipts.push(r);
    });
    
    // Calculate received/issued totals in TRY
    const allReceivedTRY = allReceived.reduce((sum, r) => {
      return sum + (r.is_foreign_invoice ? (r.amount_try || r.total_amount || 0) : (r.total_amount || 0));
    }, 0);
    const allIssuedTRY = allIssued.reduce((sum, r) => {
      return sum + (r.is_foreign_invoice ? (r.amount_try || r.total_amount || 0) : (r.total_amount || 0));
    }, 0);
    
    // Calculate VAT totals for received/issued
    const allReceivedVAT = allReceived.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
    const allIssuedVAT = allIssued.reduce((sum, r) => sum + (r.vat_amount || 0), 0);
    
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
    
    // Calculate domestic VAT totals and year breakdown
    const calculateDomesticVatByYear = (receipts: typeof allDomestic) => {
      const byYear: Record<number, { 
        count: number; 
        total: number; 
        vat: number; 
        subtotal: number 
      }> = {};
      
      let totalVat = 0;
      let totalSubtotal = 0;
      
      receipts.forEach(r => {
        const year = r.year || (r.receipt_date ? new Date(r.receipt_date).getFullYear() : new Date(r.created_at || '').getFullYear());
        const total = r.total_amount || 0;
        const vat = r.vat_amount || 0;
        // If subtotal exists use it, otherwise calculate from total - vat
        const subtotal = r.subtotal || (total - vat);
        
        if (!byYear[year]) {
          byYear[year] = { count: 0, total: 0, vat: 0, subtotal: 0 };
        }
        byYear[year].count++;
        byYear[year].total += total;
        byYear[year].vat += vat;
        byYear[year].subtotal += subtotal;
        
        totalVat += vat;
        totalSubtotal += subtotal;
      });
      
      return { byYear, totalVat, totalSubtotal };
    };
    
    // Calculate foreign totals by year
    const calculateForeignByYear = (receipts: typeof allForeign) => {
      const byYear: Record<number, { 
        count: number; 
        byCurrency: Record<string, { amount: number; tryAmount: number; rate: number | null }>;
        totalTRY: number;
      }> = {};
      
      receipts.forEach(r => {
        const year = r.year || (r.receipt_date ? new Date(r.receipt_date).getFullYear() : new Date(r.created_at || '').getFullYear());
        const cur = r.original_currency || r.currency || 'USD';
        const originalAmount = r.original_amount || r.total_amount || 0;
        
        let tryAmount = r.amount_try || 0;
        let rate: number | null = null;
        
        if (!tryAmount && r.receipt_date) {
          const receiptDate = new Date(r.receipt_date);
          const rYear = receiptDate.getFullYear();
          const month = receiptDate.getMonth() + 1;
          rate = getCurrencyRate(cur, rYear, month);
          if (rate) {
            tryAmount = originalAmount * rate;
          }
        } else if (r.exchange_rate_used) {
          rate = r.exchange_rate_used;
        }
        
        if (!byYear[year]) {
          byYear[year] = { count: 0, byCurrency: {}, totalTRY: 0 };
        }
        byYear[year].count++;
        byYear[year].totalTRY += tryAmount;
        
        if (!byYear[year].byCurrency[cur]) {
          byYear[year].byCurrency[cur] = { amount: 0, tryAmount: 0, rate };
        }
        byYear[year].byCurrency[cur].amount += originalAmount;
        byYear[year].byCurrency[cur].tryAmount += tryAmount;
        if (rate) byYear[year].byCurrency[cur].rate = rate;
      });
      
      return byYear;
    };
    
    // TRY totals for included receipts (for "Tümü" filter)
    const domesticTRY = includedDomestic.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const { totalTRY: foreignTRY, byCurrency: foreignByCurrency } = calculateForeignTotals(includedForeign);
    
    // TRY totals for ALL receipts (for individual filters)
    const allDomesticTRY = allDomestic.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const { totalTRY: allForeignTRY, byCurrency: allForeignByCurrency } = calculateForeignTotals(allForeign);
    
    // Domestic VAT breakdown by year
    const { byYear: domesticByYear, totalVat: domesticTotalVat, totalSubtotal: domesticTotalSubtotal } = calculateDomesticVatByYear(allDomestic);
    
    // Foreign breakdown by year
    const foreignByYear = calculateForeignByYear(allForeign);
    
    // Filtered receipts based on current filter (show ALL receipts of type, not just included)
    let filteredReceipts: Receipt[];
    switch (receiptFilter) {
      case 'domestic':
        filteredReceipts = allDomestic;
        break;
      case 'foreign':
        filteredReceipts = allForeign;
        break;
      case 'received':
        filteredReceipts = allReceived;
        break;
      case 'issued':
        filteredReceipts = allIssued;
        break;
      default:
        filteredReceipts = recentReceipts;
    }
    
    return {
      totalCount: recentReceipts.length,
      includedCount: included.length,
      // Counts for filter buttons (show ALL, not just included)
      allDomesticCount: allDomestic.length,
      allForeignCount: allForeign.length,
      // Received/Issued counts
      allReceivedCount: allReceived.length,
      allIssuedCount: allIssued.length,
      allReceivedTRY,
      allIssuedTRY,
      allReceivedVAT,
      allIssuedVAT,
      // Entity groupings
      receivedByVendor,
      issuedByBuyer,
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
      // NEW: Domestic VAT breakdown by year
      domesticByYear,
      domesticTotalVat,
      domesticTotalSubtotal,
      // NEW: Foreign breakdown by year
      foreignByYear,
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
          <div className="flex items-center gap-2">
            <Select 
              value={String(selectedYear)} 
              onValueChange={v => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <DropdownMenuItem onClick={() => handleExportExcel('domestic')}>
                  🇹🇷 Sadece Yurtiçi Belgeler
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel('foreign')}>
                  🌍 Sadece Yurtdışı Belgeler
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
              accept="image/*,.pdf,.xml,.zip,.html,.htm"
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
                  
                  {/* Filter Chips - Row 1: Tümü, Alınan, Kesilen */}
                  <div className="flex gap-2 flex-wrap">
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
                      onClick={() => setReceiptFilter('received')}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1.5",
                        receiptFilter === 'received' 
                          ? "bg-purple-500 text-white" 
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <ReceiptIcon className="h-3 w-3" />
                      Alınan ({receiptSummary.allReceivedCount})
                    </button>
                    <button
                      onClick={() => setReceiptFilter('issued')}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-full transition-colors flex items-center gap-1.5",
                        receiptFilter === 'issued' 
                          ? "bg-green-500 text-white" 
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <FileText className="h-3 w-3" />
                      Kesilen ({receiptSummary.allIssuedCount})
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
                
                {/* Alınan Belgeler - Kesen Tüzel Kişilik Bazında */}
                {receiptFilter === 'received' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Alınan Belgeler - Kesen Tüzel Kişilik Bazında
                    </p>
                    
                    {Object.entries(receiptSummary.receivedByVendor)
                      .sort(([,a], [,b]) => b.total - a.total) // En yüksek tutardan sırala
                      .slice(0, 15) // İlk 15 satıcı
                      .map(([vendor, data]) => (
                        <div key={vendor} className="p-3 rounded-lg bg-background/50 border">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm block truncate">{vendor}</span>
                              {data.taxNo && (
                                <p className="text-xs text-muted-foreground">
                                  VKN: {data.taxNo}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {data.count} belge
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Matrah</span>
                              <span>₺{data.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {data.vat > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">KDV</span>
                                <span className="text-orange-600">
                                  ₺{data.vat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between font-medium pt-1 border-t border-dashed">
                              <span>Toplam (TRY)</span>
                              <span className="text-purple-600">
                                ₺{data.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {Object.keys(receiptSummary.receivedByVendor).length > 15 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{Object.keys(receiptSummary.receivedByVendor).length - 15} satıcı daha
                      </p>
                    )}
                    
                    {/* Genel Toplam */}
                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">Alınan Belgeler Toplamı</span>
                        <span className="text-xs text-muted-foreground">{receiptSummary.allReceivedCount} belge</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Toplam KDV</span>
                          <span className="text-orange-600">₺{receiptSummary.allReceivedVAT.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-bold pt-1 border-t">
                          <span>Genel Toplam (TRY)</span>
                          <span className="text-purple-600">₺{receiptSummary.allReceivedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                    
                    {receiptSummary.allReceivedCount === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Alınan belge bulunmuyor
                      </p>
                    )}
                  </div>
                )}
                
                {/* Kesilen Belgeler - Kesilen Tüzel Kişilik Bazında */}
                {receiptFilter === 'issued' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Kesilen Belgeler - Kesilen Tüzel Kişilik Bazında
                    </p>
                    
                    {Object.entries(receiptSummary.issuedByBuyer)
                      .sort(([,a], [,b]) => b.total - a.total)
                      .map(([buyer, data]) => (
                        <div key={buyer} className="p-3 rounded-lg bg-background/50 border">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-sm block truncate">{buyer}</span>
                              {data.taxNo && (
                                <p className="text-xs text-muted-foreground">
                                  VKN/TCKN: {data.taxNo}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {data.count} belge
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Matrah</span>
                              <span>₺{data.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            {data.vat > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">KDV</span>
                                <span className="text-orange-600">
                                  ₺{data.vat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between font-medium pt-1 border-t border-dashed">
                              <span>Toplam (TRY)</span>
                              <span className="text-green-600">
                                ₺{data.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {receiptSummary.allIssuedCount === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Kesilen fatura bulunmuyor
                      </p>
                    )}
                    
                    {/* Genel Toplam */}
                    {receiptSummary.allIssuedCount > 0 && (
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">Kesilen Belgeler Toplamı</span>
                          <span className="text-xs text-muted-foreground">{receiptSummary.allIssuedCount} belge</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Toplam KDV</span>
                            <span className="text-orange-600">₺{receiptSummary.allIssuedVAT.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between font-bold pt-1 border-t">
                            <span>Genel Toplam (TRY)</span>
                            <span className="text-green-600">₺{receiptSummary.allIssuedTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {receiptFilter === 'domestic' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Yurtiçi Fatura Özeti (Yıla Göre)</p>
                    
                    {/* Year-by-year breakdown */}
                    {Object.entries(receiptSummary.domesticByYear)
                      .sort(([a], [b]) => Number(b) - Number(a)) // Descending by year
                      .map(([year, data]) => (
                        <div key={year} className="p-3 rounded-lg bg-background/50 border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{year}</span>
                            <span className="text-xs text-muted-foreground">{data.count} belge</span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Matrah (KDV Hariç)</span>
                              <span>₺{data.subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">KDV Tutarı</span>
                              <span className="text-orange-600">₺{data.vat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between font-medium pt-1 border-t border-dashed">
                              <span>Toplam</span>
                              <span>₺{data.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {/* Grand total summary */}
                    {Object.keys(receiptSummary.domesticByYear).length > 1 && (
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">Genel Toplam</span>
                          <span className="text-xs text-muted-foreground">{receiptSummary.allDomesticCount} belge</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Toplam Matrah</span>
                            <span>₺{receiptSummary.domesticTotalSubtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Toplam KDV</span>
                            <span className="text-orange-600">₺{receiptSummary.domesticTotalVat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between font-bold pt-1 border-t">
                            <span>Genel Toplam</span>
                            <span className="text-green-600">₺{receiptSummary.allDomesticTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {receiptFilter === 'foreign' && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Yurtdışı Fatura Özeti (Yıla Göre)</p>
                    
                    {/* Year-by-year breakdown */}
                    {Object.entries(receiptSummary.foreignByYear)
                      .sort(([a], [b]) => Number(b) - Number(a)) // Descending by year
                      .map(([year, data]) => (
                        <div key={year} className="p-3 rounded-lg bg-background/50 border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{year}</span>
                            <span className="text-xs text-muted-foreground">{data.count} belge</span>
                          </div>
                          <div className="space-y-2">
                            {Object.entries(data.byCurrency).map(([cur, curData]) => (
                              <div key={cur} className="flex items-center justify-between text-sm">
                                <div>
                                  <span className="font-medium text-blue-600">
                                    {cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur}
                                    {curData.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                  {curData.rate && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      (Kur: {curData.rate.toFixed(2)})
                                    </span>
                                  )}
                                </div>
                                <span className="text-muted-foreground">
                                  → ₺{curData.tryAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between font-medium pt-1 border-t border-dashed text-sm">
                              <span>TRY Toplam</span>
                              <span>₺{data.totalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {/* Grand total summary */}
                    {Object.keys(receiptSummary.foreignByYear).length > 1 && (
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">Genel Toplam</span>
                          <span className="text-xs text-muted-foreground">{receiptSummary.allForeignCount} belge</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          {Object.entries(receiptSummary.allForeignByCurrency).map(([cur, data]) => (
                            <div key={cur} className="flex justify-between">
                              <span className="text-muted-foreground">Toplam {cur}</span>
                              <span className="text-blue-600">
                                {cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur}
                                {data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between font-bold pt-1 border-t">
                            <span>Genel Toplam (TRY)</span>
                            <span className="text-green-600">₺{receiptSummary.allForeignTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {receiptSummary.allForeignCount === 0 && (
                      <p className="text-sm text-muted-foreground">Yurtdışı fatura bulunmuyor</p>
                    )}
                  </div>
                )}
                
                {/* Grand Total - Always show */}
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {receiptFilter === 'all' ? 'Genel Toplam' : 
                       receiptFilter === 'domestic' ? 'Yurtiçi Toplam' : 
                       receiptFilter === 'foreign' ? 'Yurtdışı Toplam' :
                       receiptFilter === 'received' ? 'Alınan Toplam' : 'Kesilen Toplam'} (TRY)
                    </span>
                    <span className={cn(
                      "text-xl font-bold",
                      receiptFilter === 'received' ? "text-purple-600" :
                      receiptFilter === 'issued' ? "text-green-600" : "text-green-600"
                    )}>
                      ₺{(receiptFilter === 'all' 
                          ? receiptSummary.grandTotalTRY 
                          : receiptFilter === 'domestic' 
                            ? receiptSummary.allDomesticTRY 
                            : receiptFilter === 'foreign'
                              ? receiptSummary.allForeignTRY
                              : receiptFilter === 'received'
                                ? receiptSummary.allReceivedTRY
                                : receiptSummary.allIssuedTRY
                        ).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                📋 {receiptFilter === 'all' ? 'Son Yüklenen Belgeler' : 
                    receiptFilter === 'domestic' ? 'Yurtiçi Belgeler' : 
                    receiptFilter === 'foreign' ? 'Yurtdışı Belgeler' :
                    receiptFilter === 'received' ? 'Alınan Belgeler' : 'Kesilen Belgeler'} ({receiptFilter === 'all' ? recentReceipts.length : receiptSummary.filteredReceipts.length})
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
