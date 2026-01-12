import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from './useCategories';
import { parseFile } from '@/lib/fileParser';
import { ParsedTransaction, EditableTransaction } from '@/components/finance/TransactionEditor';

export type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'categorizing' | 'saving' | 'completed' | 'error';

export interface BatchProgress {
  current: number;
  total: number;
  processedTransactions: number;
  totalTransactions: number;
  estimatedTimeLeft: number;
  stage: 'parsing' | 'categorizing';
}

const PARSE_BATCH_SIZE = 10; // 10 satır per parse batch
const CATEGORIZE_BATCH_SIZE = 25;
const ESTIMATED_SECONDS_PER_PARSE_BATCH = 15;
const ESTIMATED_SECONDS_PER_CATEGORIZE_BATCH = 6;

export function useBankFileUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    current: 0,
    total: 0,
    processedTransactions: 0,
    totalTransactions: 0,
    estimatedTimeLeft: 0,
    stage: 'parsing',
  });
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearProgressInterval();
    setProgress(0);
    setStatus('idle');
    setParsedTransactions([]);
    setCurrentFileId(null);
    setBatchProgress({
      current: 0,
      total: 0,
      processedTransactions: 0,
      totalTransactions: 0,
      estimatedTimeLeft: 0,
      stage: 'parsing',
    });
  }, [clearProgressInterval]);

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
        
        setProgress(20);

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
        setProgress(25);

        // 3. Read file content (parse XLSX/PDF to text)
        const fileContent = await parseFile(file);
        console.log('File content length:', fileContent.length);
        
        // 4. Split into batches (10 lines each)
        setStatus('parsing');
        setProgress(30);
        
        const lines = fileContent.split('\n').filter(line => line.trim());
        const headerLine = lines[0] || ''; // First line is header
        const dataLines = lines.slice(1); // Data lines
        
        console.log(`Total lines: ${lines.length}, Data lines: ${dataLines.length}`);
        
        // Create batches of 10 data lines
        const batches: string[] = [];
        for (let i = 0; i < dataLines.length; i += PARSE_BATCH_SIZE) {
          const batchLines = dataLines.slice(i, i + PARSE_BATCH_SIZE);
          batches.push([headerLine, ...batchLines].join('\n'));
        }
        
        const totalParseBatches = batches.length;
        console.log(`Created ${totalParseBatches} parse batches`);
        
        // Initialize batch progress for parsing
        setBatchProgress({
          current: 0,
          total: totalParseBatches,
          processedTransactions: 0,
          totalTransactions: dataLines.length,
          estimatedTimeLeft: totalParseBatches * ESTIMATED_SECONDS_PER_PARSE_BATCH,
          stage: 'parsing',
        });

        // 5. Process each batch sequentially
        const allTransactions: ParsedTransaction[] = [];
        let failedBatches = 0;
        
        for (let i = 0; i < batches.length; i++) {
          const batchContent = batches[i];
          
          // Update progress before each batch
          setBatchProgress(prev => ({
            ...prev,
            current: i,
            processedTransactions: allTransactions.length,
            estimatedTimeLeft: Math.max(0, (totalParseBatches - i) * ESTIMATED_SECONDS_PER_PARSE_BATCH),
            stage: 'parsing',
          }));
          
          try {
            console.log(`Processing parse batch ${i + 1}/${totalParseBatches}`);
            
            const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-bank-statement', {
              body: { 
                fileContent: batchContent, 
                fileType: ext, 
                fileName: file.name,
                batchIndex: i,
                totalBatches: totalParseBatches
              }
            });
            
            if (parseError) {
              console.warn(`Batch ${i + 1} error:`, parseError.message);
              failedBatches++;
              continue;
            }
            
            if (parseData?.success && parseData?.transactions?.length > 0) {
              // Add offset to index based on batch position
              const offsetTransactions = parseData.transactions.map((t: any, idx: number) => ({
                ...t,
                index: (i * PARSE_BATCH_SIZE) + idx
              }));
              allTransactions.push(...offsetTransactions);
              console.log(`Batch ${i + 1}: Got ${parseData.transactions.length} transactions`);
            } else {
              console.warn(`Batch ${i + 1}: No transactions returned`);
              failedBatches++;
            }
          } catch (batchErr) {
            console.error(`Batch ${i + 1} exception:`, batchErr);
            failedBatches++;
          }
          
          // Update overall progress
          const parseProgress = 30 + ((i + 1) / totalParseBatches) * 35;
          setProgress(parseProgress);
        }
        
        // Parsing complete
        setBatchProgress(prev => ({
          ...prev,
          current: totalParseBatches,
          processedTransactions: allTransactions.length,
          estimatedTimeLeft: 0,
          stage: 'parsing',
        }));
        
        console.log(`Parsing complete: ${allTransactions.length} transactions from ${totalParseBatches - failedBatches}/${totalParseBatches} batches`);
        
        if (allTransactions.length === 0) {
          throw new Error('Dosyadan işlem çıkarılamadı. Lütfen farklı bir format deneyin.');
        }
        
        let parsed = allTransactions;
        setProgress(65);

        // Step 6: AI Kategorilendirme with batch progress
        setStatus('categorizing');
        
        const totalCatBatches = Math.ceil(parsed.length / CATEGORIZE_BATCH_SIZE);
        
        // Initialize batch progress for categorization
        setBatchProgress({
          current: 0,
          total: totalCatBatches,
          processedTransactions: 0,
          totalTransactions: parsed.length,
          estimatedTimeLeft: totalCatBatches * ESTIMATED_SECONDS_PER_CATEGORIZE_BATCH,
          stage: 'categorizing',
        });

        // Start simulated progress interval for categorization
        let simulatedBatch = 0;
        clearProgressInterval();
        progressIntervalRef.current = setInterval(() => {
          simulatedBatch += 1;
          if (simulatedBatch >= totalCatBatches) {
            clearProgressInterval();
          }
          setBatchProgress(prev => ({
            ...prev,
            current: Math.min(simulatedBatch, prev.total),
            processedTransactions: Math.min(simulatedBatch * CATEGORIZE_BATCH_SIZE, parsed.length),
            estimatedTimeLeft: Math.max(0, (prev.total - simulatedBatch) * ESTIMATED_SECONDS_PER_CATEGORIZE_BATCH),
            stage: 'categorizing',
          }));
        }, ESTIMATED_SECONDS_PER_CATEGORIZE_BATCH * 1000);
        
        try {
          const { data: catData, error: catError } = await supabase.functions.invoke('categorize-transactions', {
            body: { transactions: parsed, categories }
          });
          
          // Kategorilendirme tamamlandı - batch progress'i tamamla
          clearProgressInterval();
          setBatchProgress(prev => ({
            ...prev,
            current: prev.total,
            processedTransactions: parsed.length,
            estimatedTimeLeft: 0,
            stage: 'categorizing',
          }));
          
          if (!catError && catData?.results) {
            console.log(`AI categorized ${catData.results.length} transactions`);
            
            // Map AI suggestions to transactions
            parsed = parsed.map((tx, i) => {
              const suggestion = catData.results.find((r: any) => r.index === i);
              if (suggestion) {
                const cat = categories.find(c => c.code === suggestion.categoryCode);
                return {
                  ...tx,
                  suggestedCategoryId: cat?.id || null,
                  aiConfidence: suggestion.confidence || 0
                };
              }
              return tx;
            });
          } else {
            console.warn('AI kategorilendirme atlandı:', catError?.message);
          }
        } catch (catErr) {
          clearProgressInterval();
          console.warn('AI kategorilendirme hatası:', catErr);
          // Continue without AI suggestions
        }
        
        setProgress(85);
        setParsedTransactions(parsed);
        
        return parsed;
      } catch (error) {
        clearProgressInterval();
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
    batchProgress,
    reset 
  };
}
