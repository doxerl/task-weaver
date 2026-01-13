import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PayrollAccrual, PayrollAccrualSummary } from '@/types/reports';
import { useMemo } from 'react';

export function usePayrollAccruals(year: number) {
  const { data: accruals, isLoading } = useQuery({
    queryKey: ['payroll-accruals', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_accruals')
        .select('*')
        .eq('year', year)
        .order('month', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const summary = useMemo((): PayrollAccrualSummary => {
    if (!accruals || accruals.length === 0) {
      return {
        totalNetPayable: 0,
        totalTaxPayable: 0,
        totalSgkPayable: 0,
        totalGrossSalary: 0,
        totalEmployerContribution: 0,
      };
    }

    // Sadece ödenmemiş tahakkukları topla (bilanço için)
    const unpaidAccruals = accruals.filter(a => !a.is_net_paid || !a.is_tax_paid || !a.is_sgk_paid);
    
    // Son ayın verilerini al (dönem sonu bakiye)
    const lastMonth = accruals[accruals.length - 1];
    
    return {
      // Ödenmemiş net maaş borcu
      totalNetPayable: accruals
        .filter(a => !a.is_net_paid)
        .reduce((sum, a) => sum + Number(a.net_payable || 0), 0),
      
      // Ödenmemiş vergi borcu (GV + Damga)
      totalTaxPayable: accruals
        .filter(a => !a.is_tax_paid)
        .reduce((sum, a) => sum + Number(a.income_tax_payable || 0) + Number(a.stamp_tax_payable || 0), 0),
      
      // Ödenmemiş SGK borcu (işçi + işveren + işsizlik)
      totalSgkPayable: accruals
        .filter(a => !a.is_sgk_paid)
        .reduce((sum, a) => sum + Number(a.employee_sgk_payable || 0) + Number(a.employer_sgk_payable || 0) + Number(a.unemployment_payable || 0), 0),
      
      // Toplam brüt ücret (P&L için)
      totalGrossSalary: accruals.reduce((sum, a) => sum + Number(a.gross_salary || 0), 0),
      
      // Toplam işveren primi (P&L için)
      totalEmployerContribution: accruals.reduce((sum, a) => sum + Number(a.employer_contribution || 0), 0),
    };
  }, [accruals]);

  // Formatted accruals for display
  const formattedAccruals = useMemo((): PayrollAccrual[] => {
    if (!accruals) return [];
    
    return accruals.map(a => ({
      id: a.id,
      year: a.year,
      month: a.month,
      grossSalary: Number(a.gross_salary || 0),
      employerContribution: Number(a.employer_contribution || 0),
      netPayable: Number(a.net_payable || 0),
      incomeTaxPayable: Number(a.income_tax_payable || 0),
      stampTaxPayable: Number(a.stamp_tax_payable || 0),
      employeeSgkPayable: Number(a.employee_sgk_payable || 0),
      employerSgkPayable: Number(a.employer_sgk_payable || 0),
      unemploymentPayable: Number(a.unemployment_payable || 0),
      isNetPaid: a.is_net_paid || false,
      isTaxPaid: a.is_tax_paid || false,
      isSgkPaid: a.is_sgk_paid || false,
    }));
  }, [accruals]);

  return {
    accruals: formattedAccruals,
    summary,
    isLoading,
  };
}
