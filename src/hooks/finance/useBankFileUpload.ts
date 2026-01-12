import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from './useCategories';
import { ParsedTransaction, CategoryResult } from '@/types/finance';
import { parseFile } from '@/lib/fileParser';

export type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'categorizing' | 'saving' | 'completed' | 'error';

export function useBankFileUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');

  const reset = () => {
    setProgress(0);
    setStatus('idle');
  };

  const upload = useMutation({
    mutationFn: async (file: File) => {
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
        setProgress(35);

        // 3. Read file content (parse XLSX/PDF to text)
        const fileContent = await parseFile(file);
        
        // 4. Parse with AI
        setStatus('parsing');
        const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-bank-statement', {
          body: { fileContent, fileType: ext }
        });
        
        if (parseError) throw parseError;
        const parsed: ParsedTransaction[] = parseData?.transactions || [];
        
        if (parsed.length === 0) {
          throw new Error('Dosyadan işlem çıkarılamadı');
        }
        
        setProgress(55);

        // 5. Categorize with AI
        setStatus('categorizing');
        const { data: catData, error: catError } = await supabase.functions.invoke('categorize-transactions', {
          body: { transactions: parsed, categories }
        });
        
        if (catError) throw catError;
        const catResults: CategoryResult[] = catData?.results || [];
        setProgress(75);

        // 6. Save transactions
        setStatus('saving');
        const toInsert = parsed.map((t, i) => {
          const catResult = catResults.find(r => r.index === i);
          const category = catResult ? categories.find(c => c.code === catResult.categoryCode) : null;
          
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
            file_id: bankFile.id,
            user_id: user.id,
            row_number: i + 1,
            raw_date: t.date,
            raw_description: t.description,
            raw_amount: String(t.amount),
            transaction_date: transactionDate,
            description: t.description,
            amount: t.amount,
            balance: t.balance || null,
            category_id: category?.id || null,
            ai_suggested_category_id: category?.id || null,
            ai_confidence: catResult?.confidence || 0,
            is_income: t.amount > 0,
            is_excluded: false,
            is_manually_categorized: false
          };
        });

        const { error: insertError } = await supabase
          .from('bank_transactions')
          .insert(toInsert);
        
        if (insertError) throw insertError;

        // 7. Update file status
        await supabase
          .from('uploaded_bank_files')
          .update({ 
            processing_status: 'completed', 
            total_transactions: toInsert.length 
          })
          .eq('id', bankFile.id);

        setProgress(100);
        setStatus('completed');
        
        return { fileId: bankFile.id, count: toInsert.length };
      } catch (error) {
        setStatus('error');
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bank-files'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({ 
        title: 'Başarılı', 
        description: `${data.count} işlem yüklendi ve kategorize edildi` 
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
    upload, 
    progress, 
    status, 
    isUploading: upload.isPending,
    reset 
  };
}
