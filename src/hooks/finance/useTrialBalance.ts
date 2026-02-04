import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { OfficialTrialBalance, TrialBalanceAccount, YearlyIncomeStatementFormData } from '@/types/officialFinance';
import { INCOME_STATEMENT_ACCOUNT_MAP } from '@/types/officialFinance';
import { calculateStatementTotals } from './useOfficialIncomeStatement';
import { sanitizeFileName } from '@/lib/fileUtils';

export function useTrialBalance(year: number, month: number | null = null) {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  // Fetch trial balance for the year/month
  const { data: trialBalance, isLoading } = useQuery({
    queryKey: ['official-trial-balance', year, month, userId] as const,
    queryFn: async () => {
      if (!userId) return null;

      let query = supabase
        .from('official_trial_balances')
        .select('*')
        .eq('user_id', userId)
        .eq('year', year);

      if (month !== null) {
        query = query.eq('month', month);
      } else {
        query = query.is('month', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      
      // Parse the accounts JSONB field
      if (data) {
        return {
          ...data,
          accounts: (data.accounts as unknown as Record<string, TrialBalanceAccount>) || {},
        } as OfficialTrialBalance;
      }
      return null;
    },
    enabled: !!userId,
  });

  // Upload and parse trial balance file
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!userId) throw new Error('User not authenticated');

      // Upload file to storage with sanitized file name
      const sanitizedName = sanitizeFileName(file.name);
      const storagePath = `${userId}/mizan/${year}${month ? `-${month}` : ''}-${Date.now()}-${sanitizedName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('finance-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('finance-files')
        .getPublicUrl(storagePath);

      // Parse the file using edge function
      const formData = new FormData();
      formData.append('file', file);

      const { data: parseResult, error: parseError } = await supabase.functions.invoke(
        'parse-trial-balance',
        { body: formData }
      );

      if (parseError) throw parseError;

      // Save to database
      const payload = {
        user_id: userId,
        year,
        month,
        accounts: parseResult.accounts || {},
        file_name: file.name,
        file_url: urlData.publicUrl,
        is_approved: false,
      };

      const { data, error } = await supabase
        .from('official_trial_balances')
        .upsert(payload, { onConflict: 'user_id,year,month' })
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        accounts: (data.accounts as unknown as Record<string, TrialBalanceAccount>) || {},
        totalAccounts: Object.keys(parseResult.accounts || {}).length,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['official-trial-balance', year, month] });
      toast({
        title: 'Mizan Yüklendi',
        description: `${data.totalAccounts} hesap başarıyla parse edildi`,
      });
    },
    onError: (error) => {
      console.error('Failed to upload trial balance:', error);
      toast({
        title: 'Yükleme Hatası',
        description: 'Mizan dosyası işlenemedi',
        variant: 'destructive',
      });
    },
  });

  // Approve and convert to income statement
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !trialBalance) throw new Error('No trial balance to approve');

      // Convert mizan accounts to income statement format
      const incomeStatementData: Partial<YearlyIncomeStatementFormData> = {
        year,
        source: 'mizan_upload',
        file_url: trialBalance.file_url,
      };

      // Map accounts to income statement fields
      Object.entries(trialBalance.accounts).forEach(([code, account]) => {
        const field = INCOME_STATEMENT_ACCOUNT_MAP[code];
        if (field && typeof field === 'string') {
          // Gelir hesapları (6xx) - Alacak bakiyesi = Gelir
          // Gider hesapları (6xx) - Borç bakiyesi = Gider
          const isIncomeAccount = ['600', '601', '602', '640', '642', '643', '646', '647', '649', '671', '679'].includes(code);
          const value = isIncomeAccount ? account.creditBalance : account.debitBalance;
          (incomeStatementData as any)[field] = value;
        }
      });

      // Calculate totals
      const totals = calculateStatementTotals(incomeStatementData);
      
      // Save to income statement table
      const { error: stmtError } = await supabase
        .from('yearly_income_statements')
        .upsert({
          user_id: userId,
          year,
          is_locked: false,
          source: 'mizan_upload',
          file_url: trialBalance.file_url,
          gross_sales_domestic: incomeStatementData.gross_sales_domestic || 0,
          gross_sales_export: incomeStatementData.gross_sales_export || 0,
          gross_sales_other: incomeStatementData.gross_sales_other || 0,
          sales_returns: incomeStatementData.sales_returns || 0,
          sales_discounts: incomeStatementData.sales_discounts || 0,
          cost_of_goods_sold: incomeStatementData.cost_of_goods_sold || 0,
          cost_of_merchandise_sold: incomeStatementData.cost_of_merchandise_sold || 0,
          cost_of_services_sold: incomeStatementData.cost_of_services_sold || 0,
          rd_expenses: incomeStatementData.rd_expenses || 0,
          marketing_expenses: incomeStatementData.marketing_expenses || 0,
          general_admin_expenses: incomeStatementData.general_admin_expenses || 0,
          dividend_income: incomeStatementData.dividend_income || 0,
          interest_income: incomeStatementData.interest_income || 0,
          commission_income: incomeStatementData.commission_income || 0,
          fx_gain: incomeStatementData.fx_gain || 0,
          revaluation_gain: incomeStatementData.revaluation_gain || 0,
          other_income: incomeStatementData.other_income || 0,
          commission_expenses: incomeStatementData.commission_expenses || 0,
          provisions_expense: incomeStatementData.provisions_expense || 0,
          fx_loss: incomeStatementData.fx_loss || 0,
          revaluation_loss: incomeStatementData.revaluation_loss || 0,
          other_expenses: incomeStatementData.other_expenses || 0,
          short_term_finance_exp: incomeStatementData.short_term_finance_exp || 0,
          long_term_finance_exp: incomeStatementData.long_term_finance_exp || 0,
          prior_period_income: incomeStatementData.prior_period_income || 0,
          other_extraordinary_income: incomeStatementData.other_extraordinary_income || 0,
          prior_period_expenses: incomeStatementData.prior_period_expenses || 0,
          other_extraordinary_exp: incomeStatementData.other_extraordinary_exp || 0,
          corporate_tax: incomeStatementData.corporate_tax || 0,
          deferred_tax_expense: incomeStatementData.deferred_tax_expense || 0,
          net_sales: totals.net_sales,
          gross_profit: totals.gross_profit,
          operating_profit: totals.operating_profit,
          net_profit: totals.net_profit,
        }, { onConflict: 'user_id,year' });

      if (stmtError) throw stmtError;

      // Mark trial balance as approved
      const { error: approveError } = await supabase
        .from('official_trial_balances')
        .update({ 
          is_approved: true, 
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', trialBalance.id);

      if (approveError) throw approveError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['official-trial-balance', year, month] });
      queryClient.invalidateQueries({ queryKey: ['official-income-statement', year] });
      toast({
        title: 'Mizan Onaylandı',
        description: 'Veriler gelir tablosuna aktarıldı',
      });
    },
    onError: (error) => {
      console.error('Failed to approve trial balance:', error);
      toast({
        title: 'Onaylama Hatası',
        description: 'Mizan verileri aktarılamadı',
        variant: 'destructive',
      });
    },
  });

  // Delete trial balance
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !trialBalance) throw new Error('No trial balance to delete');

      // Delete file from storage if exists
      if (trialBalance.file_url) {
        const fileName = trialBalance.file_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('finance-files')
            .remove([`${userId}/mizan/${fileName}`]);
        }
      }

      const { error } = await supabase
        .from('official_trial_balances')
        .delete()
        .eq('id', trialBalance.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['official-trial-balance', year, month] });
      toast({
        title: 'Silindi',
        description: 'Mizan verisi silindi',
      });
    },
  });

  return {
    trialBalance,
    isLoading,
    uploadTrialBalance: uploadMutation.mutateAsync,
    approveTrialBalance: approveMutation.mutateAsync,
    deleteTrialBalance: deleteMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    isApproving: approveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
