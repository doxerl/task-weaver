import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { YearlyIncomeStatement, YearlyIncomeStatementFormData } from '@/types/officialFinance';

// Default empty statement
const getEmptyStatement = (year: number): YearlyIncomeStatementFormData => ({
  year,
  is_locked: false,
  gross_sales_domestic: 0,
  gross_sales_export: 0,
  gross_sales_other: 0,
  sales_returns: 0,
  sales_discounts: 0,
  cost_of_goods_sold: 0,
  cost_of_merchandise_sold: 0,
  cost_of_services_sold: 0,
  rd_expenses: 0,
  marketing_expenses: 0,
  general_admin_expenses: 0,
  dividend_income: 0,
  interest_income: 0,
  commission_income: 0,
  fx_gain: 0,
  revaluation_gain: 0,
  other_income: 0,
  commission_expenses: 0,
  provisions_expense: 0,
  fx_loss: 0,
  revaluation_loss: 0,
  other_expenses: 0,
  short_term_finance_exp: 0,
  long_term_finance_exp: 0,
  prior_period_income: 0,
  other_extraordinary_income: 0,
  prior_period_expenses: 0,
  other_extraordinary_exp: 0,
  corporate_tax: 0,
  deferred_tax_expense: 0,
  net_sales: 0,
  gross_profit: 0,
  operating_profit: 0,
  net_profit: 0,
  notes: null,
  source: 'manual',
  file_url: null,
});

// Calculate totals from statement data
export function calculateStatementTotals(data: Partial<YearlyIncomeStatementFormData>) {
  const grossSales = (data.gross_sales_domestic || 0) + 
                     (data.gross_sales_export || 0) + 
                     (data.gross_sales_other || 0);
  
  const salesDeductions = (data.sales_returns || 0) + (data.sales_discounts || 0);
  const netSales = grossSales - salesDeductions;
  
  const costOfSales = (data.cost_of_goods_sold || 0) + 
                      (data.cost_of_merchandise_sold || 0) + 
                      (data.cost_of_services_sold || 0);
  const grossProfit = netSales - costOfSales;
  
  const operatingExpenses = (data.rd_expenses || 0) + 
                            (data.marketing_expenses || 0) + 
                            (data.general_admin_expenses || 0);
  const operatingProfit = grossProfit - operatingExpenses;
  
  const otherIncome = (data.dividend_income || 0) + 
                      (data.interest_income || 0) + 
                      (data.commission_income || 0) + 
                      (data.fx_gain || 0) + 
                      (data.revaluation_gain || 0) + 
                      (data.other_income || 0);
  
  const otherExpenses = (data.commission_expenses || 0) + 
                        (data.provisions_expense || 0) + 
                        (data.fx_loss || 0) + 
                        (data.revaluation_loss || 0) + 
                        (data.other_expenses || 0);
  
  const financeExpenses = (data.short_term_finance_exp || 0) + (data.long_term_finance_exp || 0);
  const ordinaryProfit = operatingProfit + otherIncome - otherExpenses - financeExpenses;
  
  const extraordinaryIncome = (data.prior_period_income || 0) + (data.other_extraordinary_income || 0);
  const extraordinaryExpenses = (data.prior_period_expenses || 0) + (data.other_extraordinary_exp || 0);
  const preTaxProfit = ordinaryProfit + extraordinaryIncome - extraordinaryExpenses;
  
  const taxExpenses = (data.corporate_tax || 0) + (data.deferred_tax_expense || 0);
  const netProfit = preTaxProfit - taxExpenses;
  
  return {
    net_sales: netSales,
    gross_profit: grossProfit,
    operating_profit: operatingProfit,
    net_profit: netProfit,
  };
}

export function useOfficialIncomeStatement(year: number) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  // Stabilize userId to prevent hook dependency instability during auth changes
  const userId = user?.id ?? null;
  
  // Memoize empty statement to prevent infinite re-renders
  const emptyStatement = useMemo(() => getEmptyStatement(year), [year]);

  // Stable queryKey reference to prevent hook state corruption during HMR/auth transitions
  const queryKey = useMemo(
    () => ['official-income-statement', year, userId] as const,
    [year, userId]
  );

  // Fetch official statement for the year
  const { data: officialStatement, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('yearly_income_statements')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year)
        .maybeSingle();

      if (error) throw error;
      return data as YearlyIncomeStatement | null;
    },
    enabled: !!userId,
  });

  // Upsert statement
  const upsertMutation = useMutation({
    mutationFn: async (formData: Partial<YearlyIncomeStatementFormData>) => {
      if (!userId) throw new Error('User not authenticated');

      const totals = calculateStatementTotals(formData);
      const payload = {
        ...formData,
        ...totals,
        user_id: userId,
        year,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('yearly_income_statements')
        .upsert(payload, { onConflict: 'user_id,year' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['official-income-statement', year] });
      toast({
        title: 'Kaydedildi',
        description: `${year} yılı gelir tablosu güncellendi`,
      });
    },
    onError: (error) => {
      console.error('Failed to save income statement:', error);
      toast({
        title: 'Hata',
        description: 'Gelir tablosu kaydedilemedi',
        variant: 'destructive',
      });
    },
  });

  // Lock statement
  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('yearly_income_statements')
        .update({ is_locked: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('year', year);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['official-income-statement', year] });
      toast({
        title: 'Kilitlendi',
        description: `${year} yılı gelir tablosu resmi olarak kilitlendi`,
      });
    },
  });

  // Unlock statement
  const unlockMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('yearly_income_statements')
        .update({ is_locked: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('year', year);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['official-income-statement', year] });
      toast({
        title: 'Kilit Açıldı',
        description: `${year} yılı gelir tablosu düzenlenebilir`,
      });
    },
  });

  return {
    officialStatement,
    isLoading,
    isLocked: officialStatement?.is_locked || false,
    emptyStatement,
    upsertStatement: upsertMutation.mutateAsync,
    lockStatement: lockMutation.mutateAsync,
    unlockStatement: unlockMutation.mutateAsync,
    isUpdating: upsertMutation.isPending || lockMutation.isPending || unlockMutation.isPending,
  };
}
