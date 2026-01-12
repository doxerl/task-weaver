import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Receipt, DocumentType } from '@/types/finance';
import { useState, useCallback } from 'react';

export function useReceipts(year?: number, month?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  
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

  const uploadReceipt = useMutation({
    mutationFn: async ({ file, documentType = 'received' }: { file: File; documentType?: DocumentType }) => {
      if (!user?.id) throw new Error('Giriş yapmalısınız');
      
      setUploadProgress(20);
      
      const isImage = file.type.startsWith('image/');
      const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'pdf');
      const path = `${user.id}/receipts/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('finance-files')
        .upload(path, file);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('finance-files')
        .getPublicUrl(path);
      
      setUploadProgress(50);

      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('parse-receipt', {
        body: { imageUrl: publicUrl, documentType }
      });
      
      if (ocrError) throw ocrError;
      const ocr = ocrData?.result || {};
      
      setUploadProgress(80);

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

      const { data: receipt, error: insertError } = await supabase
        .from('receipts')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_type: isImage ? 'image' : 'pdf',
          file_url: publicUrl,
          thumbnail_url: isImage ? publicUrl : null,
          document_type: documentType,
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
          tax_amount: ocr.vatAmount || ocr.taxAmount || null,
          vat_rate: ocr.vatRate || null,
          vat_amount: ocr.vatAmount || null,
          withholding_tax_rate: ocr.withholdingTaxRate || null,
          withholding_tax_amount: ocr.withholdingTaxAmount || null,
          stamp_tax_amount: ocr.stampTaxAmount || null,
          currency: ocr.currency || 'TRY',
          ocr_confidence: ocr.confidence || 0,
          month: receiptMonth,
          year: receiptYear,
          processing_status: 'completed',
          match_status: 'unmatched'
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setUploadProgress(100);
      return receipt;
    },
    onSuccess: async (receipt) => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Fiş yüklendi ve analiz edildi' });
      setUploadProgress(0);
      
      // Trigger auto-matching after upload
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