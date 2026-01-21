import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Receipt, DocumentType, ReceiptSubtype } from '@/types/finance';
import { useState, useCallback } from 'react';
import { useExchangeRates } from './useExchangeRates';

// Batch upload types
export interface BatchFileResult {
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'duplicate';
  receipt?: Receipt;
  error?: string;
  duplicateType?: 'receipt_no' | 'file_date' | 'soft';
}

// Duplicate check result type
interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: 'receipt_no' | 'file_date' | 'soft' | null;
  existingReceipt: Receipt | null;
  message: string | null;
}

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  currentFile: string;
  processedFiles: number;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  results: BatchFileResult[];
}

const BATCH_SIZE = 3; // Process 3 files in parallel
const BATCH_DELAY_MS = 500; // Delay between batches to prevent rate limiting

// Helper to chunk array
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function useReceipts(year?: number, month?: number) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Exchange rates for foreign invoice conversion
  const { getRate: getExchangeRate } = useExchangeRates();
  
  // Reprocess state
  const [reprocessProgress, setReprocessProgress] = useState(0);
  const [reprocessedCount, setReprocessedCount] = useState(0);
  const [reprocessResults, setReprocessResults] = useState<Array<{ id: string; success: boolean; vatAmount?: number }>>([]);
  
  // Batch upload state
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  const { data: receipts = [], isLoading, error } = useQuery({
    queryKey: ['receipts', user?.id, year, month],
    queryFn: async () => {
      let query = supabase
        .from('receipts')
        .select('*, category:transaction_categories!category_id(*)')
        .eq('user_id', user?.id)
        .order('receipt_date', { ascending: false });
      
      if (year) query = query.eq('year', year);
      if (month) query = query.eq('month', month);

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(r => ({
        ...r,
        document_type: r.document_type || 'received',
        match_status: r.match_status || 'unmatched',
        match_confidence: r.match_confidence || 0,
      })) as Receipt[];
    },
    enabled: !!user?.id
  });

  // Helper to check for duplicate receipts by receipt_no
  const checkDuplicateByReceiptNo = async (receiptNo: string): Promise<Receipt | null> => {
    if (!receiptNo || !user?.id) return null;
    
    const { data } = await supabase
      .from('receipts')
      .select('*, category:transaction_categories!category_id(*)')
      .eq('user_id', user.id)
      .eq('receipt_no', receiptNo)
      .maybeSingle();
    
    return data as Receipt | null;
  };

  // Helper to check for duplicate by file name + date combination
  const checkDuplicateByFileAndDate = async (
    fileName: string, 
    receiptDate: string | null
  ): Promise<Receipt | null> => {
    if (!fileName || !user?.id) return null;
    
    // Normalize file name (remove extension, lowercase, trim)
    const normalizedName = fileName.replace(/\.[^/.]+$/, '').toLowerCase().trim();
    
    let query = supabase
      .from('receipts')
      .select('*, category:transaction_categories!category_id(*)')
      .eq('user_id', user.id);
    
    // If date available, filter by date as well
    if (receiptDate) {
      query = query.eq('receipt_date', receiptDate);
    }
    
    const { data } = await query;
    
    // Check file name similarity
    const match = data?.find(r => {
      const existingName = (r.file_name || '').replace(/\.[^/.]+$/, '').toLowerCase().trim();
      return existingName === normalizedName || 
             existingName.includes(normalizedName) || 
             normalizedName.includes(existingName);
    });
    
    return match as Receipt | null;
  };

  // Helper to check for soft duplicates (same seller + amount + date)
  const checkSoftDuplicate = async (
    sellerName: string | null,
    totalAmount: number | null,
    receiptDate: string | null
  ): Promise<Receipt | null> => {
    if (!sellerName || !totalAmount || !receiptDate || !user?.id) return null;
    
    // Use a tolerance for amount matching (within 1 TL)
    const { data } = await supabase
      .from('receipts')
      .select('*, category:transaction_categories!category_id(*)')
      .eq('user_id', user.id)
      .eq('receipt_date', receiptDate)
      .gte('total_amount', totalAmount - 1)
      .lte('total_amount', totalAmount + 1);
    
    // Check seller name similarity
    const normalizedSeller = sellerName.toLowerCase().trim();
    const match = data?.find(r => {
      const existingSeller = (r.seller_name || r.vendor_name || '').toLowerCase().trim();
      return existingSeller.includes(normalizedSeller) || 
             normalizedSeller.includes(existingSeller);
    });
    
    return match as Receipt | null;
  };

  // Multi-layer duplicate check
  const checkForDuplicate = async (
    ocr: Record<string, any>,
    fileName: string,
    receiptDate: string | null
  ): Promise<DuplicateCheckResult> => {
    // 1. First check by receipt_no (most reliable)
    if (ocr.receiptNo) {
      const existing = await checkDuplicateByReceiptNo(ocr.receiptNo);
      if (existing) {
        const sellerInfo = existing.seller_name || existing.vendor_name || 'Bilinmeyen satıcı';
        return {
          isDuplicate: true,
          duplicateType: 'receipt_no',
          existingReceipt: existing,
          message: `Fiş No: ${ocr.receiptNo} zaten kayıtlı (${sellerInfo})`
        };
      }
    }
    
    // 2. Check by file name + date combination
    const fileMatch = await checkDuplicateByFileAndDate(fileName, receiptDate);
    if (fileMatch) {
      return {
        isDuplicate: true,
        duplicateType: 'file_date',
        existingReceipt: fileMatch,
        message: `"${fileName}" dosyası ${receiptDate ? 'bu tarihte' : ''} zaten yüklenmiş`
      };
    }
    
    // 3. Soft duplicate check (warning only)
    const softMatch = await checkSoftDuplicate(
      ocr.sellerName || ocr.vendorName,
      ocr.totalAmount,
      receiptDate
    );
    if (softMatch) {
      const sellerInfo = softMatch.seller_name || softMatch.vendor_name || 'Bilinmeyen';
      return {
        isDuplicate: false, // Allow upload but warn
        duplicateType: 'soft',
        existingReceipt: softMatch,
        message: `Benzer belge bulundu: ${sellerInfo} - ₺${softMatch.total_amount?.toLocaleString('tr-TR')}`
      };
    }
    
    return {
      isDuplicate: false,
      duplicateType: null,
      existingReceipt: null,
      message: null
    };
  };

  // Helper to save a single receipt from parsed data
  const saveReceiptFromOCR = async (
    ocr: Record<string, any>,
    fileUrl: string,
    fileName: string,
    fileType: string,
    documentType: DocumentType,
    receiptSubtype?: ReceiptSubtype,
    skipDuplicateCheck = false
  ): Promise<{ 
    receipt: Receipt | null; 
    skipped: boolean; 
    duplicateInfo?: string;
    duplicateType?: 'receipt_no' | 'file_date' | 'soft';
    softDuplicateWarning?: string;
  }> => {
    // Parse date first (needed for duplicate check)
    let receiptDate = null;
    let receiptMonth = new Date().getMonth() + 1;
    let receiptYear = new Date().getFullYear();
    
    if (ocr.receiptDate) {
      const parts = ocr.receiptDate.split('.');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        const year = y.length === 2 ? `20${y}` : y;
        receiptDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        receiptMonth = parseInt(m);
        receiptYear = parseInt(year);
      }
    }

    // Multi-layer duplicate check
    let softDuplicateWarning: string | undefined;
    if (!skipDuplicateCheck) {
      const duplicateCheck = await checkForDuplicate(ocr, fileName, receiptDate);
      
      if (duplicateCheck.isDuplicate) {
        return { 
          receipt: null, 
          skipped: true, 
          duplicateInfo: duplicateCheck.message || 'Duplicate bulundu',
          duplicateType: duplicateCheck.duplicateType || undefined
        };
      }
      
      // Soft duplicate: allow but warn
      if (duplicateCheck.duplicateType === 'soft') {
        console.log('Soft duplicate warning:', duplicateCheck.message);
        softDuplicateWarning = duplicateCheck.message || undefined;
      }
    }

    // Determine subtype with strict priority order
    let finalSubtype: ReceiptSubtype;
    
    // 1. Priority: User's UI selection (ALWAYS takes precedence)
    if (receiptSubtype) {
      finalSubtype = receiptSubtype;
      console.log('Using user-selected subtype:', finalSubtype);
    }
    // 2. OCR detected documentSubtype
    else if (ocr.documentSubtype && ['slip', 'invoice'].includes(ocr.documentSubtype)) {
      finalSubtype = ocr.documentSubtype as ReceiptSubtype;
      console.log('Using OCR-detected subtype:', finalSubtype);
    }
    // 3. GIB number indicates Turkish e-Invoice
    else if (ocr.receiptNo && ocr.receiptNo.toUpperCase().startsWith('GIB')) {
      finalSubtype = 'invoice';
      console.log('Detected GIB number, setting as invoice');
    }
    // 4. PDF/XML files are typically invoices
    else if (fileType === 'pdf' || fileType === 'xml' || fileName.endsWith('.pdf') || fileName.endsWith('.xml')) {
      finalSubtype = 'invoice';
      console.log('PDF/XML file detected, setting as invoice');
    }
    // 5. HTML files (e-Arşiv) are typically invoices
    else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      finalSubtype = 'invoice';
      console.log('HTML file detected (e-Arşiv), setting as invoice');
    }
    // 6. Default: slip
    else {
      finalSubtype = 'slip';
      console.log('Defaulting to slip');
    }

    // Foreign invoice detection
    const isForeignInvoice = ocr.isForeign === true || 
      (ocr.currency && ocr.currency !== 'TRY');
    
    // Currency conversion for foreign invoices
    let originalAmount: number | null = null;
    let originalCurrency: string | null = null;
    let exchangeRateUsed: number | null = null;
    let amountTry: number | null = null;
    
    if (isForeignInvoice && ocr.currency && ocr.currency !== 'TRY') {
      originalCurrency = ocr.currency;
      originalAmount = ocr.totalAmount || null;
      
      // Get exchange rate for the receipt month
      if (originalAmount && receiptYear && receiptMonth) {
        const rate = getExchangeRate(receiptYear, receiptMonth);
        if (rate && (ocr.currency === 'USD' || ocr.currency === 'EUR')) {
          // For now only USD/TRY is supported, EUR will use same rate as approximation
          exchangeRateUsed = rate;
          amountTry = originalAmount * rate;
        }
      }
    }

    const { data: receipt, error: insertError } = await supabase
      .from('receipts')
      .insert({
        user_id: user!.id,
        file_name: fileName,
        file_type: fileType,
        file_url: fileUrl,
        thumbnail_url: fileType === 'image' ? fileUrl : null,
        document_type: documentType,
        receipt_subtype: finalSubtype,
        seller_name: ocr.sellerName || null,
        seller_tax_no: ocr.sellerTaxNo || null,
        seller_address: ocr.sellerAddress || null,
        buyer_name: ocr.buyerName || null,
        buyer_tax_no: ocr.buyerTaxNo || null,
        buyer_address: ocr.buyerAddress || null,
        vendor_name: ocr.sellerName || ocr.vendorName || null,
        vendor_tax_no: ocr.sellerTaxNo || ocr.vendorTaxNo || null,
        receipt_date: receiptDate,
        receipt_no: ocr.receiptNo || null,
        subtotal: ocr.subtotal || null,
        total_amount: ocr.totalAmount || null,
        tax_amount: isForeignInvoice ? 0 : (ocr.vatAmount || ocr.taxAmount || null),
        vat_rate: isForeignInvoice ? 0 : (ocr.vatRate || null),
        vat_amount: isForeignInvoice ? 0 : (ocr.vatAmount || null),
        withholding_tax_rate: ocr.withholdingTaxRate || null,
        withholding_tax_amount: ocr.withholdingTaxAmount || null,
        stamp_tax_amount: ocr.stampTaxAmount || null,
        currency: ocr.currency || 'TRY',
        ocr_confidence: ocr.confidence || 0,
        month: receiptMonth,
        year: receiptYear,
        processing_status: 'completed',
        match_status: 'unmatched',
        // Foreign invoice fields
        is_foreign_invoice: isForeignInvoice,
        original_currency: originalCurrency,
        original_amount: originalAmount,
        exchange_rate_used: exchangeRateUsed,
        amount_try: amountTry || (isForeignInvoice ? null : ocr.totalAmount)
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    return { receipt: receipt as Receipt, skipped: false, softDuplicateWarning };
  };

  const uploadReceipt = useMutation({
    mutationFn: async ({ file, documentType = 'received', receiptSubtype }: { file: File; documentType?: DocumentType; receiptSubtype?: ReceiptSubtype }): Promise<Receipt | Receipt[]> => {
      if (!user?.id) throw new Error('Giriş yapmalısınız');
      
      setUploadProgress(10);
      
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isZip = ext === 'zip';
      const isXml = ext === 'xml';
      const isImage = file.type.startsWith('image/');
      const fileExt = ext || (isImage ? 'jpg' : 'pdf');
      const path = `${user.id}/receipts/${Date.now()}.${fileExt}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('finance-files')
        .upload(path, file);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('finance-files')
        .getPublicUrl(path);
      
      setUploadProgress(30);

      // Handle ZIP files
      if (isZip) {
        const { data: zipData, error: zipError } = await supabase.functions.invoke('parse-zip-receipts', {
          body: { zipUrl: publicUrl, documentType }
        });
        
        if (zipError) throw zipError;
        
        const results = zipData?.results || [];
        const savedReceipts: Receipt[] = [];
        const skippedDuplicates: string[] = [];
        
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.success && result.result) {
            try {
              const saveResult = await saveReceiptFromOCR(
                result.result,
                publicUrl, // Use ZIP URL as reference
                result.fileName,
                result.fileType,
                documentType,
                receiptSubtype
              );
              if (saveResult.skipped && saveResult.duplicateInfo) {
                skippedDuplicates.push(saveResult.duplicateInfo);
              } else if (saveResult.receipt) {
                savedReceipts.push(saveResult.receipt);
              }
            } catch (e) {
              console.warn('Failed to save receipt from ZIP:', result.fileName, e);
            }
          }
          setUploadProgress(30 + ((i + 1) / results.length) * 60);
        }
        
        // Show duplicate warning if any
        if (skippedDuplicates.length > 0) {
          toast({ 
            title: 'Bazı belgeler zaten mevcut', 
            description: `${skippedDuplicates.length} duplike atlandı: ${skippedDuplicates.slice(0, 3).join(', ')}${skippedDuplicates.length > 3 ? '...' : ''}`,
            variant: 'default'
          });
        }
        
        setUploadProgress(100);
        return savedReceipts;
      }

      // Handle XML e-Fatura
      if (isXml) {
        // Read XML content
        const xmlContent = await file.text();
        
        const { data: xmlData, error: xmlError } = await supabase.functions.invoke('parse-xml-invoice', {
          body: { xmlContent, documentType }
        });
        
        if (xmlError) throw xmlError;
        
        setUploadProgress(80);
        
        const ocr = xmlData?.result || {};
        const saveResult = await saveReceiptFromOCR(ocr, publicUrl, file.name, 'xml', documentType, 'invoice');
        
        if (saveResult.skipped && saveResult.duplicateInfo) {
          throw new Error(`Bu fatura zaten yüklenmiş: ${saveResult.duplicateInfo}`);
        }
        
        setUploadProgress(100);
        return saveResult.receipt as Receipt;
      }

      // Handle images and PDFs (existing logic)
      setUploadProgress(50);

      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('parse-receipt', {
        body: { imageUrl: publicUrl, documentType }
      });
      
      if (ocrError) throw ocrError;
      const ocr = ocrData?.result || {};
      
      setUploadProgress(80);

      const saveResult = await saveReceiptFromOCR(
        ocr,
        publicUrl,
        file.name,
        isImage ? 'image' : 'pdf',
        documentType,
        receiptSubtype
      );
      
      if (saveResult.skipped && saveResult.duplicateInfo) {
        throw new Error(`Bu belge zaten yüklenmiş: ${saveResult.duplicateInfo}`);
      }
      
      setUploadProgress(100);
      return saveResult.receipt as Receipt;
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      
      const receipts = Array.isArray(result) ? result : [result];
      const count = receipts.length;
      
      if (count > 1) {
        toast({ title: `${count} belge yüklendi ve analiz edildi` });
      } else {
        toast({ title: 'Fiş yüklendi ve analiz edildi' });
      }
      
      setUploadProgress(0);
      
      // Trigger auto-matching for each receipt
      for (const receipt of receipts) {
        if (receipt?.id) {
          try {
            await supabase.functions.invoke('match-receipts', {
              body: { receiptId: receipt.id }
            });
            queryClient.invalidateQueries({ queryKey: ['receipt-matches', receipt.id] });
          } catch (e) {
            console.warn('Auto-match failed:', e);
          }
        }
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
      setUploadProgress(0);
    }
  });

  // Reprocess single receipt OCR
  const reprocessReceipt = useMutation({
    mutationFn: async (receiptId: string) => {
      const receipt = receipts.find(r => r.id === receiptId);
      if (!receipt?.file_url) throw new Error('Dosya bulunamadı');
      
      const { data: ocrData, error } = await supabase.functions.invoke('parse-receipt', {
        body: { imageUrl: receipt.file_url, documentType: receipt.document_type }
      });
      
      if (error) throw error;
      const ocr = ocrData?.result || {};
      
      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          seller_name: ocr.sellerName || receipt.seller_name,
          seller_tax_no: ocr.sellerTaxNo || receipt.seller_tax_no,
          buyer_name: ocr.buyerName || receipt.buyer_name,
          subtotal: ocr.subtotal ?? receipt.subtotal,
          vat_rate: ocr.vatRate ?? receipt.vat_rate,
          vat_amount: ocr.vatAmount ?? receipt.vat_amount,
          total_amount: ocr.totalAmount ?? receipt.total_amount,
          ocr_confidence: ocr.confidence ?? receipt.ocr_confidence,
        })
        .eq('id', receiptId);
      
      if (updateError) throw updateError;
      
      return { vatAmount: ocr.vatAmount };
    }
  });

  // Reprocess multiple receipts
  const reprocessMultiple = useCallback(async (receiptIds: string[]) => {
    setReprocessProgress(0);
    setReprocessedCount(0);
    setReprocessResults([]);
    
    const results: Array<{ id: string; success: boolean; vatAmount?: number }> = [];
    
    for (let i = 0; i < receiptIds.length; i++) {
      const id = receiptIds[i];
      try {
        const result = await reprocessReceipt.mutateAsync(id);
        results.push({ id, success: true, vatAmount: result.vatAmount });
      } catch {
        results.push({ id, success: false });
      }
      
      setReprocessedCount(i + 1);
      setReprocessProgress(((i + 1) / receiptIds.length) * 100);
      setReprocessResults([...results]);
    }
    
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    
    const found = results.filter(r => r.success && r.vatAmount).length;
    toast({ 
      title: 'OCR tamamlandı',
      description: `${found}/${receiptIds.length} belgede KDV bilgisi bulundu`
    });
    
    return results;
  }, [reprocessReceipt, queryClient, toast]);

  // Batch upload single file processor
  const processFileForBatch = async (
    file: File,
    documentType: DocumentType,
    receiptSubtype?: ReceiptSubtype
  ): Promise<{ receipt: Receipt | null; status: 'success' | 'failed' | 'duplicate'; error?: string; duplicateType?: 'receipt_no' | 'file_date' | 'soft'; softDuplicateWarning?: string }> => {
    if (!user?.id) throw new Error('Giriş yapmalısınız');
    
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isXml = ext === 'xml';
    const isImage = file.type.startsWith('image/');
    const fileExt = ext || (isImage ? 'jpg' : 'pdf');
    const path = `${user.id}/receipts/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    
    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('finance-files')
      .upload(path, file);
    
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('finance-files')
      .getPublicUrl(path);
    
    // Handle XML e-Fatura
    if (isXml) {
      const xmlContent = await file.text();
      
      const { data: xmlData, error: xmlError } = await supabase.functions.invoke('parse-xml-invoice', {
        body: { xmlContent, documentType }
      });
      
      if (xmlError) throw xmlError;
      
      const ocr = xmlData?.result || {};
      const saveResult = await saveReceiptFromOCR(ocr, publicUrl, file.name, 'xml', documentType, 'invoice');
      
      if (saveResult.skipped) {
        return { 
          receipt: null, 
          status: 'duplicate', 
          error: saveResult.duplicateInfo,
          duplicateType: saveResult.duplicateType
        };
      }
      
      return { 
        receipt: saveResult.receipt, 
        status: 'success',
        softDuplicateWarning: saveResult.softDuplicateWarning
      };
    }

    // Handle images and PDFs
    const { data: ocrData, error: ocrError } = await supabase.functions.invoke('parse-receipt', {
      body: { imageUrl: publicUrl, documentType }
    });
    
    if (ocrError) throw ocrError;
    const ocr = ocrData?.result || {};
    
    const saveResult = await saveReceiptFromOCR(
      ocr,
      publicUrl,
      file.name,
      isImage ? 'image' : 'pdf',
      documentType,
      receiptSubtype
    );
    
    if (saveResult.skipped) {
      return { 
        receipt: null, 
        status: 'duplicate', 
        error: saveResult.duplicateInfo,
        duplicateType: saveResult.duplicateType
      };
    }
    
    return { 
      receipt: saveResult.receipt, 
      status: 'success',
      softDuplicateWarning: saveResult.softDuplicateWarning
    };
  };

  // Batch upload mutation
  const uploadReceiptsBatch = useMutation({
    mutationFn: async ({ 
      files, 
      documentType = 'received', 
      receiptSubtype,
      onProgress
    }: { 
      files: File[]; 
      documentType?: DocumentType; 
      receiptSubtype?: ReceiptSubtype;
      onProgress?: (progress: BatchProgress) => void;
    }): Promise<BatchFileResult[]> => {
      if (!user?.id) throw new Error('Giriş yapmalısınız');
      
      // Filter out ZIP files - they should use single upload
      const nonZipFiles = files.filter(f => !f.name.toLowerCase().endsWith('.zip'));
      
      const results: BatchFileResult[] = nonZipFiles.map(f => ({
        fileName: f.name,
        status: 'pending' as const
      }));
      
      const batches = chunkArray(nonZipFiles, BATCH_SIZE);
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let duplicateCount = 0;
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        // Update progress for batch start
        const progress: BatchProgress = {
          currentBatch: batchIndex + 1,
          totalBatches: batches.length,
          currentFile: batch.map(f => f.name).join(', '),
          processedFiles: processedCount,
          totalFiles: nonZipFiles.length,
          successCount,
          failedCount,
          duplicateCount,
          results: [...results]
        };
        
        setBatchProgress(progress);
        onProgress?.(progress);
        
        // Mark batch files as processing
        batch.forEach((file) => {
          const idx = nonZipFiles.indexOf(file);
          if (idx >= 0) {
            results[idx].status = 'processing';
          }
        });
        
        // Process batch in parallel
        const batchResults = await Promise.allSettled(
          batch.map(file => processFileForBatch(file, documentType, receiptSubtype))
        );
        
        // Update results
        batchResults.forEach((result, idx) => {
          const fileIndex = batchIndex * BATCH_SIZE + idx;
          
          if (result.status === 'fulfilled') {
            const { receipt, status, error, duplicateType } = result.value as { 
              receipt: Receipt | null; 
              status: 'success' | 'failed' | 'duplicate'; 
              error?: string;
              duplicateType?: 'receipt_no' | 'file_date' | 'soft';
            };
            results[fileIndex] = {
              fileName: nonZipFiles[fileIndex].name,
              status,
              receipt: receipt || undefined,
              error,
              duplicateType
            };
            
            if (status === 'success') successCount++;
            else if (status === 'duplicate') duplicateCount++;
          } else {
            results[fileIndex] = {
              fileName: nonZipFiles[fileIndex].name,
              status: 'failed',
              error: result.reason?.message || 'Bilinmeyen hata'
            };
            failedCount++;
          }
          
          processedCount++;
        });
        
        // Update progress after batch
        const updatedProgress: BatchProgress = {
          currentBatch: batchIndex + 1,
          totalBatches: batches.length,
          currentFile: '',
          processedFiles: processedCount,
          totalFiles: nonZipFiles.length,
          successCount,
          failedCount,
          duplicateCount,
          results: [...results]
        };
        
        setBatchProgress(updatedProgress);
        onProgress?.(updatedProgress);
        
        // Delay between batches (except last)
        if (batchIndex < batches.length - 1) {
          await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
        }
      }
      
      return results;
    },
    onSuccess: async (results) => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      
      const successReceipts = results.filter(r => r.status === 'success' && r.receipt);
      const duplicateCount = results.filter(r => r.status === 'duplicate').length;
      const failedCount = results.filter(r => r.status === 'failed').length;
      
      let message = `${successReceipts.length} belge yüklendi`;
      if (duplicateCount > 0) message += `, ${duplicateCount} duplike atlandı`;
      if (failedCount > 0) message += `, ${failedCount} başarısız`;
      
      toast({ title: message });
      
      // Trigger auto-matching for successful receipts
      for (const result of successReceipts) {
        if (result.receipt?.id) {
          try {
            await supabase.functions.invoke('match-receipts', {
              body: { receiptId: result.receipt.id }
            });
          } catch (e) {
            console.warn('Auto-match failed:', e);
          }
        }
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    },
    onSettled: () => {
      // Keep batch progress visible for a moment, then clear
      setTimeout(() => setBatchProgress(null), 2000);
    }
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string | null }) => {
      const { error } = await supabase
        .from('receipts')
        .update({ 
          category_id: categoryId, 
          is_manually_categorized: true 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    }
  });

  const toggleIncludeInReport = useMutation({
    mutationFn: async ({ id, include }: { id: string; include: boolean }) => {
      const { error } = await supabase
        .from('receipts')
        .update({ 
          is_included_in_report: include, 
          is_verified: include 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    }
  });

  const deleteReceipt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Fiş silindi' });
    }
  });

  // Update receipt fields
  const updateReceipt = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Receipt> }) => {
      const { error } = await supabase
        .from('receipts')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Fiş güncellendi' });
    },
    onError: (error: Error) => {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    }
  });

  // Missing VAT receipts
  const missingVatReceipts = receipts.filter(r => 
    r.is_included_in_report && 
    (r.vat_amount === null || r.vat_amount === 0)
  );

  const stats = {
    total: receipts.length,
    includedInReport: receipts.filter(r => r.is_included_in_report).length,
    totalAmount: receipts.filter(r => r.is_included_in_report).reduce((sum, r) => sum + (r.total_amount || 0), 0),
    missingVatCount: missingVatReceipts.length,
  };

  return { 
    receipts, 
    isLoading, 
    error,
    stats,
    uploadProgress,
    uploadReceipt, 
    // Batch upload
    uploadReceiptsBatch,
    batchProgress,
    isBatchUploading: uploadReceiptsBatch.isPending,
    updateCategory,
    toggleIncludeInReport,
    deleteReceipt,
    updateReceipt,
    // Reprocess exports
    missingVatReceipts,
    reprocessReceipt,
    reprocessMultiple,
    reprocessProgress,
    reprocessedCount,
    reprocessResults,
    isReprocessing: reprocessReceipt.isPending,
  };
}