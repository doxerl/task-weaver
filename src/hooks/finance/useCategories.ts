import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { TransactionCategory, CategoryType } from '@/types/finance';

export function useCategories() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  // Stable queryKey reference to prevent hook dependency issues
  const queryKey = useMemo(
    () => ['transaction-categories', userId] as const,
    [userId]
  );

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .or(`user_id.eq.${userId},is_system.eq.true`)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as TransactionCategory[];
    },
    enabled: !!userId
  });

  // Hierarchical structure builder
  const buildHierarchy = (cats: TransactionCategory[]): TransactionCategory[] => {
    const parentCats = cats.filter(c => !c.parent_category_id);
    return parentCats.map(parent => ({
      ...parent,
      children: cats.filter(c => c.parent_category_id === parent.id)
    }));
  };

  const grouped = useMemo(() => {
    const byType = {
      income: categories.filter(c => c.type === 'INCOME'),
      expense: categories.filter(c => c.type === 'EXPENSE'),
      partner: categories.filter(c => c.type === 'PARTNER'),
      financing: categories.filter(c => c.type === 'FINANCING'),
      investment: categories.filter(c => c.type === 'INVESTMENT'),
      excluded: categories.filter(c => c.type === 'EXCLUDED'),
      all: categories
    };
    return byType;
  }, [categories]);

  // Hierarchical categories (with children nested)
  const hierarchical = useMemo(() => buildHierarchy(categories), [categories]);

  // Get parent categories only
  const parentCategories = useMemo(() => 
    categories.filter(c => !c.parent_category_id),
  [categories]);

  const createCategory = useMutation({
    mutationFn: async (data: Partial<TransactionCategory>) => {
      const insertData = {
        name: data.name || '',
        code: data.code || '',
        type: data.type || 'EXPENSE',
        color: data.color || '#6b7280',
        icon: data.icon || '💰',
        keywords: data.keywords || [],
        vendor_patterns: data.vendor_patterns || [],
        user_id: userId,
        is_system: data.is_system ?? false,
        account_code: data.account_code || null,
        account_subcode: data.account_subcode || null,
        parent_category_id: data.parent_category_id || null,
        cost_center: data.cost_center || null,
        depth: data.depth ?? 0,
        is_kkeg: data.is_kkeg ?? false,
        sort_order: data.sort_order ?? 0,
      };
      const { error } = await supabase
        .from('transaction_categories')
        .insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction-categories'] })
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TransactionCategory> & { id: string }) => {
      const { error } = await supabase
        .from('transaction_categories')
        .update(data)
        .eq('id', id)
        .eq('is_system', false); // Can only update non-system categories
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction-categories'] })
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transaction_categories')
        .update({ is_active: false })
        .eq('id', id)
        .eq('is_system', false); // Can only delete non-system categories
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transaction-categories'] })
  });

  const getCategoryByCode = (code: string) => categories.find(c => c.code === code);
  const getCategoryById = (id: string) => categories.find(c => c.id === id);

  return { 
    categories, 
    grouped, 
    hierarchical,
    parentCategories,
    isLoading, 
    error,
    createCategory, 
    updateCategory, 
    deleteCategory,
    getCategoryByCode,
    getCategoryById
  };
}
