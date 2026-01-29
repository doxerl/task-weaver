import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { calculateStatementTotals } from './useOfficialIncomeStatement';
import type { YearlyIncomeStatementFormData } from '@/types/officialFinance';

interface SubAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
}

interface IncomeStatementAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
  subAccounts?: SubAccount[];
}

interface ParseResult {
  accounts: IncomeStatementAccount[];
  mappedData: Record<string, number>;
  detectedFormat: string;
  totalRows: number;
  warnings: string[];
}

interface UploadState {
  fileName: string | null;
  accounts: IncomeStatementAccount[];
  mappedData: Record<string, number>;
  warnings: string[];
  isApproved: boolean;
}

export function useIncomeStatementUpload(year: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const uploadIncomeStatement = useCallback(async (file: File) => {
    if (!userId) {
      toast({
        title: 'Hata',
        description: 'Oturum açmanız gerekiyor',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-income-statement`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Dosya işlenemedi');
      }

      const result: ParseResult = await response.json();

      if (result.accounts.length === 0) {
        toast({
          title: 'Uyarı',
          description: result.warnings?.join(', ') || 'Dosyadan gelir tablosu hesabı çıkarılamadı',
          variant: 'destructive',
        });
        return;
      }

      setUploadState({
        fileName: file.name,
        accounts: result.accounts,
        mappedData: result.mappedData,
        warnings: result.warnings || [],
        isApproved: false,
      });

      toast({
        title: 'Başarılı',
        description: `${result.totalRows} hesap parse edildi`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Dosya yüklenemedi',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [userId]);

  const approveIncomeStatement = useCallback(async () => {
    if (!userId || !uploadState) {
      toast({
        title: 'Hata',
        description: 'Veri bulunamadı',
        variant: 'destructive',
      });
      return;
    }

    setIsApproving(true);

    try {
      // Build the form data from mapped data
      const formData: Partial<YearlyIncomeStatementFormData> = {
        year,
        source: 'mizan_upload',
        ...uploadState.mappedData,
      };

      // Calculate totals
      const totals = calculateStatementTotals(formData);

      const payload = {
        ...formData,
        ...totals,
        user_id: userId,
        year,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('yearly_income_statements')
        .upsert(payload as any, { onConflict: 'user_id,year' })
        .select()
        .single();

      if (error) throw error;

      // Update state to approved
      setUploadState(prev => prev ? { ...prev, isApproved: true } : null);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['official-income-statement', year] });

      toast({
        title: 'Onaylandı',
        description: `${year} yılı gelir tablosu verileri kaydedildi`,
      });

    } catch (error) {
      console.error('Approve error:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Veriler kaydedilemedi',
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  }, [userId, uploadState, year, queryClient]);

  const deleteUpload = useCallback(() => {
    setUploadState(null);
    toast({
      title: 'Silindi',
      description: 'Yüklenen veriler silindi',
    });
  }, []);

  return {
    uploadState,
    isUploading,
    isApproving,
    uploadIncomeStatement,
    approveIncomeStatement,
    deleteUpload,
  };
}
