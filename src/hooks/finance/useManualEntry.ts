import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from './useCategories';
import { BankTransaction } from '@/types/finance';

interface AddTransactionInput {
  transaction_date: string;
  description: string;
  amount: number;
  category_id: string;
  is_income: boolean;
}

interface AddPartnerTransactionInput {
  transaction_date: string;
  transaction_type: 'OUT' | 'IN';
  amount: number;
  description?: string;
}

export function useManualEntry(year: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { categories } = useCategories();

  // Fetch recent manually entered transactions (no file_id)
  const { data: recentTransactions = [], isLoading } = useQuery({
    queryKey: ['manual-transactions', user?.id, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select('*, category:transaction_categories!category_id(*)')
        .eq('user_id', user?.id)
        .is('file_id', null)
        .gte('transaction_date', `${year}-01-01`)
        .lte('transaction_date', `${year}-12-31`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as BankTransaction[];
    },
    enabled: !!user?.id
  });

  // Add regular transaction (income or expense)
  const addTransaction = useMutation({
    mutationFn: async (input: AddTransactionInput) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Kullanıcı bulunamadı');

      const amount = input.is_income ? Math.abs(input.amount) : -Math.abs(input.amount);

      const { error } = await supabase
        .from('bank_transactions')
        .insert({
          user_id: currentUser.id,
          transaction_date: input.transaction_date,
          description: input.description,
          amount,
          category_id: input.category_id,
          is_income: input.is_income,
          is_manually_categorized: true,
          is_excluded: false,
          // file_id is null → indicates manual entry
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({ title: '✅ İşlem eklendi' });
    },
    onError: (error: Error) => {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    }
  });

  // Add partner transaction (Ortağa Verilen / Ortaktan Alınan)
  const addPartnerTransaction = useMutation({
    mutationFn: async (input: AddPartnerTransactionInput) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Kullanıcı bulunamadı');

      // Find partner category
      const partnerCategory = categories.find(c => 
        c.type === 'PARTNER' || c.affects_partner_account
      );

      const amount = input.transaction_type === 'IN' 
        ? Math.abs(input.amount) 
        : -Math.abs(input.amount);

      const description = input.description || 
        (input.transaction_type === 'OUT' ? 'Ortağa Ödeme' : 'Ortaktan Tahsilat');

      const { error } = await supabase
        .from('bank_transactions')
        .insert({
          user_id: currentUser.id,
          transaction_date: input.transaction_date,
          description,
          amount,
          category_id: partnerCategory?.id || null,
          is_income: input.transaction_type === 'IN',
          is_manually_categorized: true,
          is_excluded: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      toast({ 
        title: '✅ Ortak işlemi eklendi',
        description: 'İşlem kaydedildi'
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    }
  });

  return {
    recentTransactions,
    isLoading,
    addTransaction,
    addPartnerTransaction
  };
}
