import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { TransactionCategory, ParsedTransaction } from '@/types/finance';

export interface UserCategoryRule {
  id: string;
  user_id: string;
  pattern: string;
  category_id: string | null;
  rule_type: 'contains' | 'startsWith' | 'exact' | 'regex';
  amount_condition: 'positive' | 'negative' | 'any';
  is_partner_rule: boolean;
  partner_type: 'OUT' | 'IN' | 'BOTH' | null;
  description: string | null;
  priority: number;
  is_active: boolean;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
  category?: TransactionCategory;
}

export interface RuleMatchResult {
  transactionIndex: number;
  categoryId: string | null;
  categoryCode: string;
  categoryType: string;
  confidence: number;
  source: 'user_rule' | 'keyword' | 'ai';
  reasoning: string;
  affectsPnl: boolean;
  balanceImpact: string;
  counterparty?: string;
}

// Check if pattern matches description based on rule type
function matchesPattern(description: string, pattern: string, ruleType: string): boolean {
  const desc = description.toUpperCase();
  const pat = pattern.toUpperCase();
  
  switch (ruleType) {
    case 'contains':
      return desc.includes(pat);
    case 'startsWith':
      return desc.startsWith(pat);
    case 'exact':
      return desc === pat;
    case 'regex':
      try {
        return new RegExp(pattern, 'i').test(description);
      } catch {
        return false;
      }
    default:
      return desc.includes(pat);
  }
}

// Check if amount matches condition
function matchesAmountCondition(amount: number, condition: string): boolean {
  switch (condition) {
    case 'positive':
      return amount > 0;
    case 'negative':
      return amount < 0;
    case 'any':
    default:
      return true;
  }
}

// Check if category type matches amount direction
function isAmountDirectionValid(amount: number, category: TransactionCategory): boolean {
  const type = category.type;
  const code = category.code;
  
  // Income types should have positive amounts
  if (type === 'INCOME' || code.endsWith('_IN')) {
    return amount > 0;
  }
  
  // Expense/outgoing types should have negative amounts
  if (type === 'EXPENSE' || code.endsWith('_OUT')) {
    return amount < 0;
  }
  
  // Partner, Financing, Excluded - check by code suffix
  if (code.endsWith('_IN')) return amount > 0;
  if (code.endsWith('_OUT')) return amount < 0;
  
  // For ambiguous categories, accept any
  return true;
}

// Determine affects_pnl based on category type
function getAffectsPnl(categoryType: string, categoryCode: string): boolean {
  if (categoryType === 'PARTNER') return false;
  if (categoryType === 'EXCLUDED') return false;
  if (categoryCode === 'KREDI_IN' || categoryCode === 'KREDI_OUT') return false;
  if (categoryCode === 'IC_TRANSFER' || categoryCode === 'NAKIT_CEKME') return false;
  return true;
}

// Determine balance impact
function getBalanceImpact(amount: number, categoryType: string): string {
  if (categoryType === 'INCOME') return 'equity_increase';
  if (categoryType === 'EXPENSE') return 'equity_decrease';
  if (categoryType === 'PARTNER') return amount > 0 ? 'liability_decrease' : 'liability_increase';
  if (categoryType === 'FINANCING') return amount > 0 ? 'liability_increase' : 'liability_decrease';
  return 'none';
}

/**
 * Categorize transactions using rules and keywords (client-side)
 * Returns matched transactions and those that need AI categorization
 */
export async function categorizeWithRules(
  transactions: ParsedTransaction[],
  userId: string,
  categories: TransactionCategory[]
): Promise<{ matched: RuleMatchResult[]; needsAI: ParsedTransaction[] }> {
  // 1. Fetch user rules
  const { data: userRules } = await supabase
    .from('user_category_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  const matched: RuleMatchResult[] = [];
  const needsAI: ParsedTransaction[] = [];
  const ruleHits: Map<string, number> = new Map();

  for (const tx of transactions) {
    const desc = tx.description || '';
    const amount = tx.amount || 0;
    let found = false;

    // STAGE 1: User rules (highest priority)
    for (const rule of userRules || []) {
      if (!matchesAmountCondition(amount, rule.amount_condition)) continue;
      if (!matchesPattern(desc, rule.pattern, rule.rule_type)) continue;

      // Handle partner rules specially
      if (rule.is_partner_rule) {
        const categoryCode = amount < 0 ? 'ORTAK_OUT' : 'ORTAK_IN';
        const partnerCat = categories.find(c => c.code === categoryCode);
        
        matched.push({
          transactionIndex: tx.index,
          categoryId: partnerCat?.id || null,
          categoryCode,
          categoryType: 'PARTNER',
          confidence: 1.0,
          source: 'user_rule',
          reasoning: `Ortak kuralı: "${rule.pattern}"`,
          affectsPnl: false,
          balanceImpact: getBalanceImpact(amount, 'PARTNER'),
          counterparty: rule.pattern
        });
      } else if (rule.category_id) {
        const cat = categories.find(c => c.id === rule.category_id);
        if (cat) {
          matched.push({
            transactionIndex: tx.index,
            categoryId: cat.id,
            categoryCode: cat.code,
            categoryType: cat.type,
            confidence: 1.0,
            source: 'user_rule',
            reasoning: `Kural: "${rule.pattern}"`,
            affectsPnl: getAffectsPnl(cat.type, cat.code),
            balanceImpact: getBalanceImpact(amount, cat.type)
          });
        }
      }

      // Track hit count for later update
      ruleHits.set(rule.id, (ruleHits.get(rule.id) || 0) + 1);
      found = true;
      break;
    }
    if (found) continue;

    // STAGE 2: Keyword matching
    for (const cat of categories) {
      if (!cat.keywords || cat.keywords.length === 0) continue;
      
      const keywordMatch = cat.keywords.find(kw => 
        desc.toUpperCase().includes(kw.toUpperCase())
      );

      if (keywordMatch) {
        // Check amount direction validity
        if (!isAmountDirectionValid(amount, cat)) {
          continue; // Skip if amount direction doesn't match
        }

        matched.push({
          transactionIndex: tx.index,
          categoryId: cat.id,
          categoryCode: cat.code,
          categoryType: cat.type,
          confidence: 0.95,
          source: 'keyword',
          reasoning: `Keyword: "${keywordMatch}"`,
          affectsPnl: getAffectsPnl(cat.type, cat.code),
          balanceImpact: getBalanceImpact(amount, cat.type)
        });
        found = true;
        break;
      }
    }
    if (found) continue;

    // STAGE 3: Send to AI
    needsAI.push(tx);
  }

  // Update hit counts asynchronously (fire and forget)
  if (ruleHits.size > 0) {
    for (const [ruleId, hits] of ruleHits) {
      supabase
        .from('user_category_rules')
        .update({ 
          hit_count: hits, 
          last_hit_at: new Date().toISOString() 
        })
        .eq('id', ruleId)
        .then(() => {});
    }
  }

  return { matched, needsAI };
}

export function useCategoryRules() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ['user-category-rules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_category_rules')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data as UserCategoryRule[];
    },
    enabled: !!user?.id
  });

  const createRule = useMutation({
    mutationFn: async (data: Partial<UserCategoryRule>) => {
      const { error } = await supabase
        .from('user_category_rules')
        .insert({
          user_id: user?.id,
          pattern: data.pattern || '',
          category_id: data.category_id || null,
          rule_type: data.rule_type || 'contains',
          amount_condition: data.amount_condition || 'any',
          is_partner_rule: data.is_partner_rule || false,
          partner_type: data.partner_type || null,
          description: data.description || null,
          priority: data.priority || 100,
          is_active: true
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-category-rules'] })
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...data }: Partial<UserCategoryRule> & { id: string }) => {
      const { error } = await supabase
        .from('user_category_rules')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-category-rules'] })
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_category_rules')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-category-rules'] })
  });

  return {
    rules,
    isLoading,
    error,
    createRule,
    updateRule,
    deleteRule
  };
}
