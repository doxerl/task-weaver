import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { BankTransaction } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';

export function useBankTransactions(year?: number) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['bank-transactions', user?.id, year],
    queryFn: async () => {
      let query = supabase
        .from('bank_transactions')
        .select('*, category:transaction_categories!category_id(*)')
        .eq('user_id', user?.id)
        .order('transaction_date', { ascending: false });
      
      if (year) {
        query = query
          .gte('transaction_date', `${year}-01-01`)
          .lte('transaction_date', `${year}-12-31`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BankTransaction[];
    },
    enabled: !!user?.id
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, categoryId, categoryCode }: { id: string; categoryId: string | null; categoryCode?: string }) => {
      // If category is EXCLUDED, automatically set is_excluded to true
      const isExcludedCategory = categoryCode === 'EXCLUDED';
      
      const { error } = await supabase
        .from('bank_transactions')
        .update({ 
          category_id: categoryId, 
          is_manually_categorized: true,
          is_excluded: isExcludedCategory
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    }
  });

  const bulkUpdateCategory = useMutation({
    mutationFn: async ({ ids, categoryId, categoryCode }: { ids: string[]; categoryId: string; categoryCode?: string }) => {
      // If category is EXCLUDED, automatically set is_excluded to true
      const isExcludedCategory = categoryCode === 'EXCLUDED';
      
      const { error } = await supabase
        .from('bank_transactions')
        .update({ 
          category_id: categoryId, 
          is_manually_categorized: true,
          is_excluded: isExcludedCategory
        })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({ 
        title: 'Başarılı', 
        description: `${variables.ids.length} işlem güncellendi` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    }
  });

  const toggleExcluded = useMutation({
    mutationFn: async ({ id, isExcluded }: { id: string; isExcluded: boolean }) => {
      const { error } = await supabase
        .from('bank_transactions')
        .update({ is_excluded: isExcluded })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
    }
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({ title: 'İşlem silindi' });
    }
  });

  const deleteAllTransactions = useMutation({
    mutationFn: async () => {
      // Delete all bank transactions
      const { error: txError } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('user_id', user?.id);
      if (txError) throw txError;
      
      // Delete all uploaded files
      const { error: fileError } = await supabase
        .from('uploaded_bank_files')
        .delete()
        .eq('user_id', user?.id);
      if (fileError) throw fileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['uploaded-bank-files'] });
      toast({ title: 'Tüm işlemler ve dosyalar silindi' });
    },
    onError: (error: Error) => {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    }
  });

  // Stats
  const stats = {
    total: transactions.length,
    uncategorized: transactions.filter(t => !t.category_id).length,
    income: transactions.filter(t => t.amount > 0 && !t.is_excluded).reduce((sum, t) => sum + t.amount, 0),
    expense: transactions.filter(t => t.amount < 0 && !t.is_excluded).reduce((sum, t) => sum + Math.abs(t.amount), 0),
  };

  return { 
    transactions, 
    isLoading, 
    error,
    stats,
    updateCategory, 
    bulkUpdateCategory, 
    toggleExcluded,
    deleteTransaction,
    deleteAllTransactions
  };
}
