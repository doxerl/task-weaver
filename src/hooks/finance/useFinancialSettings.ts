import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FinancialSettings } from '@/types/finance';

export function useFinancialSettings() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  // Stable queryKey reference to prevent hook dependency issues
  const queryKey = useMemo(
    () => ['financial-settings', userId] as const,
    [userId]
  );

  const { data: settings, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_settings')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle();

      if (error) throw error;
      return data as FinancialSettings | null;
    },
    enabled: !!userId,
  });

  const upsertSettings = useMutation({
    mutationFn: async (updates: Partial<Omit<FinancialSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from('financial_settings')
          .update(updates)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('financial_settings')
          .insert({
            user_id: userId!,
            ...updates,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-settings'] });
      toast.success('Ayarlar kaydedildi');
    },
    onError: (error) => {
      toast.error('Ayarlar kaydedilemedi: ' + error.message);
    },
  });

  // Return with stable defaults using useMemo to prevent infinite loops
  const stableSettings = useMemo<FinancialSettings>(() => {
    if (settings) return settings;
    
    return {
      id: '',
      user_id: userId || '',
      paid_capital: 0,
      retained_earnings: 0,
      fiscal_year_start: 1,
      cash_on_hand: 0,
      inventory_value: 0,
      equipment_value: 0,
      vehicles_value: 0,
      accumulated_depreciation: 0,
      bank_loans: 0,
      trade_receivables: 0,
      trade_payables: 0,
      // New fields for detailed balance sheet
      unpaid_capital: 0,
      legal_reserves: 0,
      other_vat: 0,
      personnel_payables: 0,
      tax_payables: 0,
      social_security_payables: 0,
      deferred_tax_liabilities: 0,
      calculated_vat_payable: 0,
      fixtures_value: 0,
      // 2024 açılış değerleri
      opening_bank_balance: 0,
      opening_cash_on_hand: 0,
      partner_payables: 0,
      tax_provision: 0,
      notes: null,
      created_at: null,
      updated_at: null,
      // Amortisman hesaplama alanları
      depreciation_method: 'straight_line',
      vehicles_purchase_date: null,
      vehicles_useful_life_years: 5,
      fixtures_purchase_date: null,
      fixtures_useful_life_years: 5,
      equipment_purchase_date: null,
      equipment_useful_life_years: 5,
      partner_receivables_capital: 0,
    };
  }, [settings, userId]);

  return {
    settings: stableSettings,
    isLoading,
    upsertSettings,
  };
}
