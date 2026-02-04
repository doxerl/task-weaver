import { useState, useEffect } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BALANCE_SHEET_ACCOUNT_MAP, BalanceSheetParsedAccount } from '@/types/officialFinance';
import { sanitizeFileName } from '@/lib/fileUtils';

export interface BalanceSheetUploadResult {
  accounts: BalanceSheetParsedAccount[];
  summary: {
    accountCount: number;
    totalAssets: number;
    totalLiabilities: number;
    isBalanced: boolean;
  };
}

export function useBalanceSheetUpload(year: number) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [uploadResult, setUploadResult] = useState<BalanceSheetUploadResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  // Load existing upload from database
  const { data: existingUpload, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['balance-sheet-upload', year, userId] as const,
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('yearly_balance_sheets')
        .select('source, file_name, file_url, raw_accounts, is_locked, total_assets, total_liabilities')
        .eq('user_id', userId)
        .eq('year', year)
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
  });

  // Sync existing data to upload state
  useEffect(() => {
    if (existingUpload?.source === 'file_upload') {
      if (existingUpload.raw_accounts) {
        // Ham hesaplar varsa bunları göster
        const accounts = existingUpload.raw_accounts as unknown as BalanceSheetParsedAccount[];
        const { totalAssets, totalLiabilities } = calculateBalanceSheetTotals(accounts);

        setUploadResult({
          accounts,
          summary: {
            accountCount: accounts.length,
            totalAssets: Math.round(totalAssets),
            totalLiabilities: Math.round(totalLiabilities),
            isBalanced: Math.abs(totalAssets - totalLiabilities) < 1,
          },
        });
      } else if (existingUpload.total_assets || existingUpload.total_liabilities) {
        // raw_accounts yoksa veritabanından toplam değerleri kullan
        const totalAssets = existingUpload.total_assets || 0;
        const totalLiabilities = existingUpload.total_liabilities || 0;
        setUploadResult({
          accounts: [],
          summary: {
            accountCount: 0,
            totalAssets,
            totalLiabilities,
            isBalanced: Math.abs(totalAssets - totalLiabilities) < 1,
          },
        });
      }
      setFileName(existingUpload.file_name);
      setFileUrl(existingUpload.file_url);
    }
  }, [existingUpload]);

// Helper function to calculate balance sheet totals with correct negative value handling
function calculateBalanceSheetTotals(accounts: BalanceSheetParsedAccount[]): { totalAssets: number; totalLiabilities: number } {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const account of accounts) {
    const mainCode = account.code.split('.')[0];
    
    if (mainCode.startsWith('1') || mainCode.startsWith('2')) {
      // AKTIF hesaplar: Net bakiye = debit - credit
      if (mainCode === '257') {
        // Birikmiş amortisman - her zaman düşürücü
        totalAssets -= Math.abs(account.creditBalance || account.debitBalance || 0);
      } else {
        totalAssets += (account.debitBalance || 0) - (account.creditBalance || 0);
      }
    } else {
      // PASİF + ÖZKAYNAKLAR: Net bakiye = credit - debit
      // Negatif bakiyeli hesaplar (501, 591) otomatik olarak düşer
      const netBalance = (account.creditBalance || 0) - (account.debitBalance || 0);
      totalLiabilities += netBalance;
    }
  }

  return { totalAssets, totalLiabilities };
}

  const uploadBalanceSheet = async (file: File) => {
    if (!userId) {
      toast.error('Oturum açmanız gerekiyor');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload to storage with sanitized file name
      const sanitizedName = sanitizeFileName(file.name);
      const filePath = `${userId}/balance-sheets/${year}/${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage
        .from('finance-files')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(`Dosya yüklenemedi: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('finance-files')
        .getPublicUrl(filePath);

      setFileUrl(urlData.publicUrl);
      setFileName(file.name);

      // 2. Call edge function to parse
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-balance-sheet`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Bilanço parse edilemedi');
      }

      const result = await response.json();
      
      if (!result.success || !result.data?.accounts) {
        throw new Error('Bilanço verileri okunamadı');
      }

      setUploadResult({
        accounts: result.data.accounts,
        summary: result.summary,
      });

      toast.success(`${result.summary.accountCount} hesap bulundu`);

    } catch (error) {
      console.error('Balance sheet upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Yükleme hatası');
      setUploadResult(null);
    } finally {
      setIsUploading(false);
    }
  };

  const approveAndSave = async () => {
    if (!userId || !uploadResult) {
      toast.error('Onaylanacak veri yok');
      return;
    }

    setIsApproving(true);
    try {
      // Map parsed accounts to database fields
      const balanceData: Record<string, number> = {};
      
      for (const account of uploadResult.accounts) {
        const mainCode = account.code.split('.')[0];
        const fieldName = BALANCE_SHEET_ACCOUNT_MAP[mainCode];
        
        if (fieldName) {
          // For assets (1xx, 2xx): use debit balance
          // For liabilities/equity (3xx, 4xx, 5xx): use credit balance
          let value = 0;
          if (mainCode.startsWith('1') || mainCode.startsWith('2')) {
            value = account.debitBalance || account.debit || 0;
            // 257 is contra account
            if (mainCode === '257') {
              value = Math.abs(account.creditBalance || account.credit || account.debitBalance || 0);
            }
          } else {
            value = account.creditBalance || account.credit || 0;
            // 501 is contra account
            if (mainCode === '501') {
              value = Math.abs(account.debitBalance || account.debit || account.creditBalance || 0);
            }
          }

          // Accumulate if same field (e.g., multiple 320.xxx under trade_payables)
          balanceData[fieldName] = (balanceData[fieldName] || 0) + value;
        }
      }

      // Calculate totals
      let totalAssets = 0;
      let totalLiabilities = 0;

      // Sum assets
      ['cash_on_hand', 'bank_balance', 'trade_receivables', 'partner_receivables', 
       'vat_receivable', 'other_vat', 'inventory', 'vehicles', 'fixtures', 'equipment']
        .forEach(field => { totalAssets += balanceData[field] || 0; });
      totalAssets -= (balanceData['accumulated_depreciation'] || 0);

      // Sum liabilities + equity
      ['short_term_loan_debt', 'trade_payables', 'partner_payables', 'personnel_payables',
       'tax_payables', 'social_security_payables', 'vat_payable', 'deferred_tax_liabilities',
       'tax_provision', 'bank_loans', 'paid_capital', 'retained_earnings', 'current_profit']
        .forEach(field => { totalLiabilities += balanceData[field] || 0; });
      totalLiabilities -= (balanceData['unpaid_capital'] || 0);

      // Check if record exists
      const { data: existing } = await supabase
        .from('yearly_balance_sheets')
        .select('id')
        .eq('user_id', userId)
        .eq('year', year)
        .maybeSingle();

      // Convert accounts to JSON-compatible format
      const rawAccountsJson = JSON.parse(JSON.stringify(uploadResult.accounts));

      const payload = {
        user_id: userId,
        year,
        ...balanceData,
        total_assets: Math.round(totalAssets),
        total_liabilities: Math.round(totalLiabilities),
        source: 'file_upload' as const,
        file_name: fileName,
        file_url: fileUrl,
        uploaded_at: new Date().toISOString(),
        raw_accounts: rawAccountsJson,
        is_locked: true,
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await supabase
          .from('yearly_balance_sheets')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('yearly_balance_sheets')
          .insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['yearly-balance-sheet', userId, year] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet-upload', year, userId] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      toast.success('Bilanço kaydedildi ve kilitlendi');

    } catch (error) {
      console.error('Approve balance sheet error:', error);
      toast.error(error instanceof Error ? error.message : 'Kaydetme hatası');
    } finally {
      setIsApproving(false);
    }
  };

  const clearUpload = async () => {
    if (existingUpload?.source === 'file_upload' && user?.id) {
      // Clear the file info from database
      await supabase
        .from('yearly_balance_sheets')
        .update({ 
          source: 'manual', 
          file_name: null, 
          file_url: null, 
          raw_accounts: null,
          is_locked: false 
        })
        .eq('user_id', userId)
        .eq('year', year);
      
      queryClient.invalidateQueries({ queryKey: ['balance-sheet-upload', year, userId] });
    }
    
    setUploadResult(null);
    setFileName(null);
    setFileUrl(null);
  };

  return {
    uploadBalanceSheet,
    approveAndSave,
    clearUpload,
    isUploading,
    isApproving,
    isLoadingExisting,
    uploadResult,
    fileName,
    isLocked: existingUpload?.is_locked ?? false,
  };
}
