import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from './useCategories';
import { parseFile } from '@/lib/fileParser';
import { ParsedTransaction, EditableTransaction } from '@/components/finance/TransactionEditor';

export type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'categorizing' | 'saving' | 'completed' | 'error';

export function useBankFileUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);

  const reset = () => {
    setProgress(0);
    setStatus('idle');
    setParsedTransactions([]);
    setCurrentFileId(null);
  };

  // Step 1: Upload file and parse with AI (returns transactions for preview)
  const uploadAndParse = useMutation({
    mutationFn: async (file: File): Promise<ParsedTransaction[]> => {
      if (!user?.id) throw new Error('Giriş yapmalısınız');
      
      try {
        setStatus('uploading');
        setProgress(10);

        // 1. Upload to Storage
        const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
        const path = `${user.id}/bank/${Date.now()}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('finance-files')
          .upload(path, file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('finance-files')
          .getPublicUrl(path);
        
        setProgress(25);

        // 2. Create DB record
        const { data: bankFile, error: dbError } = await supabase
          .from('uploaded_bank_files')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_type: ext,
            file_size: file.size,
            file_url: publicUrl,
            processing_status: 'processing'
          })
          .select()
          .single();
        
        if (dbError) throw dbError;
        setCurrentFileId(bankFile.id);
        setProgress(35);

        // 3. Read file content (parse XLSX/PDF to text)
        const fileContent = await parseFile(file);
        
        // 4. Parse with AI (Extended Thinking enabled)
        setStatus('parsing');
        setProgress(50);
        
        const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-bank-statement', {
          body: { fileContent, fileType: ext, fileName: file.name }
        });
        
        if (parseError) throw parseError;
        
        if (!parseData?.success) {
          throw new Error(parseData?.error || 'Dosyadan işlem çıkarılamadı');
        }
        
        const parsed: ParsedTransaction[] = parseData?.transactions || [];
        
        if (parsed.length === 0) {
          throw new Error('Dosyadan işlem çıkarılamadı');
        }
        
        console.log(`Parsed ${parsed.length} transactions from file`);
        setProgress(75);
        setParsedTransactions(parsed);
        
        return parsed;
      } catch (error) {
        setStatus('error');
        throw error;
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Hata', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  // Step 2: Save categorized transactions
  const saveTransactions = useMutation({
    mutationFn: async (transactions: EditableTransaction[]) => {
      if (!user?.id) throw new Error('Giriş yapmalısınız');
      if (!currentFileId) throw new Error('Dosya ID bulunamadı');
      
      setStatus('saving');
      setProgress(85);

      // Filter only categorized transactions
      const categorizedTx = transactions.filter(t => t.categoryId);
      
      if (categorizedTx.length === 0) {
        throw new Error('En az bir işlem kategorize edilmeli');
      }

      const toInsert = categorizedTx.map((t, i) => {
        // Parse Turkish date format DD.MM.YYYY
        let transactionDate = t.date;
        if (t.date && t.date.includes('.')) {
          const parts = t.date.split('.');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            const year = y.length === 2 ? `20${y}` : y;
            transactionDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        }
        
        return {
          file_id: currentFileId,
          user_id: user.id,
          row_number: t.index + 1,
          raw_date: t.date,
          raw_description: t.description,
          raw_amount: String(t.amount),
          transaction_date: transactionDate,
          description: t.description,
          amount: t.amount,
          balance: t.balance || null,
          counterparty: t.counterparty || null,
          reference_no: t.reference || null,
          category_id: t.categoryId,
          ai_suggested_category_id: null,
          ai_confidence: 0,
          is_income: t.amount > 0,
          is_excluded: false,
          is_manually_categorized: true
        };
      });

      const { error: insertError } = await supabase
        .from('bank_transactions')
        .insert(toInsert);
      
      if (insertError) throw insertError;

      // Update file status
      await supabase
        .from('uploaded_bank_files')
        .update({ 
          processing_status: 'completed', 
          total_transactions: toInsert.length 
        })
        .eq('id', currentFileId);

      setProgress(100);
      setStatus('completed');
      
      return { fileId: currentFileId, count: toInsert.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-files'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({ 
        title: 'Başarılı', 
        description: `${data.count} işlem kaydedildi` 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Hata', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });

  return { 
    uploadAndParse,
    saveTransactions,
    progress, 
    status, 
    isUploading: uploadAndParse.isPending,
    isSaving: saveTransactions.isPending,
    parsedTransactions,
    reset 
  };
}
