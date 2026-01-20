import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Receipt, DocumentType, ReceiptSubtype } from '@/types/finance';
import { useState, useCallback } from 'react';
import { useExchangeRates } from './useExchangeRates';

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
  const checkDuplicateReceipt = async (receiptNo: string): Promise<Receipt | null> => {
    if (!receiptNo || !user?.id) return null;
    
    const { data } = await supabase
      .from('receipts')
      .select('*, category:transaction_categories!category_id(*)')
      .eq('user_id', user.id)
      .eq('receipt_no', receiptNo)
      .maybeSingle();
    
    return data as Receipt | null;
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
  ): Promise<{ receipt: Receipt | null; skipped: boolean; duplicateInfo?: string }> => {
    // Duplicate check
    if (!skipDuplicateCheck && ocr.receiptNo) {
      const existing = await checkDuplicateReceipt(ocr.receiptNo);
      if (existing) {
        const sellerInfo = existing.seller_name || existing.vendor_name || 'Bilinmeyen satıcı';
        return { 
          receipt: null, 
          skipped: true, 
          duplicateInfo: `${ocr.receiptNo} (${sellerInfo})`
        };
      }
    }

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

    // Determine subtype from OCR or fallback logic
    let finalSubtype: ReceiptSubtype = receiptSubtype || 'slip';
    if (!receiptSubtype && ocr.documentSubtype) {
      finalSubtype = ocr.documentSubtype === 'invoice' ? 'invoice' : 'slip';
    } else if (!receiptSubtype) {
      // Fallback: PDF/XML -> invoice, images -> slip
      const isPdfOrXml = fileType === 'pdf' || fileType === 'xml' || fileName.endsWith('.pdf') || fileName.endsWith('.xml');
      finalSubtype = isPdfOrXml ? 'invoice' : 'slip';
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
    return { receipt: receipt as Receipt, skipped: false };
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