import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface OfficialDataStatus {
  isIncomeStatementLocked: boolean;
  isBalanceSheetLocked: boolean;
  isAnyLocked: boolean;        // Herhangi biri kilitli
  isFullyLocked: boolean;      // İkisi de kilitli
  lockedModules: string[];     // ['Gelir Tablosu', 'Bilanço']
  isLoading: boolean;
}

/**
 * Central hook for checking official data lock status across the app.
 * When any official data is locked, dynamic data sources (bank transactions,
 * receipts, manual entries) should be bypassed in calculations.
 * 
 * NOTE: This hook queries the database directly to avoid circular dependencies
 * with other finance hooks.
 */
export function useOfficialDataStatus(year: number): OfficialDataStatus {
  const { user } = useAuthContext();
  // Stabilize userId to prevent hook dependency instability during auth changes
  const userId = user?.id ?? null;

  // Query income statement lock status directly
  const { data: incomeStatementData, isLoading: incomeLoading } = useQuery({
    queryKey: ['official-income-statement-lock', userId, year] as const,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('yearly_income_statements')
        .select('is_locked')
        .eq('user_id', userId)
        .eq('year', year)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Query balance sheet lock status directly
  const { data: balanceSheetData, isLoading: balanceLoading } = useQuery({
    queryKey: ['yearly-balance-sheet-lock', userId, year] as const,
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('yearly_balance_sheets')
        .select('is_locked')
        .eq('user_id', userId)
        .eq('year', year)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const incomeStatementLocked = incomeStatementData?.is_locked ?? false;
  const balanceSheetLocked = balanceSheetData?.is_locked ?? false;
  
  const lockedModules: string[] = [];
  if (incomeStatementLocked) lockedModules.push('Gelir Tablosu');
  if (balanceSheetLocked) lockedModules.push('Bilanço');
  
  return {
    isIncomeStatementLocked: incomeStatementLocked,
    isBalanceSheetLocked: balanceSheetLocked,
    isAnyLocked: incomeStatementLocked || balanceSheetLocked,
    isFullyLocked: incomeStatementLocked && balanceSheetLocked,
    lockedModules,
    isLoading: incomeLoading || balanceLoading,
  };
}
