import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ReceiptMatch {
  id: string;
  receipt_id: string;
  bank_transaction_id: string;
  match_type: 'full' | 'partial' | 'vat_only';
  matched_amount: number;
  is_auto_suggested: boolean;
  is_confirmed: boolean;
  created_at: string;
  user_id: string;
  // Joined transaction data
  transaction?: {
    id: string;
    transaction_date: string;
    description: string;
    amount: number;
    counterparty?: string;
  };
}

export interface MatchCandidate {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  counterparty?: string;
  category_id?: string;
  is_matched: boolean;
}

export function useReceiptMatching(receiptId: string | undefined) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch suggested and confirmed matches for this receipt
  const { data: matches = [], isLoading: matchesLoading, refetch: refetchMatches } = useQuery({
    queryKey: ['receipt-matches', receiptId],
    queryFn: async () => {
      if (!receiptId) return [];
      
      const { data, error } = await supabase
        .from('receipt_transaction_matches')
        .select(`
          *,
          bank_transactions!inner (
            id,
            transaction_date,
            description,
            amount,
            counterparty
          )
        `)
        .eq('receipt_id', receiptId);
      
      if (error) throw error;
      
      return (data || []).map(m => ({
        ...m,
        transaction: m.bank_transactions
      })) as ReceiptMatch[];
    },
    enabled: !!receiptId
  });

  // Fetch potential match candidates (bank transactions around the receipt date/amount)
  const { data: candidates = [], isLoading: candidatesLoading } = useQuery({
    queryKey: ['match-candidates', receiptId],
    queryFn: async () => {
      if (!receiptId || !user?.id) return [];
      
      // Get receipt info first
      const { data: receipt } = await supabase
        .from('receipts')
        .select('receipt_date, total_amount, document_type')
        .eq('id', receiptId)
        .single();
      
      if (!receipt) return [];
      
      // Calculate date range (30 days before and after)
      const receiptDate = receipt.receipt_date ? new Date(receipt.receipt_date) : new Date();
      const startDate = new Date(receiptDate);
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date(receiptDate);
      endDate.setDate(endDate.getDate() + 30);
      
      // Get transactions in date range
      let query = supabase
        .from('bank_transactions')
        .select('id, transaction_date, description, amount, counterparty, category_id')
        .eq('user_id', user.id)
        .is('is_excluded', false)
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .lte('transaction_date', endDate.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });
      
      // For received invoices (expenses), look for negative amounts
      // For issued invoices (income), look for positive amounts
      if (receipt.document_type === 'received') {
        query = query.lt('amount', 0);
      } else {
        query = query.gt('amount', 0);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      // Get already matched transaction IDs
      const { data: existingMatches } = await supabase
        .from('receipt_transaction_matches')
        .select('bank_transaction_id')
        .eq('receipt_id', receiptId);
      
      const matchedTxIds = new Set((existingMatches || []).map(m => m.bank_transaction_id));
      
      return (data || []).map(t => ({
        ...t,
        is_matched: matchedTxIds.has(t.id)
      })) as MatchCandidate[];
    },
    enabled: !!receiptId && !!user?.id
  });

  // Confirm a suggested match
  const confirmMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from('receipt_transaction_matches')
        .update({ is_confirmed: true })
        .eq('id', matchId);
      
      if (error) throw error;
      
      // Also update the receipt's match status
      const match = matches.find(m => m.id === matchId);
      if (match && receiptId) {
        await supabase
          .from('receipts')
          .update({ 
            match_status: 'matched',
            linked_bank_transaction_id: match.bank_transaction_id
          })
          .eq('id', receiptId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-matches', receiptId] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Eşleşme onaylandı' });
    },
    onError: (err: Error) => {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    }
  });

  // Reject a suggested match
  const rejectMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from('receipt_transaction_matches')
        .delete()
        .eq('id', matchId);
      
      if (error) throw error;
      
      // Update receipt match status if no other matches exist
      if (receiptId) {
        const remainingMatches = matches.filter(m => m.id !== matchId);
        if (remainingMatches.length === 0) {
          await supabase
            .from('receipts')
            .update({ 
              match_status: 'unmatched',
              linked_bank_transaction_id: null
            })
            .eq('id', receiptId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-matches', receiptId] });
      queryClient.invalidateQueries({ queryKey: ['match-candidates', receiptId] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Eşleşme reddedildi' });
    },
    onError: (err: Error) => {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    }
  });

  // Add manual match(es)
  const addManualMatch = useMutation({
    mutationFn: async (params: { 
      transactionIds: string[]; 
      matchType?: 'full' | 'partial' | 'vat_only';
      amounts?: Record<string, number>;
    }) => {
      if (!receiptId || !user?.id) throw new Error('Geçersiz istek');
      
      const { transactionIds, matchType = 'full', amounts = {} } = params;
      
      // Get transaction details for amounts
      const { data: transactions } = await supabase
        .from('bank_transactions')
        .select('id, amount')
        .in('id', transactionIds);
      
      const insertData = transactionIds.map(txId => {
        const tx = transactions?.find(t => t.id === txId);
        const matchedAmount = amounts[txId] || Math.abs(tx?.amount || 0);
        
        return {
          receipt_id: receiptId,
          bank_transaction_id: txId,
          match_type: matchType,
          matched_amount: matchedAmount,
          is_auto_suggested: false,
          is_confirmed: true,
          user_id: user.id
        };
      });
      
      const { error } = await supabase
        .from('receipt_transaction_matches')
        .insert(insertData);
      
      if (error) throw error;
      
      // Update receipt status
      await supabase
        .from('receipts')
        .update({ 
          match_status: 'manual',
          linked_bank_transaction_id: transactionIds[0] // Link to first transaction
        })
        .eq('id', receiptId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-matches', receiptId] });
      queryClient.invalidateQueries({ queryKey: ['match-candidates', receiptId] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Eşleşme eklendi' });
    },
    onError: (err: Error) => {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    }
  });

  // Remove a match
  const removeMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from('receipt_transaction_matches')
        .delete()
        .eq('id', matchId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-matches', receiptId] });
      queryClient.invalidateQueries({ queryKey: ['match-candidates', receiptId] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Eşleşme kaldırıldı' });
    },
    onError: (err: Error) => {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    }
  });

  // Trigger auto-matching for this receipt
  const triggerAutoMatch = useMutation({
    mutationFn: async () => {
      if (!receiptId) throw new Error('Geçersiz fatura ID');
      
      const { data, error } = await supabase.functions.invoke('match-receipts', {
        body: { receiptId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receipt-matches', receiptId] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      if (data?.matches?.length > 0) {
        toast({ title: 'Eşleşme önerisi bulundu', description: 'Onaylamak için aşağıya bakın.' });
      } else {
        toast({ title: 'Eşleşme bulunamadı', description: 'Manuel eşleştirme yapabilirsiniz.' });
      }
    },
    onError: (err: Error) => {
      toast({ title: 'Hata', description: err.message, variant: 'destructive' });
    }
  });

  // Derived states
  const suggestedMatches = matches.filter(m => m.is_auto_suggested && !m.is_confirmed);
  const confirmedMatches = matches.filter(m => m.is_confirmed);
  const totalMatchedAmount = confirmedMatches.reduce((sum, m) => sum + m.matched_amount, 0);

  return {
    // Data
    matches,
    candidates,
    suggestedMatches,
    confirmedMatches,
    totalMatchedAmount,
    
    // Loading states
    isLoading: matchesLoading || candidatesLoading,
    
    // Actions
    confirmMatch,
    rejectMatch,
    addManualMatch,
    removeMatch,
    triggerAutoMatch,
    refetchMatches
  };
}
