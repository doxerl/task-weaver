import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  ProjectionItem, 
  InvestmentItem, 
  SimulationScenario, 
  SimulationSummary,
  QuarterlyAmounts,
} from '@/types/simulation';
import { useFinancialDataHub } from './useFinancialDataHub';
import { useCurrency } from '@/contexts/CurrencyContext';
import { usePayrollAccruals } from './usePayrollAccruals';
import { useIncomeStatement } from './useIncomeStatement';
import { useExchangeRates } from './useExchangeRates';
import { getCompletedYear, getScenarioYear } from '@/utils/yearCalculations';
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to create default quarterly distribution
const createDefaultQuarterly = (amount: number): QuarterlyAmounts => {
  const perQuarter = Math.round(amount / 4);
  return {
    q1: perQuarter,
    q2: perQuarter,
    q3: perQuarter,
    q4: amount - (perQuarter * 3),
  };
};

// Category mapping from database codes to simulation categories
const REVENUE_CATEGORY_MAP: Record<string, string> = {
  'SBT': 'SBT Tracker',
  'L&S': 'Leadership Denetim',
  'DANIS': 'Danışmanlık',
  'ZDHC': 'ZDHC InCheck',
  'FAIZ_IN': 'Faiz Geliri',
  'LISANS': 'Lisans/Telif',
};

const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  // Personel kategorileri
  'PERSONEL': 'Personel (Brüt+SGK)',
  'PERSONEL_UCRET': 'Personel (Brüt+SGK)',
  'PERSONEL_SGK': 'Personel (Brüt+SGK)',
  'PERSONEL_ISVEREN': 'Personel (Brüt+SGK)',
  'PERSONEL_PRIM': 'Personel (Brüt+SGK)',
  'PERSONEL_YEMEK': 'Personel (Brüt+SGK)',
  
  // Ana kategoriler
  'YAZILIM': 'Yazılım/Abonelik',
  'KIRA_OUT': 'Kira',
  'SEYAHAT': 'Seyahat',
  'FUAR': 'Pazarlama/Fuar',
  'TELEKOM': 'Telekomünikasyon',
  'MUHASEBE': 'Muhasebe',
  'DANIS_OUT': 'Danışmanlık Gideri',
  
  // Ek kategoriler
  'SUBCONTRACTOR': 'Taşeron/Eğitmen',
  'OFIS': 'Ofis/Kırtasiye',
  'KARGO': 'Kargo/Nakliye',
  'SIGORTA': 'Sigorta',
  'VERGI': 'Vergi',
  'DIGER_OUT': 'Diğer',
};

// Simülasyonda UI'dan gizlenecek gider kategorileri (toplama dahil kalır)
const HIDDEN_EXPENSE_CATEGORIES = ['Muhasebe', 'Sigorta', 'Diğer'];

function mapCategoryCode(code: string | null, mapping: Record<string, string>, defaultCategory: string): string {
  if (!code) return defaultCategory;
  const upperCode = code.toUpperCase();
  
  for (const [key, value] of Object.entries(mapping)) {
    if (upperCode.includes(key)) {
      return value;
    }
  }
  
  return defaultCategory;
}

// Use centralized year calculations for consistency
// Internet time: Jan 2026 → Completed Year = 2025, Scenario Year = 2026

export function useGrowthSimulation(initialBaseYear?: number, initialTargetYear?: number) {
  // Calculate years based on internet time
  const completedYear = getCompletedYear();   // 2025
  const scenarioYear = getScenarioYear();     // 2026
  
  const [baseYear, setBaseYear] = useState(initialBaseYear || completedYear);
  const [targetYear, setTargetYear] = useState(initialTargetYear || scenarioYear);
  
  const hub = useFinancialDataHub(baseYear);
  const { yearlyAverageRate } = useCurrency();
  const { summary: payrollSummary } = usePayrollAccruals(baseYear);
  
  // Gerçek baz yıl verilerini veritabanından çek (targetYear - 1)
  const actualBaseYear = targetYear - 1;
  const baseYearStatement = useIncomeStatement(actualBaseYear);
  const baseYearExchangeRates = useExchangeRates(actualBaseYear);
  
  const [scenarioName, setScenarioName] = useState('Varsayılan Senaryo');
  const [revenues, setRevenues] = useState<ProjectionItem[]>([]);
  const [expenses, setExpenses] = useState<ProjectionItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [assumedExchangeRate, setAssumedExchangeRate] = useState(45);
  const [notes, setNotes] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Baz yıl senaryosundan gelen değerler (önceki yılın pozitif senaryosu)
  const [baseScenarioRevenues, setBaseScenarioRevenues] = useState<ProjectionItem[]>([]);
  const [baseScenarioExpenses, setBaseScenarioExpenses] = useState<ProjectionItem[]>([]);
  const [hasBaseScenario, setHasBaseScenario] = useState(false);
  
  // Veritabanından gerçek baz yıl toplamları (TRY)
  const realBaseData = useMemo(() => {
    if (baseYearStatement.isLoading || !baseYearStatement.statement) {
      return null;
    }
    
    const stmt = baseYearStatement.statement;
    const totalExpenseTRY = (stmt.costOfSales || 0) + (stmt.operatingExpenses?.total || 0);
    const totalRevenueTRY = stmt.netSales || 0;
    
    // Baz yılın ortalama kurunu al
    const baseYearRate = baseYearExchangeRates.yearlyAverageRate;
    
    if (!baseYearRate || baseYearRate <= 0) {
      return null;
    }
    
    return {
      totalExpenseUSD: Math.round(totalExpenseTRY / baseYearRate),
      totalRevenueUSD: Math.round(totalRevenueTRY / baseYearRate),
      exchangeRate: baseYearRate,
    };
  }, [baseYearStatement.isLoading, baseYearStatement.statement, baseYearExchangeRates.yearlyAverageRate]);

  // Calculate base data from hub when available
  const baseData = useMemo(() => {
    if (hub.isLoading || !yearlyAverageRate) {
      return null;
    }

    const rate = yearlyAverageRate;

    // Group income by category
    const revenueGroups: Record<string, number> = {};
    hub.income.forEach(tx => {
      const category = mapCategoryCode(tx.categoryCode, REVENUE_CATEGORY_MAP, 'Diğer Gelir');
      revenueGroups[category] = (revenueGroups[category] || 0) + Math.abs(tx.net);
    });

    // Group expenses by category (excluding payroll-related categories to avoid double counting)
    const expenseGroups: Record<string, number> = {};
    const payrollCategoryCodes = ['PERSONEL', 'PERSONEL_UCRET', 'PERSONEL_SGK', 'PERSONEL_ISVEREN', 'PERSONEL_PRIM'];
    
    hub.expense.forEach(tx => {
      // Skip payroll categories since we'll add from payroll_accruals
      const upperCode = (tx.categoryCode || '').toUpperCase();
      if (payrollCategoryCodes.some(code => upperCode.includes(code))) {
        return;
      }
      const category = mapCategoryCode(tx.categoryCode, EXPENSE_CATEGORY_MAP, 'Diğer');
      expenseGroups[category] = (expenseGroups[category] || 0) + Math.abs(tx.net);
    });
    
    // Add personnel expense from payroll accruals (Brüt + İşveren SGK + İşsizlik)
    if (payrollSummary.totalPersonnelExpense > 0) {
      expenseGroups['Personel Giderleri'] = payrollSummary.totalPersonnelExpense;
    }

    // Minimum thresholds for display (USD)
    const REVENUE_MIN_THRESHOLD = 500;
    const EXPENSE_MIN_THRESHOLD = 300;

    // Convert to USD
    const revenuesUsdRaw = Object.entries(revenueGroups).map(([category, amount]) => ({
      category,
      baseAmount: Math.round(amount / rate),
    }));

    const expensesUsdRaw = Object.entries(expenseGroups).map(([category, amount]) => ({
      category,
      baseAmount: Math.round(amount / rate),
    }));

    // Filter low-value items and aggregate into "Diğer"
    const filterAndAggregate = (
      items: { category: string; baseAmount: number }[],
      threshold: number,
      otherLabel: string
    ) => {
      const significantItems = items.filter(
        item => item.baseAmount >= threshold || item.category === otherLabel
      );
      const belowThresholdTotal = items
        .filter(item => item.baseAmount < threshold && item.category !== otherLabel)
        .reduce((sum, item) => sum + item.baseAmount, 0);

      // Find or create "Diğer" category
      const otherIndex = significantItems.findIndex(item => item.category === otherLabel);
      if (otherIndex >= 0) {
        significantItems[otherIndex].baseAmount += belowThresholdTotal;
      } else if (belowThresholdTotal > 0) {
        significantItems.push({ category: otherLabel, baseAmount: belowThresholdTotal });
      }

      return significantItems;
    };

    const revenuesUsd = filterAndAggregate(revenuesUsdRaw, REVENUE_MIN_THRESHOLD, 'Diğer Gelir');
    const expensesUsdAll = filterAndAggregate(expensesUsdRaw, EXPENSE_MIN_THRESHOLD, 'Diğer');

    // Gizli kategorileri ayır (UI'da gösterilmeyecek ama toplama dahil)
    const visibleExpenses = expensesUsdAll.filter(
      item => !HIDDEN_EXPENSE_CATEGORIES.includes(item.category)
    );
    const hiddenExpensesTotal = expensesUsdAll
      .filter(item => HIDDEN_EXPENSE_CATEGORIES.includes(item.category))
      .reduce((sum, item) => sum + item.baseAmount, 0);

    // Sort with "Diğer" always at the bottom
    const sortWithOtherLast = (
      items: { category: string; baseAmount: number }[],
      otherLabel: string
    ) => {
      items.sort((a, b) => {
        if (a.category === otherLabel && b.category !== otherLabel) return 1;
        if (b.category === otherLabel && a.category !== otherLabel) return -1;
        return b.baseAmount - a.baseAmount;
      });
    };

    sortWithOtherLast(revenuesUsd, 'Diğer Gelir');
    sortWithOtherLast(visibleExpenses, 'Diğer');

    return {
      revenues: revenuesUsd,
      expenses: visibleExpenses,  // Sadece görünür kategoriler
      hiddenExpensesTotal,        // Gizli kategorilerin toplamı
      totalRevenue: revenuesUsdRaw.reduce((sum, r) => sum + r.baseAmount, 0),
      totalExpense: expensesUsdRaw.reduce((sum, e) => sum + e.baseAmount, 0), // Tüm giderler dahil
    };
  }, [hub.isLoading, hub.income, hub.expense, yearlyAverageRate, payrollSummary]);

  // Initialize revenues and expenses when base data is available
  useEffect(() => {
    if (baseData && !isInitialized) {
      const initialRevenues: ProjectionItem[] = baseData.revenues.map(r => {
        const quarterly = createDefaultQuarterly(r.baseAmount);
        return {
          id: generateId(),
          category: r.category,
          baseAmount: r.baseAmount,
          projectedAmount: r.baseAmount,
          baseQuarterly: quarterly,
          projectedQuarterly: { ...quarterly },
          description: '',
          isNew: false,
        };
      });

      const initialExpenses: ProjectionItem[] = baseData.expenses.map(e => {
        const quarterly = createDefaultQuarterly(e.baseAmount);
        return {
          id: generateId(),
          category: e.category,
          baseAmount: e.baseAmount,
          projectedAmount: e.baseAmount,
          baseQuarterly: quarterly,
          projectedQuarterly: { ...quarterly },
          description: '',
          isNew: false,
        };
      });

      setRevenues(initialRevenues);
      setExpenses(initialExpenses);
      setIsInitialized(true);
    }
  }, [baseData, isInitialized]);

  // Calculate summary
  const summary: SimulationSummary = useMemo(() => {
    // Baz yıl değerleri - öncelik sırası:
    // 1. Gerçek veritabanı verileri (realBaseData) - Reports sayfasıyla tutarlı
    // 2. Yüklenen baz senaryo (baseScenario) - 2027+ senaryolar için
    // 3. Mevcut senaryo baseAmount'ları (fallback)
    
    let baseRevenue: number;
    let baseExpense: number;
    
    if (realBaseData) {
      // Gerçek veritabanı verileri - Reports sayfasıyla tutarlı!
      baseRevenue = realBaseData.totalRevenueUSD;
      baseExpense = realBaseData.totalExpenseUSD;
      console.log(`[useGrowthSimulation] Baz yıl ${actualBaseYear} gerçek veriler: Gelir=$${baseRevenue.toLocaleString()}, Gider=$${baseExpense.toLocaleString()} (Kur: ${realBaseData.exchangeRate})`);
    } else if (hasBaseScenario && baseScenarioRevenues.length > 0) {
      // Yüklenen baz senaryo (önceki yılın pozitif senaryosu)
      baseRevenue = baseScenarioRevenues.reduce((sum, r) => sum + r.projectedAmount, 0);
      baseExpense = baseScenarioExpenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    } else {
      // Fallback: mevcut senaryo baseAmount'ları
      baseRevenue = revenues.reduce((sum, r) => sum + r.baseAmount, 0);
      baseExpense = expenses.reduce((sum, e) => sum + e.baseAmount, 0);
    }
    
    const baseProfit = baseRevenue - baseExpense;

    const totalProjectedRevenue = revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const totalProjectedExpense = expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);
    const projectedProfit = totalProjectedRevenue - totalProjectedExpense;

    return {
      base: {
        totalRevenue: baseRevenue,
        totalExpense: baseExpense,
        netProfit: baseProfit,
        profitMargin: baseRevenue > 0 ? (baseProfit / baseRevenue) * 100 : 0,
      },
      projected: {
        totalRevenue: totalProjectedRevenue,
        totalExpense: totalProjectedExpense,
        netProfit: projectedProfit,
        profitMargin: totalProjectedRevenue > 0 ? (projectedProfit / totalProjectedRevenue) * 100 : 0,
      },
      growth: {
        revenueGrowth: baseRevenue > 0 
          ? ((totalProjectedRevenue - baseRevenue) / baseRevenue) * 100 
          : 0,
        expenseGrowth: baseExpense > 0 
          ? ((totalProjectedExpense - baseExpense) / baseExpense) * 100 
          : 0,
        profitGrowth: baseProfit > 0 
          ? ((projectedProfit - baseProfit) / baseProfit) * 100 
          : 0,
      },
      capitalNeeds: {
        totalInvestment,
        projectedProfit,
        netCapitalNeed: Math.max(0, totalInvestment - projectedProfit),
      },
    };
  }, [realBaseData, actualBaseYear, revenues, expenses, investments, hasBaseScenario, baseScenarioRevenues, baseScenarioExpenses]);

  // Revenue operations
  const updateRevenue = useCallback((id: string, updates: Partial<ProjectionItem>) => {
    setRevenues(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      
      // If projectedAmount changed and no quarterly specified, recalculate quarterly
      if (updates.projectedAmount !== undefined && !updates.projectedQuarterly) {
        updated.projectedQuarterly = createDefaultQuarterly(updates.projectedAmount);
      }
      
      // If quarterly changed, recalculate total
      if (updates.projectedQuarterly) {
        const q = updates.projectedQuarterly;
        updated.projectedAmount = q.q1 + q.q2 + q.q3 + q.q4;
      }
      
      return updated;
    }));
  }, []);

  const addRevenue = useCallback((item: Omit<ProjectionItem, 'id'>) => {
    const quarterly = item.projectedQuarterly || createDefaultQuarterly(item.projectedAmount);
    setRevenues(prev => [...prev, { 
      ...item, 
      id: generateId(),
      projectedQuarterly: quarterly,
      baseQuarterly: quarterly,
    }]);
  }, []);

  const removeRevenue = useCallback((id: string) => {
    setRevenues(prev => prev.filter(r => r.id !== id));
  }, []);

  // Expense operations
  const updateExpense = useCallback((id: string, updates: Partial<ProjectionItem>) => {
    setExpenses(prev => prev.map(e => {
      if (e.id !== id) return e;
      const updated = { ...e, ...updates };
      
      // If projectedAmount changed and no quarterly specified, recalculate quarterly
      if (updates.projectedAmount !== undefined && !updates.projectedQuarterly) {
        updated.projectedQuarterly = createDefaultQuarterly(updates.projectedAmount);
      }
      
      // If quarterly changed, recalculate total
      if (updates.projectedQuarterly) {
        const q = updates.projectedQuarterly;
        updated.projectedAmount = q.q1 + q.q2 + q.q3 + q.q4;
      }
      
      return updated;
    }));
  }, []);

  const addExpense = useCallback((item: Omit<ProjectionItem, 'id'>) => {
    const quarterly = item.projectedQuarterly || createDefaultQuarterly(item.projectedAmount);
    setExpenses(prev => [...prev, { 
      ...item, 
      id: generateId(),
      projectedQuarterly: quarterly,
      baseQuarterly: quarterly,
    }]);
  }, []);

  const removeExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  // Investment operations
  const addInvestment = useCallback((item: Omit<InvestmentItem, 'id'>) => {
    setInvestments(prev => [...prev, { ...item, id: generateId() }]);
  }, []);

  const updateInvestment = useCallback((id: string, updates: Partial<InvestmentItem>) => {
    setInvestments(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const removeInvestment = useCallback((id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback((newBaseYear?: number, newTargetYear?: number) => {
    if (newBaseYear) setBaseYear(newBaseYear);
    if (newTargetYear) setTargetYear(newTargetYear);
    setIsInitialized(false);
    setInvestments([]);
    setAssumedExchangeRate(45);
    setNotes('');
    setScenarioName('Varsayılan Senaryo');
  }, []);

  // Get current scenario
  const getCurrentScenario = useCallback((): SimulationScenario => ({
    id: generateId(),
    name: scenarioName,
    baseYear,
    targetYear,
    revenues,
    expenses,
    investments,
    assumedExchangeRate,
    notes,
  }), [scenarioName, baseYear, targetYear, revenues, expenses, investments, assumedExchangeRate, notes]);

  // Load scenario
  const loadScenario = useCallback((scenario: SimulationScenario) => {
    const completed = getCompletedYear();
    const target = getScenarioYear();
    
    setScenarioName(scenario.name);
    setBaseYear(scenario.baseYear || completed);
    setTargetYear(scenario.targetYear || target);
    setRevenues(scenario.revenues);
    setExpenses(scenario.expenses);
    setInvestments(scenario.investments);
    setAssumedExchangeRate(scenario.assumedExchangeRate);
    setNotes(scenario.notes);
    setIsInitialized(true);
  }, []);
  
  // Baz yıl senaryosunu yükle (önceki yılın pozitif senaryosu)
  const loadBaseScenario = useCallback((scenario: SimulationScenario) => {
    setBaseScenarioRevenues(scenario.revenues);
    setBaseScenarioExpenses(scenario.expenses);
    setHasBaseScenario(true);
  }, []);
  
  // Baz yıl senaryosunu temizle
  const clearBaseScenario = useCallback(() => {
    setBaseScenarioRevenues([]);
    setBaseScenarioExpenses([]);
    setHasBaseScenario(false);
  }, []);

  return {
    // State
    scenarioName,
    setScenarioName,
    baseYear,
    setBaseYear,
    targetYear,
    setTargetYear,
    revenues,
    expenses,
    investments,
    assumedExchangeRate,
    setAssumedExchangeRate,
    notes,
    setNotes,
    summary,
    isLoading: hub.isLoading || !isInitialized,

    // Revenue operations
    updateRevenue,
    addRevenue,
    removeRevenue,

    // Expense operations
    updateExpense,
    addExpense,
    removeExpense,

    // Investment operations
    addInvestment,
    updateInvestment,
    removeInvestment,

    // Scenario operations
    resetToDefaults,
    getCurrentScenario,
    loadScenario,
    
    // Base scenario operations
    loadBaseScenario,
    clearBaseScenario,
    hasBaseScenario,
  };
}
