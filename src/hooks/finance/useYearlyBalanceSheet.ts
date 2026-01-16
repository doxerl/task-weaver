import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface YearlyBalanceSheet {
  id: string;
  user_id: string;
  year: number;
  is_locked: boolean;
  // AKTİF (Assets)
  cash_on_hand: number;
  bank_balance: number;
  trade_receivables: number;
  partner_receivables: number;
  vat_receivable: number;
  other_vat: number;
  inventory: number;
  vehicles: number;
  fixtures: number;
  equipment: number;
  accumulated_depreciation: number;
  total_assets: number;
  // PASİF (Liabilities)
  trade_payables: number;
  partner_payables: number;
  personnel_payables: number;
  tax_payables: number;
  social_security_payables: number;
  vat_payable: number;
  deferred_tax_liabilities: number;
  tax_provision: number;
  short_term_loan_debt: number;
  bank_loans: number;
  // ÖZKAYNAK (Equity)
  paid_capital: number;
  unpaid_capital: number;
  retained_earnings: number;
  current_profit: number;
  total_liabilities: number;
  // Meta
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useYearlyBalanceSheet(year: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: yearlyBalance, isLoading } = useQuery({
    queryKey: ['yearly-balance-sheet', user?.id, year],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('yearly_balance_sheets')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', year)
        .maybeSingle();

      if (error) throw error;
      return data as YearlyBalanceSheet | null;
    },
    enabled: !!user?.id,
  });

  const upsertMutation = useMutation({
    mutationFn: async (balanceData: Partial<YearlyBalanceSheet>) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Tüm sayısal değerleri tam sayıya yuvarla
      const roundedData = Object.fromEntries(
        Object.entries(balanceData).map(([key, value]) => [
          key,
          typeof value === 'number' ? Math.round(value) : value
        ])
      );

      const payload = {
        ...roundedData,
        user_id: user.id,
        year,
        updated_at: new Date().toISOString(),
      };

      if (yearlyBalance?.id) {
        const { error } = await supabase
          .from('yearly_balance_sheets')
          .update(payload)
          .eq('id', yearlyBalance.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('yearly_balance_sheets')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yearly-balance-sheet', user?.id, year] });
      toast.success('Yıllık bilanço kaydedildi');
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  const lockMutation = useMutation({
    mutationFn: async (lock: boolean) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      if (!yearlyBalance?.id) {
        throw new Error('Önce bilançoyu kaydedin');
      }

      const { error } = await supabase
        .from('yearly_balance_sheets')
        .update({ is_locked: lock, updated_at: new Date().toISOString() })
        .eq('id', yearlyBalance.id);

      if (error) throw error;
    },
    onSuccess: (_, lock) => {
      queryClient.invalidateQueries({ queryKey: ['yearly-balance-sheet', user?.id, year] });
      toast.success(lock ? 'Bilanço kilitlendi (Resmi Onaylı)' : 'Bilanço kilidi açıldı');
    },
    onError: (error: Error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  return {
    yearlyBalance,
    isLoading,
    isLocked: yearlyBalance?.is_locked ?? false,
    upsertBalance: upsertMutation.mutate,
    lockBalance: (lock: boolean) => lockMutation.mutate(lock),
    isUpdating: upsertMutation.isPending || lockMutation.isPending,
  };
}
