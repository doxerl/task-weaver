import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  // Get rate for a specific month
  const getRate = (targetYear: number, targetMonth: number): number | null => {
    const rate = rates.find(r => r.year === targetYear && r.month === targetMonth);
    return rate ? Number(rate.rate) : null;
  };

  // Check if rate exists for a specific month
  const hasRate = (targetYear: number, targetMonth: number): boolean => {
    return getRate(targetYear, targetMonth) !== null;
  };

  // Convert TRY to USD
  const convertToUsd = (amountTry: number, targetYear: number, targetMonth: number): number | null => {
    const rate = getRate(targetYear, targetMonth);
    if (!rate || rate === 0) return null;
    return amountTry / rate;
  };

  // Convert USD to TRY
  const convertToTry = (amountUsd: number, targetYear: number, targetMonth: number): number | null => {
    const rate = getRate(targetYear, targetMonth);
    if (!rate) return null;
    return amountUsd * rate;
  };

  // Calculate yearly average rate (for months with data)
  const yearlyAverageRate = useMemo(() => {
    if (!rates.length) return null;
    const sum = rates.reduce((acc, r) => acc + Number(r.rate), 0);
    return sum / rates.length;
  }, [rates]);

  // Get available months for a year
  const getAvailableMonths = (targetYear: number): number[] => {
    return rates
      .filter(r => r.year === targetYear)
      .map(r => r.month);
  };

  // Upsert rate mutation
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

  return {
    rates,
    isLoading,
    error,
    getRate,
    hasRate,
    convertToUsd,
    convertToTry,
    yearlyAverageRate,
    getAvailableMonths,
    upsertRate,
    deleteRate,
  };
}
