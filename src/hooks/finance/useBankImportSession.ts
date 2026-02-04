import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from './useCategories';
import { ParsedTransaction, BalanceImpact } from '@/types/finance';

// No hardcoded rules - all categorization handled by AI

// =====================================================
// TYPES
// =====================================================

export type ImportSessionStatus = 'parsing' | 'categorizing' | 'review' | 'approved' | 'cancelled';

export interface BankImportSession {
  id: string;
  user_id: string;
  file_name: string;
  file_hash: string | null;
  file_id: string | null;
  status: ImportSessionStatus;
  total_transactions: number;
  categorized_count: number;
  low_confidence_count: number;
  total_income: number;
  total_expense: number;
  detected_bank: string | null;
  date_range_start: string | null;
  date_range_end: string | null;
  ai_tokens_used: number;
  ai_cost_usd: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
}

export interface BankImportTransaction {
  id: string;
  session_id: string;
  user_id: string;
  row_number: number;
  transaction_date: string;
  original_date: string | null;
  description: string;
  amount: number;
  original_amount: string | null;
  balance: number | null;
  reference: string | null;
  counterparty: string | null;
  transaction_type: string | null;
  channel: string | null;
  ai_category_code: string | null;
  ai_category_type: string | null;
  ai_confidence: number;
  ai_reasoning: string | null;
  ai_affects_pnl: boolean | null;
  ai_balance_impact: string | null;
  ai_counterparty: string | null;
  user_category_id: string | null;
  user_modified: boolean;
  user_notes: string | null;
  final_category_id: string | null;
  needs_review: boolean;
  reviewed: boolean;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveTransactionParams {
  row_number: number;
  transaction_date: string;
  original_date?: string;
  description: string;
  amount: number;
  original_amount?: string;
  balance?: number | null;
  reference?: string | null;
  counterparty?: string | null;
  transaction_type?: string | null;
  channel?: string | null;
}

export interface SaveCategorizationParams {
  row_number: number;
  category_code: string;
  category_type: string;
  confidence: number;
  reasoning: string;
  counterparty: string | null;
  affects_pnl: boolean;
  balance_impact: string;
}

// =====================================================
// LOCAL STORAGE KEY
// =====================================================

const LOCAL_STORAGE_KEY = 'currentBankImportSession';

// =====================================================
// HOOK
// =====================================================

export function useBankImportSession() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories();
  
  // Session ID from localStorage
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LOCAL_STORAGE_KEY);
  });

  // =====================================================
  // QUERIES
  // =====================================================

  // Fetch current session
  const { 
    data: session, 
    isLoading: sessionLoading,
    refetch: refetchSession 
  } = useQuery({
    queryKey: ['bankImportSession', currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return null;
      
      const { data, error } = await supabase
        .from('bank_import_sessions')
        .select('*')
        .eq('id', currentSessionId)
        .single();
      
      if (error) {
        console.error('Session fetch error:', error);
        // Session not found or deleted, clear local storage
        if (error.code === 'PGRST116') {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          setCurrentSessionId(null);
        }
        return null;
      }
      return data as BankImportSession;
    },
    enabled: !!currentSessionId && !!userId
  });

  // Fetch session transactions
  const { 
    data: transactions, 
    isLoading: transactionsLoading,
    refetch: refetchTransactions 
  } = useQuery({
    queryKey: ['bankImportTransactions', currentSessionId],
    queryFn: async () => {
      if (!currentSessionId) return [];
      
      const { data, error } = await supabase
        .from('bank_import_transactions')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('ai_confidence', { ascending: true }) // Low confidence first
        .order('row_number', { ascending: true });
      
      if (error) {
        console.error('Transactions fetch error:', error);
        return [];
      }
      return data as BankImportTransaction[];
    },
    enabled: !!currentSessionId && !!userId
  });

  // Check for active session on mount
  const { data: activeSession } = useQuery({
    queryKey: ['activeImportSession', userId] as const,
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('bank_import_sessions')
        .select('id, status, file_name')
        .eq('user_id', userId)
        .in('status', ['parsing', 'categorizing', 'review'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data) return null;
      return data;
    },
    enabled: !!userId && !currentSessionId
  });

  // Auto-set session from active session
  useEffect(() => {
    if (activeSession && !currentSessionId) {
      setCurrentSessionId(activeSession.id);
      localStorage.setItem(LOCAL_STORAGE_KEY, activeSession.id);
    }
  }, [activeSession, currentSessionId]);

  // =====================================================
  // MUTATIONS
  // =====================================================

  // Create new session
  const createSession = useMutation({
    mutationFn: async (params: { 
      fileName: string; 
      fileHash?: string;
      fileId?: string;
    }) => {
      if (!userId) throw new Error('Giriş yapmalısınız');

      // Check for existing session with same hash
      if (params.fileHash) {
        const { data: existing } = await supabase
          .from('bank_import_sessions')
          .select('id, status, file_name')
          .eq('user_id', userId)
          .eq('file_hash', params.fileHash)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          toast({
            title: '📁 Mevcut Oturum Bulundu',
            description: 'Bu dosya daha önce yüklenmiş, mevcut analiz kullanılıyor.'
          });
          return { id: existing.id, status: existing.status, isExisting: true };
        }
      }

      // Create new session
      const { data, error } = await supabase
        .from('bank_import_sessions')
        .insert({
          user_id: userId,
          file_name: params.fileName,
          file_hash: params.fileHash || null,
          file_id: params.fileId || null,
          status: 'parsing'
        })
        .select()
        .single();

      if (error) throw error;
      return { id: data.id, status: data.status, isExisting: false };
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
      localStorage.setItem(LOCAL_STORAGE_KEY, data.id);
      queryClient.invalidateQueries({ queryKey: ['bankImportSession'] });
      queryClient.invalidateQueries({ queryKey: ['activeImportSession'] });
    }
  });

  // Save parsed transactions (before AI categorization)
  const saveTransactions = useMutation({
    mutationFn: async (txs: SaveTransactionParams[]) => {
      if (!currentSessionId) throw new Error('Session bulunamadı');
      if (!userId) throw new Error('Giriş yapmalısınız');

      const toInsert = txs.map(tx => ({
        session_id: currentSessionId,
        user_id: userId,
        row_number: tx.row_number,
        transaction_date: tx.transaction_date,
        original_date: tx.original_date || null,
        description: tx.description,
        amount: tx.amount,
        original_amount: tx.original_amount || null,
        balance: tx.balance ?? null,
        reference: tx.reference || null,
        counterparty: tx.counterparty || null,
        transaction_type: tx.transaction_type || null,
        channel: tx.channel || null
      }));

      const { error } = await supabase
        .from('bank_import_transactions')
        .insert(toInsert);

      if (error) throw error;

      // Update session stats
      const dates = txs.map(t => t.transaction_date).filter(Boolean).sort();
      await supabase
        .from('bank_import_sessions')
        .update({
          status: 'categorizing',
          total_transactions: txs.length,
          date_range_start: dates[0] || null,
          date_range_end: dates[dates.length - 1] || null
        })
        .eq('id', currentSessionId);

      return { count: txs.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankImportSession'] });
      queryClient.invalidateQueries({ queryKey: ['bankImportTransactions'] });
    }
  });

  // Save AI categorization results (batch by batch)
  const saveCategorizations = useMutation({
    mutationFn: async (results: SaveCategorizationParams[]) => {
      if (!currentSessionId) throw new Error('Session bulunamadı');

      // Update each transaction
      for (const result of results) {
        await supabase
          .from('bank_import_transactions')
          .update({
            ai_category_code: result.category_code,
            ai_category_type: result.category_type,
            ai_confidence: result.confidence,
            ai_reasoning: result.reasoning,
            ai_counterparty: result.counterparty,
            ai_affects_pnl: result.affects_pnl,
            ai_balance_impact: result.balance_impact,
            needs_review: result.confidence < 0.7
          })
          .eq('session_id', currentSessionId)
          .eq('row_number', result.row_number);
      }

      // Update session statistics
      const { data: stats } = await supabase
        .from('bank_import_transactions')
        .select('ai_confidence, amount, ai_affects_pnl')
        .eq('session_id', currentSessionId)
        .not('ai_category_code', 'is', null);

      const categorizedCount = stats?.length || 0;
      const lowConfidenceCount = stats?.filter(s => (s.ai_confidence || 0) < 0.7).length || 0;
      const totalIncome = stats
        ?.filter(s => (s.amount || 0) > 0 && s.ai_affects_pnl)
        .reduce((sum, s) => sum + (s.amount || 0), 0) || 0;
      const totalExpense = stats
        ?.filter(s => (s.amount || 0) < 0 && s.ai_affects_pnl)
        .reduce((sum, s) => sum + Math.abs(s.amount || 0), 0) || 0;

      await supabase
        .from('bank_import_sessions')
        .update({
          categorized_count: categorizedCount,
          low_confidence_count: lowConfidenceCount,
          total_income: totalIncome,
          total_expense: totalExpense,
          status: 'review'
        })
        .eq('id', currentSessionId);

      return { categorizedCount, lowConfidenceCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankImportSession'] });
      queryClient.invalidateQueries({ queryKey: ['bankImportTransactions'] });
    }
  });

  // Update user category selection
  const updateCategory = useMutation({
    mutationFn: async (params: { transactionId: string; categoryId: string }) => {
      const { error } = await supabase
        .from('bank_import_transactions')
        .update({
          user_category_id: params.categoryId,
          final_category_id: params.categoryId,
          user_modified: true,
          reviewed: true,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', params.transactionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankImportTransactions'] });
    }
  });

  // Approve and transfer to main tables
  const approveAndTransfer = useMutation({
    mutationFn: async () => {
      if (!currentSessionId) throw new Error('Session bulunamadı');
      if (!userId) throw new Error('Giriş yapmalısınız');

      // Get all transactions from session
      const { data: txs, error: fetchError } = await supabase
        .from('bank_import_transactions')
        .select('*')
        .eq('session_id', currentSessionId);

      if (fetchError) throw fetchError;
      if (!txs || txs.length === 0) throw new Error('İşlem bulunamadı');

      // Build category map
      const categoryMap = new Map(categories.map(c => [c.code, c]));
      
      // VAT separation - categories without VAT
      const noVatTypes = ['PARTNER', 'FINANCING', 'EXCLUDED'];
      const noVatCodes = ['FAIZ_IN', 'FAIZ_OUT', 'VERGI', 'SSK', 'BANKA_MASRAF', 'KREDI', 'KREDI_IN', 'KREDI_OUT', 'LEASING', 'FAKTORING'];

      // Prepare bank_transactions inserts
      const bankTxInserts = txs.map(tx => {
        const categoryId = tx.user_category_id || tx.final_category_id;
        const cat = categoryId ? categories.find(c => c.id === categoryId) : 
                    tx.ai_category_code ? categoryMap.get(tx.ai_category_code) : null;
        
        const isCommercial = cat ? 
          !noVatTypes.includes(cat.type) && !noVatCodes.includes(cat.code) : 
          true;
        
        const grossAmount = Math.abs(tx.amount);
        const netAmount = isCommercial ? grossAmount / 1.20 : grossAmount;
        const vatAmount = isCommercial ? grossAmount - netAmount : 0;
        const vatRate = isCommercial ? 20 : 0;

        return {
          file_id: session?.file_id || null,
          user_id: userId,
          row_number: tx.row_number,
          raw_date: tx.original_date,
          raw_description: tx.description,
          raw_amount: tx.original_amount,
          transaction_date: tx.transaction_date,
          description: tx.description,
          amount: tx.amount,
          balance: tx.balance,
          counterparty: tx.ai_counterparty || tx.counterparty,
          reference_no: tx.reference,
          category_id: categoryId || cat?.id || null,
          ai_suggested_category_id: tx.ai_category_code ? categoryMap.get(tx.ai_category_code)?.id : null,
          ai_confidence: tx.ai_confidence || 0,
          is_income: tx.amount > 0,
          is_excluded: cat?.type === 'EXCLUDED',
          is_manually_categorized: tx.user_modified,
          net_amount: tx.amount > 0 ? netAmount : -netAmount,
          vat_amount: vatAmount,
          vat_rate: vatRate,
          is_commercial: isCommercial
        };
      });

      // Upsert to bank_transactions (update if exists based on user_id, file_id, row_number)
      const { error: insertError } = await supabase
        .from('bank_transactions')
        .upsert(bankTxInserts, { 
          onConflict: 'user_id,file_id,row_number',
          ignoreDuplicates: false 
        });

      if (insertError) throw insertError;

      // Update session status
      await supabase
        .from('bank_import_sessions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', currentSessionId);

      // Clear localStorage
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setCurrentSessionId(null);

      return { count: txs.length };
    },
    onSuccess: (data) => {
      toast({
        title: '✅ İşlemler Kaydedildi',
        description: `${data.count} işlem başarıyla kaydedildi.`
      });
      queryClient.invalidateQueries({ queryKey: ['bankImportSession'] });
      queryClient.invalidateQueries({ queryKey: ['activeImportSession'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-files'] });
    }
  });

  // Cancel session - completely remove session and its transactions from DB
  const cancelSession = useMutation({
    mutationFn: async () => {
      if (!currentSessionId) return;

      // 1. Delete import transactions for this session
      const { error: txError } = await supabase
        .from('bank_import_transactions')
        .delete()
        .eq('session_id', currentSessionId);

      if (txError) {
        console.error('Transaction silme hatası:', txError);
        throw txError;
      }

      // 2. Delete the session itself
      const { error: sessionError } = await supabase
        .from('bank_import_sessions')
        .delete()
        .eq('id', currentSessionId);

      if (sessionError) {
        console.error('Session silme hatası:', sessionError);
        throw sessionError;
      }

      // 3. Clear localStorage
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setCurrentSessionId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankImportSession'] });
      queryClient.invalidateQueries({ queryKey: ['activeImportSession'] });
      queryClient.invalidateQueries({ queryKey: ['bankImportTransactions'] });
      toast({
        title: '🗑️ Dosya Kaldırıldı',
        description: 'Yüklenen dosya ve işlemler silindi'
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

  // Clear session (without cancelling - just local state)
  const clearSession = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setCurrentSessionId(null);
    queryClient.invalidateQueries({ queryKey: ['bankImportSession'] });
    queryClient.invalidateQueries({ queryKey: ['activeImportSession'] });
  }, [queryClient]);

  // Get uncategorized transactions (for resume)
  const getUncategorizedTransactions = useCallback(async () => {
    if (!currentSessionId) return [];

    const { data } = await supabase
      .from('bank_import_transactions')
      .select('*')
      .eq('session_id', currentSessionId)
      .is('ai_category_code', null)
      .order('row_number');

    return data || [];
  }, [currentSessionId]);

  // Recategorize uncategorized transactions - pure AI
  const recategorizeUncategorized = useMutation({
    mutationFn: async () => {
      if (!currentSessionId) throw new Error('No active session');
      
      // Get uncategorized transactions
      const uncategorized = await getUncategorizedTransactions();
      
      if (!uncategorized || uncategorized.length === 0) {
        return { count: 0, message: 'Kategorilenmemiş işlem yok' };
      }
      
      console.log(`Sending ${uncategorized.length} transactions to AI...`);
      
      // Send ALL to AI - no pre-processing
      const txsForAI = uncategorized.map(tx => ({
        index: tx.row_number - 1,
        id: tx.id,
        date: tx.transaction_date,
        description: tx.description,
        amount: tx.amount,
        counterparty: tx.counterparty,
        reference: tx.reference
      }));
      
      const { data: catData, error } = await supabase.functions.invoke('categorize-transactions', {
        body: { transactions: txsForAI }
      });
      
      if (error || !catData?.results) {
        throw new Error('AI kategorilendirme başarısız: ' + (error?.message || 'Unknown error'));
      }
      
      console.log(`AI returned ${catData.results.length} categorizations`);
      
      // Update all transactions with AI results
      let updatedCount = 0;
      for (const result of catData.results) {
        const tx = txsForAI.find(t => t.index === result.index);
        
        if (tx && result.categoryCode) {
          const { error: updateError } = await supabase
            .from('bank_import_transactions')
            .update({
              ai_category_code: result.categoryCode,
              ai_category_type: result.categoryType,
              ai_confidence: result.confidence,
              ai_reasoning: result.reasoning,
              ai_affects_pnl: result.affects_pnl,
              ai_balance_impact: result.balance_impact,
              ai_counterparty: result.counterparty,
              needs_review: result.confidence < 0.7
            })
            .eq('id', tx.id);
          
          if (!updateError) updatedCount++;
        }
      }
      
      // Update session stats
      await supabase
        .from('bank_import_sessions')
        .update({
          categorized_count: (transactions?.filter(t => t.ai_category_code !== null).length || 0) + updatedCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSessionId);
      
      return { count: updatedCount, message: `${updatedCount} işlem AI ile kategorilendi` };
    },
    onSuccess: async (result) => {
      toast({
        title: 'Kategorilendirme Tamamlandı',
        description: result.message
      });
      await queryClient.invalidateQueries({ queryKey: ['bankImportTransactions'] });
      await queryClient.refetchQueries({ queryKey: ['bankImportTransactions'] });
      await queryClient.invalidateQueries({ queryKey: ['bankImportSession'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Recategorize ALL transactions (even already categorized ones)
  const recategorizeAll = useMutation({
    mutationFn: async () => {
      if (!currentSessionId) throw new Error('Aktif oturum yok');
      
      // Get ALL transactions from session
      const { data: allTxs, error } = await supabase
        .from('bank_import_transactions')
        .select('*')
        .eq('session_id', currentSessionId)
        .order('row_number');
      
      if (error || !allTxs?.length) throw new Error('İşlem bulunamadı');
      
      console.log(`Recategorizing ALL ${allTxs.length} transactions...`);
      
      // Send ALL to AI
      const txsForAI = allTxs.map(tx => ({
        index: tx.row_number - 1,
        id: tx.id,
        date: tx.transaction_date,
        description: tx.description,
        amount: tx.amount,
        counterparty: tx.counterparty,
        reference: tx.reference
      }));
      
      const { data: catData, error: catError } = await supabase.functions.invoke('categorize-transactions', {
        body: { transactions: txsForAI }
      });
      
      if (catError || !catData?.results) {
        throw new Error('AI kategorilendirme başarısız');
      }
      
      // Update all transactions - clear user selections too
      let updatedCount = 0;
      for (const result of catData.results) {
        const tx = txsForAI.find(t => t.index === result.index);
        if (tx && result.categoryCode) {
          const { error: updateError } = await supabase
            .from('bank_import_transactions')
            .update({
              ai_category_code: result.categoryCode,
              ai_category_type: result.categoryType,
              ai_confidence: result.confidence,
              ai_reasoning: result.reasoning,
              ai_affects_pnl: result.affects_pnl,
              ai_balance_impact: result.balance_impact,
              ai_counterparty: result.counterparty,
              needs_review: result.confidence < 0.7,
              user_category_id: null,      // Clear user selection
              user_modified: false,         // Reset modified flag
              final_category_id: null       // Reset final category
            })
            .eq('id', tx.id);
          
          if (!updateError) updatedCount++;
        }
      }
      
      // Update session stats
      await supabase
        .from('bank_import_sessions')
        .update({
          categorized_count: updatedCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSessionId);
      
      return { count: updatedCount, total: allTxs.length };
    },
    onSuccess: async (result) => {
      toast({
        title: '✅ Tüm İşlemler Yeniden Kategorilendi',
        description: `${result.count}/${result.total} işlem güncellendi`
      });
      await queryClient.invalidateQueries({ queryKey: ['bankImportTransactions'] });
      await queryClient.refetchQueries({ queryKey: ['bankImportTransactions'] });
      await queryClient.invalidateQueries({ queryKey: ['bankImportSession'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Hata',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Convert DB transactions to ParsedTransaction format
  const convertToParsedTransactions = useCallback((): ParsedTransaction[] => {
    // Wait for both transactions and categories to load
    if (!transactions || categories.length === 0) {
      console.log('Waiting for data to load - transactions:', !!transactions, 'categories:', categories.length);
      return [];
    }

    return transactions.map(tx => {
      // Match category by user selection first, then AI code
      const matchedCategory = tx.user_category_id 
        ? categories.find(c => c.id === tx.user_category_id)
        : tx.ai_category_code 
          ? categories.find(c => c.code === tx.ai_category_code)
          : null;
      
      return {
        index: tx.row_number - 1,
        row_number: tx.row_number,
        date: tx.transaction_date,
        original_date: tx.original_date || tx.transaction_date,
        description: tx.description,
        amount: tx.amount,
        original_amount: tx.original_amount || String(tx.amount),
        balance: tx.balance,
        reference: tx.reference,
        counterparty: tx.ai_counterparty || tx.counterparty,
        transaction_type: tx.transaction_type || '',
        channel: tx.channel,
        needs_review: tx.needs_review,
        confidence: tx.ai_confidence || 0,
        suggestedCategoryId: matchedCategory?.id || null,
        aiCategoryCode: tx.ai_category_code || undefined, // Debug field
        aiConfidence: tx.ai_confidence || 0,
        aiReasoning: tx.ai_reasoning || undefined,
        affectsPnl: tx.ai_affects_pnl ?? undefined,
        balanceImpact: (tx.ai_balance_impact as BalanceImpact) || undefined
      };
    });
  }, [transactions, categories]);

  // =====================================================
  // RETURN
  // =====================================================

  // Count uncategorized transactions
  const uncategorizedCount = transactions?.filter(tx => 
    !tx.user_category_id && !tx.ai_category_code
  ).length || 0;

  return {
    // State
    session,
    transactions,
    currentSessionId,
    isLoading: sessionLoading || transactionsLoading,
    hasActiveSession: !!session && session.status !== 'approved' && session.status !== 'cancelled',

    // Converted data
    parsedTransactions: convertToParsedTransactions(),
    uncategorizedCount,

    // Actions
    createSession: createSession.mutateAsync,
    saveTransactions: saveTransactions.mutateAsync,
    saveCategorizations: saveCategorizations.mutateAsync,
    updateCategory: updateCategory.mutate,
    approveAndTransfer: approveAndTransfer.mutateAsync,
    cancelSession: cancelSession.mutateAsync,
    clearSession,
    getUncategorizedTransactions,
    recategorizeUncategorized: recategorizeUncategorized.mutateAsync,
    recategorizeAll: recategorizeAll.mutateAsync,
    refetchSession,
    refetchTransactions,

    // Mutation states
    isCreating: createSession.isPending,
    isSavingTransactions: saveTransactions.isPending,
    isSavingCategorizations: saveCategorizations.isPending,
    isApproving: approveAndTransfer.isPending,
    isUpdatingCategory: updateCategory.isPending,
    isRecategorizing: recategorizeUncategorized.isPending,
    isRecategorizingAll: recategorizeAll.isPending,
    isCancelling: cancelSession.isPending
  };
}
