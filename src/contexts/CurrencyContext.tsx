import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useExchangeRates, ExchangeRate } from '@/hooks/finance/useExchangeRates';

export type CurrencyType = 'TRY' | 'USD';

interface CurrencyContextType {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  formatAmount: (amount: number, month?: number, year?: number) => string;
  canShowUsd: (month: number, year: number) => boolean;
  getRate: (month: number, year: number) => number | null;
  convertToUsd: (amount: number, month: number, year: number) => number | null;
  rates: ExchangeRate[];
  isLoading: boolean;
  yearlyAverageRate: number | null;
  getAvailableMonthsCount: (year: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
  defaultYear?: number;
}

export function CurrencyProvider({ children, defaultYear }: CurrencyProviderProps) {
  const [currency, setCurrency] = useState<CurrencyType>('TRY');
  const currentYear = defaultYear ?? new Date().getFullYear();
  
  const { 
    rates, 
    isLoading, 
    getRate: getRateFromHook, 
    hasRate,
    convertToUsd: convertFromHook,
    yearlyAverageRate,
    getAvailableMonths,
  } = useExchangeRates();

  const getRate = useCallback((month: number, year: number): number | null => {
    return getRateFromHook(year, month);
  }, [getRateFromHook]);

  const canShowUsd = useCallback((month: number, year: number): boolean => {
    return hasRate(year, month);
  }, [hasRate]);

  const convertToUsd = useCallback((amount: number, month: number, year: number): number | null => {
    return convertFromHook(amount, year, month);
  }, [convertFromHook]);

  const getAvailableMonthsCount = useCallback((year: number): number => {
    return getAvailableMonths(year).length;
  }, [getAvailableMonths]);

  const formatAmount = useCallback((
    amount: number, 
    month?: number, 
    year?: number
  ): string => {
    // TRY mode - always show TRY
    if (currency === 'TRY') {
      return new Intl.NumberFormat('tr-TR', { 
        style: 'currency', 
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }
    
    // USD mode
    if (month !== undefined && year !== undefined) {
      const rate = getRate(month, year);
      if (rate && rate > 0) {
        const usdAmount = amount / rate;
        return new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(usdAmount);
      }
      // No rate for this month - fallback to TRY with indicator
      return new Intl.NumberFormat('tr-TR', { 
        style: 'currency', 
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' *';
    }
    
    // Use yearly average if no specific month provided
    if (yearlyAverageRate && yearlyAverageRate > 0) {
      const usdAmount = amount / yearlyAverageRate;
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(usdAmount);
    }
    
    // Ultimate fallback - show TRY
    return new Intl.NumberFormat('tr-TR', { 
      style: 'currency', 
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }, [currency, getRate, yearlyAverageRate]);

  const value = useMemo(() => ({
    currency,
    setCurrency,
    formatAmount,
    canShowUsd,
    getRate,
    convertToUsd,
    rates,
    isLoading,
    yearlyAverageRate,
    getAvailableMonthsCount,
  }), [
    currency, 
    formatAmount, 
    canShowUsd, 
    getRate, 
    convertToUsd, 
    rates, 
    isLoading, 
    yearlyAverageRate,
    getAvailableMonthsCount,
  ]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
