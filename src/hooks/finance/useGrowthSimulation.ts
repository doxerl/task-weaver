import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  ProjectionItem, 
  InvestmentItem, 
  SimulationScenario, 
  SimulationSummary,
} from '@/types/simulation';
import { useFinancialDataHub } from './useFinancialDataHub';
import { useCurrency } from '@/contexts/CurrencyContext';

const generateId = () => Math.random().toString(36).substr(2, 9);

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

const currentYear = new Date().getFullYear();

export function useGrowthSimulation(initialBaseYear?: number, initialTargetYear?: number) {
  const [baseYear, setBaseYear] = useState(initialBaseYear || currentYear - 1);
  const [targetYear, setTargetYear] = useState(initialTargetYear || currentYear);
  
  const hub = useFinancialDataHub(baseYear);
  const { yearlyAverageRate } = useCurrency();
  
  const [scenarioName, setScenarioName] = useState('Varsayılan Senaryo');
  const [revenues, setRevenues] = useState<ProjectionItem[]>([]);
  const [expenses, setExpenses] = useState<ProjectionItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [assumedExchangeRate, setAssumedExchangeRate] = useState(45);
  const [notes, setNotes] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

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

    // Group expenses by category
    const expenseGroups: Record<string, number> = {};
    hub.expense.forEach(tx => {
      const category = mapCategoryCode(tx.categoryCode, EXPENSE_CATEGORY_MAP, 'Diğer');
      expenseGroups[category] = (expenseGroups[category] || 0) + Math.abs(tx.net);
    });

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
    const expensesUsd = filterAndAggregate(expensesUsdRaw, EXPENSE_MIN_THRESHOLD, 'Diğer');

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
    sortWithOtherLast(expensesUsd, 'Diğer');

    return {
      revenues: revenuesUsd,
      expenses: expensesUsd,
      totalRevenue: revenuesUsdRaw.reduce((sum, r) => sum + r.baseAmount, 0),
      totalExpense: expensesUsdRaw.reduce((sum, e) => sum + e.baseAmount, 0),
    };
  }, [hub.isLoading, hub.income, hub.expense, yearlyAverageRate]);

  // Initialize revenues and expenses when base data is available
  useEffect(() => {
    if (baseData && !isInitialized) {
      const initialRevenues: ProjectionItem[] = baseData.revenues.map(r => ({
        id: generateId(),
        category: r.category,
        baseAmount: r.baseAmount,
        projectedAmount: r.baseAmount,
        description: '',
        isNew: false,
      }));

      const initialExpenses: ProjectionItem[] = baseData.expenses.map(e => ({
        id: generateId(),
        category: e.category,
        baseAmount: e.baseAmount,
        projectedAmount: e.baseAmount,
        description: '',
        isNew: false,
      }));

      setRevenues(initialRevenues);
      setExpenses(initialExpenses);
      setIsInitialized(true);
    }
  }, [baseData, isInitialized]);

  // Calculate summary
  const summary: SimulationSummary = useMemo(() => {
    const baseRevenue = baseData?.totalRevenue || 0;
    const baseExpense = baseData?.totalExpense || 0;
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
  }, [baseData, revenues, expenses, investments]);

  // Revenue operations
  const updateRevenue = useCallback((id: string, updates: Partial<ProjectionItem>) => {
    setRevenues(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const addRevenue = useCallback((item: Omit<ProjectionItem, 'id'>) => {
    setRevenues(prev => [...prev, { ...item, id: generateId() }]);
  }, []);

  const removeRevenue = useCallback((id: string) => {
    setRevenues(prev => prev.filter(r => r.id !== id));
  }, []);

  // Expense operations
  const updateExpense = useCallback((id: string, updates: Partial<ProjectionItem>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const addExpense = useCallback((item: Omit<ProjectionItem, 'id'>) => {
    setExpenses(prev => [...prev, { ...item, id: generateId() }]);
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
    setScenarioName(scenario.name);
    setBaseYear(scenario.baseYear || currentYear - 1);
    setTargetYear(scenario.targetYear || currentYear);
    setRevenues(scenario.revenues);
    setExpenses(scenario.expenses);
    setInvestments(scenario.investments);
    setAssumedExchangeRate(scenario.assumedExchangeRate);
    setNotes(scenario.notes);
    setIsInitialized(true);
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
  };
}
