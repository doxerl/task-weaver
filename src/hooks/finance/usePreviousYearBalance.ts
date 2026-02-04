import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface PreviousYearBalance {
  id: string;
  year: number;
  is_locked: boolean;
  // Dönen Varlıklar
  cash_on_hand: number;
  bank_balance: number;
  trade_receivables: number;
  partner_receivables: number;
  inventory: number;
  vat_receivable: number;
  other_vat: number;
  // Duran Varlıklar
  vehicles: number;
  fixtures: number;
  equipment: number;
  accumulated_depreciation: number;
  // Kısa Vadeli Borçlar
  short_term_loan_debt: number;
  trade_payables: number;
  partner_payables: number;
  personnel_payables: number;
  tax_payables: number;
  social_security_payables: number;
  deferred_tax_liabilities: number;
  tax_provision: number;
  vat_payable: number;
  // Uzun Vadeli Borçlar
  bank_loans: number;
  // Özkaynaklar
  paid_capital: number;
  unpaid_capital: number;
  retained_earnings: number;
  current_profit: number;
  // Toplamlar
  total_assets: number;
  total_liabilities: number;
}

export function usePreviousYearBalance(year: number) {
  const { user } = useAuthContext();
  
  // Stabilize userId to prevent hook state corruption during auth changes
  const userId = user?.id ?? null;
  
  // Stable queryKey reference to prevent hook state corruption during HMR/auth transitions
  const queryKey = useMemo(
    () => ['previous-year-balance', userId, year] as const,
    [userId, year]
  );

  const queryResult = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('yearly_balance_sheets')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year)
        .eq('is_locked', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      // Map database fields to interface
      return {
        id: data.id,
        year: data.year,
        is_locked: data.is_locked ?? false,
        // Dönen Varlıklar
        cash_on_hand: data.cash_on_hand ?? 0,
        bank_balance: data.bank_balance ?? 0,
        trade_receivables: data.trade_receivables ?? 0,
        partner_receivables: data.partner_receivables ?? 0,
        inventory: data.inventory ?? 0,
        vat_receivable: data.vat_receivable ?? 0,
        other_vat: data.other_vat ?? 0,
        // Duran Varlıklar
        vehicles: data.vehicles ?? 0,
        fixtures: data.fixtures ?? 0,
        equipment: data.equipment ?? 0,
        accumulated_depreciation: data.accumulated_depreciation ?? 0,
        // Kısa Vadeli Borçlar
        short_term_loan_debt: data.short_term_loan_debt ?? 0,
        trade_payables: data.trade_payables ?? 0,
        partner_payables: data.partner_payables ?? 0,
        personnel_payables: data.personnel_payables ?? 0,
        tax_payables: data.tax_payables ?? 0,
        social_security_payables: data.social_security_payables ?? 0,
        deferred_tax_liabilities: data.deferred_tax_liabilities ?? 0,
        tax_provision: data.tax_provision ?? 0,
        vat_payable: data.vat_payable ?? 0,
        // Uzun Vadeli Borçlar
        bank_loans: data.bank_loans ?? 0,
        // Özkaynaklar
        paid_capital: data.paid_capital ?? 0,
        unpaid_capital: data.unpaid_capital ?? 0,
        retained_earnings: data.retained_earnings ?? 0,
        current_profit: data.current_profit ?? 0,
        // Toplamlar
        total_assets: data.total_assets ?? 0,
        total_liabilities: data.total_liabilities ?? 0,
      } as PreviousYearBalance;
    },
    enabled: !!userId && !!year,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    previousYearBalance: queryResult.data,
    isLoading: queryResult.isLoading,
  };
}
