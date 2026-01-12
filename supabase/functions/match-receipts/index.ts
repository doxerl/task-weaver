import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { receiptId, year, month } = await req.json();

    // Get unmatched receipts
    let receiptsQuery = supabase
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)
      .eq('match_status', 'unmatched')
      .not('total_amount', 'is', null);
    
    if (receiptId) {
      receiptsQuery = receiptsQuery.eq('id', receiptId);
    } else {
      if (year) receiptsQuery = receiptsQuery.eq('year', year);
      if (month) receiptsQuery = receiptsQuery.eq('month', month);
    }

    const { data: receipts, error: receiptsError } = await receiptsQuery;
    if (receiptsError) throw receiptsError;

    if (!receipts || receipts.length === 0) {
      return new Response(JSON.stringify({ matches: [], message: 'No unmatched receipts found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get bank transactions for matching
    const { data: transactions, error: txError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('user_id', user.id)
      .is('is_excluded', false)
      .order('transaction_date', { ascending: false })
      .limit(500);
    
    if (txError) throw txError;

    const matches: Array<{
      receiptId: string;
      transactionId: string;
      confidence: number;
      matchFactors: {
        amountMatch: boolean;
        amountDiff: number;
        dateProximity: number;
        vendorSimilarity: number;
      };
    }> = [];

    // Simple matching algorithm - GROSS AMOUNT MATCHING (KDV dahil)
    for (const receipt of receipts) {
      if (!receipt.total_amount) continue;
      
      const receiptAmount = Math.abs(receipt.total_amount); // Brüt tutar
      const receiptDate = receipt.receipt_date ? new Date(receipt.receipt_date) : null;
      const vendorName = (receipt.seller_name || receipt.vendor_name || '').toLowerCase();
      
      let bestMatch: typeof matches[0] | null = null;
      
      for (const tx of transactions || []) {
        if (!tx.amount) continue;
        
        const txAmount = Math.abs(tx.amount); // Brüt tutar
        const txDate = tx.transaction_date ? new Date(tx.transaction_date) : null;
        const txDesc = (tx.description || '').toLowerCase();
        const txCounterparty = (tx.counterparty || '').toLowerCase();
        
        // Amount matching - BRÜT TUTAR ÜZERİNDEN (within 2% tolerance)
        const amountDiff = Math.abs(receiptAmount - txAmount) / receiptAmount;
        const amountMatch = amountDiff <= 0.02;
        
        if (!amountMatch) continue;
        
        // Date proximity (within 7 days)
        let dateProximity = 30;
        if (receiptDate && txDate) {
          dateProximity = Math.abs(receiptDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24);
        }
        
        if (dateProximity > 7) continue;
        
        // Vendor similarity - check both description and counterparty
        let vendorSimilarity = 0;
        if (vendorName) {
          const vendorWords = vendorName.split(/\s+/).filter((w: string) => w.length > 2);
          const searchText = `${txDesc} ${txCounterparty}`;
          const matchingWords = vendorWords.filter((word: string) => searchText.includes(word));
          vendorSimilarity = vendorWords.length > 0 ? matchingWords.length / vendorWords.length : 0;
        }
        
        // Calculate confidence
        let confidence = 0;
        if (amountMatch) confidence += 0.5;
        confidence += (1 - (dateProximity / 7)) * 0.3;
        confidence += vendorSimilarity * 0.2;
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            receiptId: receipt.id,
            transactionId: tx.id,
            confidence,
            matchFactors: {
              amountMatch,
              amountDiff,
              dateProximity,
              vendorSimilarity
            }
          };
        }
      }
      
      if (bestMatch && bestMatch.confidence >= 0.5) {
        matches.push(bestMatch);
        
        // Insert into receipt_transaction_matches as AUTO SUGGESTED (not confirmed)
        await supabase
          .from('receipt_transaction_matches')
          .upsert({
            receipt_id: receipt.id,
            bank_transaction_id: bestMatch.transactionId,
            match_type: 'full',
            matched_amount: receiptAmount,
            is_auto_suggested: true,
            is_confirmed: false,
            user_id: user.id
          }, { onConflict: 'receipt_id,bank_transaction_id' });
        
        // Update receipt with suggested match status
        await supabase
          .from('receipts')
          .update({
            match_status: 'suggested',
            match_confidence: bestMatch.confidence
          })
          .eq('id', receipt.id);
      }
    }

    return new Response(JSON.stringify({ 
      matches,
      processed: receipts.length,
      matched: matches.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('match-receipts error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});