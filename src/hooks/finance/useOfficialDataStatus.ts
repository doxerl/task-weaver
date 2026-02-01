import { useOfficialIncomeStatement } from './useOfficialIncomeStatement';
import { useYearlyBalanceSheet } from './useYearlyBalanceSheet';

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
 */
export function useOfficialDataStatus(year: number): OfficialDataStatus {
  const { isLocked: incomeStatementLocked, isLoading: incomeLoading } = 
    useOfficialIncomeStatement(year);
  const { isLocked: balanceSheetLocked, isLoading: balanceLoading } = 
    useYearlyBalanceSheet(year);
  
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
