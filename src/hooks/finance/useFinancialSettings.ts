import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FinancialSettings } from '@/types/finance';

export function useFinancialSettings() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['financial-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_settings')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as FinancialSettings | null;
    },
    enabled: !!user?.id,
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
            user_id: user!.id,
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

  // Return with defaults
  const defaultSettings: FinancialSettings = {
    id: '',
    user_id: user?.id || '',
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
    notes: null,
    created_at: null,
    updated_at: null,
  };

  return {
    settings: settings || defaultSettings,
    isLoading,
    upsertSettings,
  };
}
