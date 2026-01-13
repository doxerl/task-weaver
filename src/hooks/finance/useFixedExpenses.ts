import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FixedExpenseDefinition {
  id: string;
  user_id: string;
  category_id: string | null;
  expense_name: string;
  expense_type: 'fixed' | 'semi_fixed' | 'installment';
  monthly_amount: number | null;
  total_amount: number | null;
  installment_months: number | null;
  installments_paid: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FixedExpenseSummary {
  monthlyFixed: number;
  monthlyInstallments: number;
  totalMonthly: number;
  yearlyProjected: number;
  activeDefinitions: FixedExpenseDefinition[];
  installmentDetails: {
    definition: FixedExpenseDefinition;
    monthlyAmount: number;
    remainingMonths: number;
    remainingTotal: number;
  }[];
}

export function useFixedExpenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: definitions = [], isLoading } = useQuery({
    queryKey: ['fixed-expense-definitions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('fixed_expense_definitions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('expense_name');
      
      if (error) throw error;
      return (data || []) as FixedExpenseDefinition[];
    },
    enabled: !!user?.id
  });

  // Calculate summary
  const summary: FixedExpenseSummary = {
    monthlyFixed: 0,
    monthlyInstallments: 0,
    totalMonthly: 0,
    yearlyProjected: 0,
    activeDefinitions: definitions,
    installmentDetails: []
  };

  definitions.forEach(def => {
    if (def.expense_type === 'installment') {
      // Aylık taksit tutarını al: önce monthly_amount, yoksa total_amount / installment_months
      const monthlyAmount = def.monthly_amount || 
        (def.total_amount && def.installment_months ? def.total_amount / def.installment_months : 0);
      const paid = def.installments_paid || 0;
      const totalMonths = def.installment_months || 0;
      const remaining = Math.max(0, totalMonths - paid);
      
      if (remaining > 0 && monthlyAmount > 0) {
        summary.monthlyInstallments += monthlyAmount;
        summary.installmentDetails.push({
          definition: def,
          monthlyAmount,
          remainingMonths: remaining,
          remainingTotal: remaining * monthlyAmount
        });
      }
    } else if (def.monthly_amount) {
      summary.monthlyFixed += def.monthly_amount;
    }
  });

  summary.totalMonthly = summary.monthlyFixed + summary.monthlyInstallments;
  summary.yearlyProjected = summary.totalMonthly * 12;

  // Mutations
  const createDefinition = useMutation({
    mutationFn: async (data: Omit<Partial<FixedExpenseDefinition>, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const insertData = {
        expense_name: data.expense_name || '',
        expense_type: data.expense_type || 'fixed',
        category_id: data.category_id,
        monthly_amount: data.monthly_amount,
        total_amount: data.total_amount,
        installment_months: data.installment_months,
        installments_paid: data.installments_paid,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: data.is_active ?? true,
        notes: data.notes,
        user_id: user.id
      };
      
      const { error } = await supabase
        .from('fixed_expense_definitions')
        .insert(insertData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-expense-definitions'] });
      toast.success('Sabit gider tanımı eklendi');
    },
    onError: () => {
      toast.error('Sabit gider tanımı eklenemedi');
    }
  });

  const updateDefinition = useMutation({
    mutationFn: async ({ id, ...data }: Partial<FixedExpenseDefinition> & { id: string }) => {
      const { error } = await supabase
        .from('fixed_expense_definitions')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-expense-definitions'] });
      toast.success('Sabit gider güncellendi');
    },
    onError: () => {
      toast.error('Güncelleme başarısız');
    }
  });

  const deleteDefinition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fixed_expense_definitions')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-expense-definitions'] });
      toast.success('Sabit gider silindi');
    },
    onError: () => {
      toast.error('Silme başarısız');
    }
  });

  return {
    definitions,
    summary,
    isLoading,
    createDefinition,
    updateDefinition,
    deleteDefinition
  };
}
