import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Receipt, DocumentType } from '@/types/finance';
import { useState } from 'react';

export function useReceipts(year?: number, month?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);

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
      
      // Map data to include default values for new fields
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
      
      // 1. Upload to Storage
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

      // 2. OCR with AI
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('parse-receipt', {
        body: { imageUrl: publicUrl, documentType }
      });
      
      if (ocrError) throw ocrError;
      const ocr = ocrData?.result || {};
      
      setUploadProgress(80);

      // 3. Parse date and save
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
          
          // Seller info
          seller_name: ocr.sellerName || null,
          seller_tax_no: ocr.sellerTaxNo || null,
          seller_address: ocr.sellerAddress || null,
          
          // Buyer info
          buyer_name: ocr.buyerName || null,
          buyer_tax_no: ocr.buyerTaxNo || null,
          buyer_address: ocr.buyerAddress || null,
          
          // Legacy compatibility
          vendor_name: ocr.sellerName || ocr.vendorName || null,
          vendor_tax_no: ocr.sellerTaxNo || ocr.vendorTaxNo || null,
          
          receipt_date: receiptDate,
          receipt_no: ocr.receiptNo || null,
          
          // Amounts
          subtotal: ocr.subtotal || null,
          total_amount: ocr.totalAmount || null,
          tax_amount: ocr.vatAmount || ocr.taxAmount || null,
          
          // Tax breakdown
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Fiş yüklendi ve analiz edildi' });
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
      setUploadProgress(0);
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

  const stats = {
    total: receipts.length,
    includedInReport: receipts.filter(r => r.is_included_in_report).length,
    totalAmount: receipts.filter(r => r.is_included_in_report).reduce((sum, r) => sum + (r.total_amount || 0), 0),
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
    deleteReceipt
  };
}