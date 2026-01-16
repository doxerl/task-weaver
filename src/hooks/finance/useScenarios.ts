import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  ProjectionItem, 
  InvestmentItem, 
  SimulationScenario,
  NextYearProjection
} from '@/types/simulation';

interface DatabaseScenario {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  base_year: number;
  target_year: number;
  assumed_exchange_rate: number;
  revenues: ProjectionItem[];
  expenses: ProjectionItem[];
  investments: InvestmentItem[];
  notes: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useScenarios() {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null);

  // Fetch all scenarios
  const fetchScenarios = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('simulation_scenarios')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const currentYear = new Date().getFullYear();
      const mapped: SimulationScenario[] = (data as unknown as DatabaseScenario[]).map(d => ({
        id: d.id,
        name: d.name,
        baseYear: d.base_year || currentYear - 1,
        targetYear: d.target_year || currentYear,
        revenues: d.revenues || [],
        expenses: d.expenses || [],
        investments: d.investments || [],
        assumedExchangeRate: d.assumed_exchange_rate,
        notes: d.notes || '',
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));

      setScenarios(mapped);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      toast.error('Senaryolar yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Save scenario
  const saveScenario = useCallback(async (scenario: Omit<SimulationScenario, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string | null): Promise<string | null> => {
    if (!user) {
      toast.error('Kaydetmek için giriş yapmalısınız');
      return null;
    }

    setIsSaving(true);
    try {
      const dbData = {
        user_id: user.id,
        name: scenario.name,
        base_year: scenario.baseYear,
        target_year: scenario.targetYear,
        assumed_exchange_rate: scenario.assumedExchangeRate,
        revenues: JSON.parse(JSON.stringify(scenario.revenues)),
        expenses: JSON.parse(JSON.stringify(scenario.expenses)),
        investments: JSON.parse(JSON.stringify(scenario.investments)),
        notes: scenario.notes,
      };

      if (existingId) {
        // Update existing
        const { error } = await supabase
          .from('simulation_scenarios')
          .update(dbData)
          .eq('id', existingId);

        if (error) throw error;
        
        toast.success('Senaryo güncellendi');
        await fetchScenarios();
        return existingId;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('simulation_scenarios')
          .insert(dbData)
          .select('id')
          .single();

        if (error) throw error;
        
        toast.success('Senaryo kaydedildi');
        await fetchScenarios();
        return data.id;
      }
    } catch (error) {
      console.error('Error saving scenario:', error);
      toast.error('Senaryo kaydedilirken hata oluştu');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, fetchScenarios]);

  // Delete scenario
  const deleteScenario = useCallback(async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('simulation_scenarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Senaryo silindi');
      await fetchScenarios();
      
      if (currentScenarioId === id) {
        setCurrentScenarioId(null);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast.error('Senaryo silinirken hata oluştu');
      return false;
    }
  }, [user, fetchScenarios, currentScenarioId]);

  // Duplicate scenario
  const duplicateScenario = useCallback(async (id: string): Promise<string | null> => {
    const scenario = scenarios.find(s => s.id === id);
    if (!scenario) return null;

    return saveScenario({
      name: `${scenario.name} (Kopya)`,
      baseYear: scenario.baseYear,
      targetYear: scenario.targetYear,
      revenues: scenario.revenues,
      expenses: scenario.expenses,
      investments: scenario.investments,
      assumedExchangeRate: scenario.assumedExchangeRate,
      notes: scenario.notes,
    });
  }, [scenarios, saveScenario]);

  // Create next year simulation from current scenario
  const createNextYearSimulation = useCallback(async (currentScenario: SimulationScenario): Promise<SimulationScenario | null> => {
    // Calculate growth rate from current scenario
    const baseRevenue = currentScenario.revenues.reduce((sum, r) => sum + r.baseAmount, 0);
    const projectedRevenue = currentScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const growthRate = baseRevenue > 0 ? (projectedRevenue - baseRevenue) / baseRevenue : 0.15;

    const generateId = () => Math.random().toString(36).substr(2, 9);
    const nextBaseYear = currentScenario.targetYear;
    const nextTargetYear = currentScenario.targetYear + 1;

    // Create new revenues: projected becomes base, apply linear growth
    const newRevenues = currentScenario.revenues.map(r => ({
      id: generateId(),
      category: r.category,
      baseAmount: r.projectedAmount,
      projectedAmount: Math.round(r.projectedAmount * (1 + growthRate)),
      description: r.description,
      isNew: false,
      startMonth: r.startMonth,
    }));

    // Create new expenses: projected becomes base, apply slower growth (70% of revenue growth)
    const expenseGrowthRate = growthRate * 0.7;
    const newExpenses = currentScenario.expenses.map(e => ({
      id: generateId(),
      category: e.category,
      baseAmount: e.projectedAmount,
      projectedAmount: Math.round(e.projectedAmount * (1 + expenseGrowthRate)),
      description: e.description,
      isNew: false,
      startMonth: e.startMonth,
    }));

    const newScenario: Omit<SimulationScenario, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `${nextTargetYear} Büyüme Planı`,
      baseYear: nextBaseYear,
      targetYear: nextTargetYear,
      revenues: newRevenues,
      expenses: newExpenses,
      investments: [], // Reset investments for new year
      assumedExchangeRate: currentScenario.assumedExchangeRate,
      notes: `${currentScenario.name} senaryosundan oluşturuldu. Lineer büyüme oranı: ${(growthRate * 100).toFixed(1)}%`,
    };

    const savedId = await saveScenario(newScenario);
    if (savedId) {
      return {
        ...newScenario,
        id: savedId,
      };
    }
    return null;
  }, [saveScenario]);

  // Create next year simulation from AI projection with globalization vision
  const createNextYearFromAI = useCallback(async (
    currentScenario: SimulationScenario,
    aiProjection: NextYearProjection
  ): Promise<SimulationScenario | null> => {
    const generateId = () => Math.random().toString(36).substr(2, 9);
    const nextBaseYear = currentScenario.targetYear;
    const nextTargetYear = currentScenario.targetYear + 1;

    // AI projeksiyonundan gelir ve gider dağılımı
    let totalAIRevenue = aiProjection.summary.total_revenue;
    let totalAIExpenses = aiProjection.summary.total_expenses;
    
    // Mevcut senaryodaki oranları kullanarak gelir ve giderleri dağıt
    const currentTotalRevenue = currentScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const currentTotalExpenses = currentScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);

    // FALLBACK: Eğer AI $0 döndürürse, globalleşme odaklı büyüme varsay
    if (totalAIRevenue <= 0) {
      console.warn('[createNextYearFromAI] AI revenue is $0, applying 60% global growth fallback');
      totalAIRevenue = Math.round(currentTotalRevenue * 1.6);
    }
    if (totalAIExpenses <= 0) {
      console.warn('[createNextYearFromAI] AI expenses is $0, applying 35% growth fallback (operating leverage)');
      totalAIExpenses = Math.round(currentTotalExpenses * 1.35);
    }

    const newRevenues = currentScenario.revenues.map(r => {
      const ratio = currentTotalRevenue > 0 ? r.projectedAmount / currentTotalRevenue : 1 / currentScenario.revenues.length;
      return {
        id: generateId(),
        category: r.category,
        baseAmount: r.projectedAmount,
        projectedAmount: Math.round(totalAIRevenue * ratio),
        description: r.description,
        isNew: false,
        startMonth: r.startMonth,
      };
    });

    const newExpenses = currentScenario.expenses.map(e => {
      const ratio = currentTotalExpenses > 0 ? e.projectedAmount / currentTotalExpenses : 1 / currentScenario.expenses.length;
      return {
        id: generateId(),
        category: e.category,
        baseAmount: e.projectedAmount,
        projectedAmount: Math.round(totalAIExpenses * ratio),
        description: e.description,
        isNew: false,
        startMonth: e.startMonth,
      };
    });

    // Build enhanced notes with investor hook data
    const investorHookNote = aiProjection.investor_hook 
      ? `\n\n🚀 Yatırımcı Vizyonu:\n• Büyüme: ${aiProjection.investor_hook.revenue_growth_yoy}\n• Marj İyileşmesi: ${aiProjection.investor_hook.margin_improvement}\n• Değerleme Hedefi: ${aiProjection.investor_hook.valuation_multiple_target}\n• Rekabet Avantajı: ${aiProjection.investor_hook.competitive_moat}`
      : '';
    
    const virtualBalanceNote = aiProjection.virtual_opening_balance
      ? `\n\n💼 Sanal Bilanço Açılışı:\n• Açılış Nakiti: $${aiProjection.virtual_opening_balance.opening_cash.toLocaleString()}\n• Savaş Fonu Durumu: ${aiProjection.virtual_opening_balance.war_chest_status}\n• Gayrimaddi Büyüme: ${aiProjection.virtual_opening_balance.intangible_growth}`
      : '';

    const newScenario: Omit<SimulationScenario, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `${nextTargetYear} Global Vizyon`,
      baseYear: nextBaseYear,
      targetYear: nextTargetYear,
      revenues: newRevenues,
      expenses: newExpenses,
      investments: [],
      assumedExchangeRate: currentScenario.assumedExchangeRate,
      notes: `🤖 AI tarafından oluşturuldu (Gemini Pro 3) - Globalleşme Odaklı\n\n📊 Strateji: ${aiProjection.strategy_note}\n\n💰 Toplam Gelir: $${totalAIRevenue.toLocaleString()}\n💸 Toplam Gider: $${totalAIExpenses.toLocaleString()}\n📈 Net Kâr: $${aiProjection.summary.net_profit.toLocaleString()}${investorHookNote}${virtualBalanceNote}`,
    };

    const savedId = await saveScenario(newScenario);
    if (savedId) {
      return {
        ...newScenario,
        id: savedId,
      };
    }
    return null;
  }, [saveScenario]);

  // Load scenarios on mount
  useEffect(() => {
    if (user) {
      fetchScenarios();
    }
  }, [user, fetchScenarios]);

  return {
    scenarios,
    isLoading,
    isSaving,
    currentScenarioId,
    setCurrentScenarioId,
    fetchScenarios,
    saveScenario,
    deleteScenario,
    duplicateScenario,
    createNextYearSimulation,
    createNextYearFromAI,
  };
}
