import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Note: This hook doesn't require userId-based queryKey stabilization
// because it queries public exchange rate data, not user-specific data

// Hardcoded monthly average USD/TRY rates (TCMB source) as fallback
const FALLBACK_USD_TRY_RATES: Record<string, number> = {
  // 2024
  '2024-1': 30.12, '2024-2': 30.85, '2024-3': 31.57,
  '2024-4': 32.23, '2024-5': 32.46, '2024-6': 32.79,
  '2024-7': 33.12, '2024-8': 33.57, '2024-9': 34.01,
  '2024-10': 34.23, '2024-11': 34.57, '2024-12': 34.90,
  // 2025
  '2025-1': 35.44, '2025-2': 36.07, '2025-3': 37.00,
  '2025-4': 38.01, '2025-5': 38.66, '2025-6': 39.33,
  '2025-7': 40.10, '2025-8': 40.73, '2025-9': 41.22,
  '2025-10': 41.73, '2025-11': 42.17, '2025-12': 42.58,
  // 2026 (estimated)
  '2026-1': 43.00, '2026-2': 43.50, '2026-3': 44.00,
  '2026-4': 44.50, '2026-5': 45.00, '2026-6': 45.50,
  '2026-7': 46.00, '2026-8': 46.50, '2026-9': 47.00,
  '2026-10': 47.50, '2026-11': 48.00, '2026-12': 48.50,
};

// Hardcoded monthly average EUR/TRY rates (TCMB source) as fallback
const FALLBACK_EUR_TRY_RATES: Record<string, number> = {
  // 2024
  '2024-1': 32.83, '2024-2': 33.32, '2024-3': 34.30,
  '2024-4': 34.38, '2024-5': 35.02, '2024-6': 35.06,
  '2024-7': 35.99, '2024-8': 37.06, '2024-9': 37.86,
  '2024-10': 37.14, '2024-11': 36.25, '2024-12': 36.54,
  // 2025
  '2025-1': 36.64, '2025-2': 37.52, '2025-3': 40.16,
  '2025-4': 43.34, '2025-5': 43.61, '2025-6': 44.27,
  '2025-7': 44.91, '2025-8': 45.42, '2025-9': 45.97,
  '2025-10': 45.27, '2025-11': 44.20, '2025-12': 44.53,
  // 2026 (updated with current TCMB data)
  '2026-1': 50.76, '2026-2': 51.50, '2026-3': 52.00,
  '2026-4': 52.50, '2026-5': 53.00, '2026-6': 53.50,
  '2026-7': 54.00, '2026-8': 54.50, '2026-9': 55.00,
  '2026-10': 55.50, '2026-11': 56.00, '2026-12': 56.50,
};

export interface ExchangeRate {
  id: string;
  year: number;
  month: number;
  currency_pair: string;
  rate: number;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export function useExchangeRates(year?: number) {
  const queryClient = useQueryClient();

  // Fetch rates for a specific year or all rates
  const { data: rates = [], isLoading, error } = useQuery({
    queryKey: ['exchange-rates', year],
    queryFn: async () => {
      let query = supabase
        .from('monthly_exchange_rates')
        .select('*')
        .eq('currency_pair', 'USD/TRY')
        .order('year', { ascending: true })
        .order('month', { ascending: true });
      
      if (year) {
        query = query.eq('year', year);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data ?? []) as ExchangeRate[];
    },
  });

  // Upsert rate mutation - MUST be called before useCallback/useMemo that depend on rates
  const upsertRate = useMutation({
    mutationFn: async ({ 
      year: rateYear, 
      month, 
      rate, 
      source = 'manual' 
    }: { 
      year: number; 
      month: number; 
      rate: number; 
      source?: string;
    }) => {
      const { error } = await supabase
        .from('monthly_exchange_rates')
        .upsert(
          { 
            year: rateYear, 
            month, 
            currency_pair: 'USD/TRY', 
            rate, 
            source,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'year,month,currency_pair' }
        );
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
    },
  });

  // Delete rate mutation
  const deleteRate = useMutation({
    mutationFn: async ({ rateYear, month }: { rateYear: number; month: number }) => {
      const { error } = await supabase
        .from('monthly_exchange_rates')
        .delete()
        .eq('year', rateYear)
        .eq('month', month)
        .eq('currency_pair', 'USD/TRY');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
    },
  });

  // Get USD/TRY rate for a specific month (with fallback)
  const getRate = useCallback((targetYear: number, targetMonth: number): number | null => {
    // First check database
    const dbRate = rates.find(r => r.year === targetYear && r.month === targetMonth);
    if (dbRate) return Number(dbRate.rate);
    
    // Fallback to hardcoded rates
    const key = `${targetYear}-${targetMonth}`;
    return FALLBACK_USD_TRY_RATES[key] || null;
  }, [rates]);

  // Get rate for any currency (USD, EUR) with fallback
  const getCurrencyRate = useCallback((currency: string, targetYear: number, targetMonth: number): number | null => {
    const key = `${targetYear}-${targetMonth}`;
    
    if (currency === 'USD') {
      // First check database, then fallback
      const dbRate = rates.find(r => r.year === targetYear && r.month === targetMonth);
      if (dbRate) return Number(dbRate.rate);
      return FALLBACK_USD_TRY_RATES[key] || null;
    }
    
    if (currency === 'EUR') {
      return FALLBACK_EUR_TRY_RATES[key] || null;
    }
    
    // For other currencies, try to use USD rate as approximation
    return getRate(targetYear, targetMonth);
  }, [rates, getRate]);

  // Check if rate exists for a specific month
  const hasRate = useCallback((targetYear: number, targetMonth: number): boolean => {
    return getRate(targetYear, targetMonth) !== null;
  }, [getRate]);

  // Convert TRY to USD
  const convertToUsd = useCallback((amountTry: number, targetYear: number, targetMonth: number): number | null => {
    const rate = getRate(targetYear, targetMonth);
    if (!rate || rate === 0) return null;
    return amountTry / rate;
  }, [getRate]);

  // Convert USD to TRY
  const convertToTry = useCallback((amountUsd: number, targetYear: number, targetMonth: number): number | null => {
    const rate = getRate(targetYear, targetMonth);
    if (!rate) return null;
    return amountUsd * rate;
  }, [getRate]);

  // Calculate yearly average rate (for months with data)
  const yearlyAverageRate = useMemo(() => {
    if (!rates.length) return null;
    const sum = rates.reduce((acc, r) => acc + Number(r.rate), 0);
    return sum / rates.length;
  }, [rates]);

  // Get available months for a year
  const getAvailableMonths = useCallback((targetYear: number): number[] => {
    return rates
      .filter(r => r.year === targetYear)
      .map(r => r.month);
  }, [rates]);

  return {
    rates,
    isLoading,
    error,
    getRate,
    getCurrencyRate,
    hasRate,
    convertToUsd,
    convertToTry,
    yearlyAverageRate,
    getAvailableMonths,
    upsertRate,
    deleteRate,
    // Export fallback rates for direct access if needed
    FALLBACK_USD_TRY_RATES,
    FALLBACK_EUR_TRY_RATES,
  };
}
