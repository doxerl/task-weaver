import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
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
  scenario_type: 'positive' | 'negative' | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export function useScenarios() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null; // ✅ Stabilize userId
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(null);

  // Fetch all scenarios
  const fetchScenarios = useCallback(async () => {
    if (!userId) return;

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
        scenarioType: d.scenario_type || 'positive',
        version: d.version || 1,
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
  }, [userId]);

  // Save scenario
  const saveScenario = useCallback(async (scenario: Omit<SimulationScenario, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string | null): Promise<string | null> => {
    if (!userId) {
      toast.error('Kaydetmek için giriş yapmalısınız');
      return null;
    }

    setIsSaving(true);
    try {
      if (existingId) {
        // Get current version and increment
        const existingScenario = scenarios.find(s => s.id === existingId);
        const currentVersion = existingScenario?.version || 1;
        const newVersion = currentVersion + 1;

        // Update existing
        const { error } = await supabase
          .from('simulation_scenarios')
          .update({
            user_id: userId,
            name: scenario.name,
            base_year: scenario.baseYear,
            target_year: scenario.targetYear,
            assumed_exchange_rate: scenario.assumedExchangeRate,
            revenues: JSON.parse(JSON.stringify(scenario.revenues)),
            expenses: JSON.parse(JSON.stringify(scenario.expenses)),
            investments: JSON.parse(JSON.stringify(scenario.investments)),
            notes: scenario.notes,
            scenario_type: scenario.scenarioType || 'positive',
            version: newVersion,
          })
          .eq('id', existingId);

        if (error) throw error;
        
        toast.success(`Senaryo güncellendi (v${newVersion})`);
        await fetchScenarios();
        return existingId;
      } else {
        // Insert new with version 1
        const { data, error } = await supabase
          .from('simulation_scenarios')
          .insert({
            user_id: userId,
            name: scenario.name,
            base_year: scenario.baseYear,
            target_year: scenario.targetYear,
            assumed_exchange_rate: scenario.assumedExchangeRate,
            revenues: JSON.parse(JSON.stringify(scenario.revenues)),
            expenses: JSON.parse(JSON.stringify(scenario.expenses)),
            investments: JSON.parse(JSON.stringify(scenario.investments)),
            notes: scenario.notes,
            scenario_type: scenario.scenarioType || 'positive',
            version: 1,
          })
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
  }, [userId, fetchScenarios, scenarios]);

  // Delete scenario
  const deleteScenario = useCallback(async (id: string) => {
    if (!userId) return false;

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
  }, [userId, fetchScenarios, currentScenarioId]);

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
      scenarioType: scenario.scenarioType,
    });
  }, [scenarios, saveScenario]);

  // Create next year simulation from current scenario
  const createNextYearSimulation = useCallback(async (currentScenario: SimulationScenario): Promise<SimulationScenario | null> => {
    const generateId = () => Math.random().toString(36).substr(2, 9);
    const nextBaseYear = currentScenario.targetYear;
    const nextTargetYear = currentScenario.targetYear + 1;

    // Önceki yılın pozitif senaryosunu bul (tüm kalemleri miras almak için)
    const previousYearPositive = scenarios.find(
      s => s.targetYear === currentScenario.targetYear && s.scenarioType === 'positive'
    );
    
    // Referans senaryo: Pozitif varsa onu, yoksa mevcut senaryoyu kullan
    const referenceScenario = previousYearPositive || currentScenario;
    
    console.log('[createNextYearSimulation] Reference scenario:', referenceScenario.name, 
      'with', referenceScenario.revenues.length, 'revenue items');

    // Büyüme oranını referans senaryodan hesapla
    const baseRevenue = referenceScenario.revenues.reduce((sum, r) => sum + r.baseAmount, 0);
    const projectedRevenue = referenceScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const growthRate = baseRevenue > 0 ? (projectedRevenue - baseRevenue) / baseRevenue : 0.15;

    // Referans senaryonun TÜM kalemlerini miras al
    // projectedAmount → yeni baseAmount olarak kullan
    const newRevenues = referenceScenario.revenues.map(r => ({
      id: generateId(),
      category: r.category,
      baseAmount: r.projectedAmount, // Önceki yılın tahmini = yeni yılın bazı
      baseQuarterly: r.projectedQuarterly || { q1: 0, q2: 0, q3: 0, q4: 0 },
      projectedAmount: Math.round(r.projectedAmount * (1 + growthRate)),
      description: r.description,
      isNew: false,
      startMonth: r.startMonth,
    }));

    // Giderler için aynı mantık (daha yavaş büyüme: gelir büyümesinin %70'i)
    const expenseGrowthRate = growthRate * 0.7;
    const newExpenses = referenceScenario.expenses.map(e => ({
      id: generateId(),
      category: e.category,
      baseAmount: e.projectedAmount, // Önceki yılın tahmini = yeni yılın bazı
      baseQuarterly: e.projectedQuarterly || { q1: 0, q2: 0, q3: 0, q4: 0 },
      projectedAmount: Math.round(e.projectedAmount * (1 + expenseGrowthRate)),
      description: e.description,
      isNew: false,
      startMonth: e.startMonth,
    }));

    const inheritedItemsNote = previousYearPositive 
      ? `${previousYearPositive.name} senaryosundan ${newRevenues.length} gelir ve ${newExpenses.length} gider kalemi miras alındı.`
      : '';

    const newScenario: Omit<SimulationScenario, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `${nextTargetYear} Büyüme Planı`,
      baseYear: nextBaseYear,
      targetYear: nextTargetYear,
      revenues: newRevenues,
      expenses: newExpenses,
      investments: [], // Reset investments for new year
      assumedExchangeRate: referenceScenario.assumedExchangeRate,
      notes: `${inheritedItemsNote}\nLineer büyüme oranı: ${(growthRate * 100).toFixed(1)}%`,
    };

    const savedId = await saveScenario(newScenario);
    if (savedId) {
      toast.success(`${newRevenues.length} gelir ve ${newExpenses.length} gider kalemi miras alındı`);
      return {
        ...newScenario,
        id: savedId,
      };
    }
    return null;
  }, [saveScenario, scenarios]);

  // Create next year simulation from AI projection with globalization vision
  // Accepts both scenarios to correctly calculate max(A.targetYear, B.targetYear) + 1
  // focusProjects: Sadece bu projelere büyüme çarpanı uygulanır, diğerleri sabit kalır
  const createNextYearFromAI = useCallback(async (
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario,
    aiProjection: NextYearProjection,
    focusProjects: string[] = []  // YENİ: Seçici büyüme için odak projeler
  ): Promise<SimulationScenario | null> => {
    const generateId = () => Math.random().toString(36).substr(2, 9);
    
    // CORRECT CALCULATION: max(A.targetYear, B.targetYear) + 1
    // Priority: AI projection_year > calculated max + 1
    const nextTargetYear = aiProjection.projection_year || 
      Math.max(scenarioA.targetYear, scenarioB.targetYear) + 1;
    const nextBaseYear = nextTargetYear - 1;
    
    console.log('[createNextYearFromAI] Calculating next year:', {
      scenarioAYear: scenarioA.targetYear,
      scenarioBYear: scenarioB.targetYear,
      aiProjectionYear: aiProjection.projection_year,
      calculatedNextYear: nextTargetYear
    });

    // Referans senaryo: En yüksek yıla sahip pozitif senaryo tercih edilir
    // Eğer aynı yılda ise pozitif olanı seç
    const referenceScenario = scenarioA.targetYear >= scenarioB.targetYear 
      ? scenarioA 
      : scenarioB;
    
    console.log('[createNextYearFromAI] Reference scenario:', referenceScenario.name, 
      'with', referenceScenario.revenues.length, 'revenue items,',
      referenceScenario.expenses.length, 'expense items');

    // AI projeksiyonundan gelir ve gider dağılımı
    let totalAIRevenue = aiProjection.summary.total_revenue;
    let totalAIExpenses = aiProjection.summary.total_expenses;
    
    // Referans senaryodaki toplamları kullan
    const currentTotalRevenue = referenceScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const currentTotalExpenses = referenceScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);

    // ========================================================
    // KRİTİK: DÜŞÜK/SIFIR BÜYÜME KONTROLÜ VE FALLBACK
    // ========================================================
    // AI bazen yanlış yıl için projeksiyon döndürür (örn: 2028 değerleri 2029 için)
    // Bu durumda büyüme oranı %0 veya çok düşük olur
    const revenueGrowth = currentTotalRevenue > 0 
      ? (totalAIRevenue - currentTotalRevenue) / currentTotalRevenue 
      : 0;

    if (revenueGrowth <= 0.05) { // %5'ten az büyüme = muhtemelen yanlış yıl için projeksiyon
      console.warn(`[createNextYearFromAI] Low/no growth detected (${(revenueGrowth * 100).toFixed(1)}%). AI may have projected for wrong year.`);
      console.warn(`[createNextYearFromAI] Current: $${currentTotalRevenue.toLocaleString()}, AI: $${totalAIRevenue.toLocaleString()}`);
      
      // Minimum %20 büyüme fallback uygula (bilimsel model)
      const minGrowthRate = 0.20;
      totalAIRevenue = Math.round(currentTotalRevenue * (1 + minGrowthRate));
      
      // Operating leverage: giderler daha yavaş büyür (%12 = %20 × 0.6)
      const expenseGrowthRate = minGrowthRate * 0.6;
      totalAIExpenses = Math.round(currentTotalExpenses * (1 + expenseGrowthRate));
      
      console.log(`[createNextYearFromAI] Fallback applied: Revenue $${currentTotalRevenue.toLocaleString()} → $${totalAIRevenue.toLocaleString()} (+20%)`);
      console.log(`[createNextYearFromAI] Fallback applied: Expenses $${currentTotalExpenses.toLocaleString()} → $${totalAIExpenses.toLocaleString()} (+12%)`);
    }

    // AI quarterly verisinden çeyreklik oranları hesapla
    const aiQuarterly = aiProjection.quarterly;
    const aiQuarterlyRevenueTotal = aiQuarterly.q1.revenue + aiQuarterly.q2.revenue + aiQuarterly.q3.revenue + aiQuarterly.q4.revenue;
    const aiQuarterlyExpenseTotal = aiQuarterly.q1.expenses + aiQuarterly.q2.expenses + aiQuarterly.q3.expenses + aiQuarterly.q4.expenses;

    // Gelir için çeyreklik oranlar
    const revenueQuarterlyRatios = aiQuarterlyRevenueTotal > 0 ? {
      q1: aiQuarterly.q1.revenue / aiQuarterlyRevenueTotal,
      q2: aiQuarterly.q2.revenue / aiQuarterlyRevenueTotal,
      q3: aiQuarterly.q3.revenue / aiQuarterlyRevenueTotal,
      q4: aiQuarterly.q4.revenue / aiQuarterlyRevenueTotal,
    } : { q1: 0.25, q2: 0.25, q3: 0.25, q4: 0.25 };

    // Gider için çeyreklik oranlar
    const expenseQuarterlyRatios = aiQuarterlyExpenseTotal > 0 ? {
      q1: aiQuarterly.q1.expenses / aiQuarterlyExpenseTotal,
      q2: aiQuarterly.q2.expenses / aiQuarterlyExpenseTotal,
      q3: aiQuarterly.q3.expenses / aiQuarterlyExpenseTotal,
      q4: aiQuarterly.q4.expenses / aiQuarterlyExpenseTotal,
    } : { q1: 0.25, q2: 0.25, q3: 0.25, q4: 0.25 };

    // Odak proje hesaplamaları (focusProjects varsa)
    const hasFocusProjects = focusProjects.length > 0;
    
    // Odak olmayan projelerin toplam tutarı (sabit kalacaklar)
    const nonFocusTotal = hasFocusProjects
      ? referenceScenario.revenues
          .filter(rv => !focusProjects.includes(rv.category))
          .reduce((sum, rv) => sum + rv.projectedAmount, 0)
      : 0;
    
    // Odak projelerin mevcut toplam tutarı
    const focusProjectsCurrentTotal = hasFocusProjects
      ? referenceScenario.revenues
          .filter(rv => focusProjects.includes(rv.category))
          .reduce((sum, rv) => sum + rv.projectedAmount, 0)
      : 0;
    
    // Odak projelere düşen AI ciro hedefi
    const focusProjectsTargetTotal = hasFocusProjects
      ? Math.max(0, totalAIRevenue - nonFocusTotal)
      : 0;
    
    console.log('[createNextYearFromAI] Focus Projects Logic:', {
      focusProjects,
      hasFocusProjects,
      nonFocusTotal,
      focusProjectsCurrentTotal,
      focusProjectsTargetTotal,
      totalAIRevenue
    });

    // Referans senaryonun TÜM gelir kalemlerini miras al
    const newRevenues = referenceScenario.revenues.map(r => {
      const isFocusProject = focusProjects.includes(r.category);
      
      let itemProjectedAmount: number;
      let projectedQuarterly: { q1: number; q2: number; q3: number; q4: number };
      
      if (hasFocusProjects) {
        if (isFocusProject) {
          // ODAK PROJE: Toplam AI büyümesini odak projeler arasında paylaştır
          const focusRatio = focusProjectsCurrentTotal > 0 
            ? r.projectedAmount / focusProjectsCurrentTotal 
            : 1 / focusProjects.length;
          
          itemProjectedAmount = Math.round(focusProjectsTargetTotal * focusRatio);
          
          // Çeyreklik dağılım: AI oranlarını kullan
          projectedQuarterly = {
            q1: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q1),
            q2: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q2),
            q3: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q3),
            q4: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q4),
          };
          
          console.log(`[createNextYearFromAI] 🎯 Focus: ${r.category} → $${r.projectedAmount} → $${itemProjectedAmount} (ratio: ${(focusRatio * 100).toFixed(1)}%)`);
        } else {
          // DİĞER PROJE: Sabit kal (projectedAmount = baseAmount)
          itemProjectedAmount = r.projectedAmount;
          projectedQuarterly = r.projectedQuarterly || { q1: 0, q2: 0, q3: 0, q4: 0 };
          
          console.log(`[createNextYearFromAI] 📌 Static: ${r.category} → $${itemProjectedAmount} (unchanged)`);
        }
      } else {
        // focusProjects boş: Mevcut mantık - oransal dağılım
        const ratio = currentTotalRevenue > 0 ? r.projectedAmount / currentTotalRevenue : 1 / referenceScenario.revenues.length;
        itemProjectedAmount = Math.round(totalAIRevenue * ratio);
        
        // Çeyreklik dağılım: AI oranlarını kullan
        projectedQuarterly = {
          q1: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q1),
          q2: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q2),
          q3: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q3),
          q4: Math.round(itemProjectedAmount * revenueQuarterlyRatios.q4),
        };
      }
      
      // Yuvarlama farklarını Q4'e ekle
      const quarterlySum = projectedQuarterly.q1 + projectedQuarterly.q2 + projectedQuarterly.q3 + projectedQuarterly.q4;
      projectedQuarterly.q4 += itemProjectedAmount - quarterlySum;

      return {
        id: generateId(),
        category: r.category,
        // Önceki yılın projectedAmount değeri = yeni yılın baseAmount değeri
        baseAmount: r.projectedAmount,
        baseQuarterly: r.projectedQuarterly || { q1: 0, q2: 0, q3: 0, q4: 0 },
        projectedAmount: itemProjectedAmount,
        projectedQuarterly,
        description: r.description,
        isNew: false,
        startMonth: r.startMonth,
      };
    });

    // Referans senaryonun TÜM gider kalemlerini miras al
    const newExpenses = referenceScenario.expenses.map(e => {
      const ratio = currentTotalExpenses > 0 ? e.projectedAmount / currentTotalExpenses : 1 / referenceScenario.expenses.length;
      const itemProjectedAmount = Math.round(totalAIExpenses * ratio);
      
      // Çeyreklik dağılım: AI oranlarını kullan
      const projectedQuarterly = {
        q1: Math.round(itemProjectedAmount * expenseQuarterlyRatios.q1),
        q2: Math.round(itemProjectedAmount * expenseQuarterlyRatios.q2),
        q3: Math.round(itemProjectedAmount * expenseQuarterlyRatios.q3),
        q4: Math.round(itemProjectedAmount * expenseQuarterlyRatios.q4),
      };
      
      // Yuvarlama farklarını Q4'e ekle
      const quarterlySum = projectedQuarterly.q1 + projectedQuarterly.q2 + projectedQuarterly.q3 + projectedQuarterly.q4;
      projectedQuarterly.q4 += itemProjectedAmount - quarterlySum;

      return {
        id: generateId(),
        category: e.category,
        // Önceki yılın projectedAmount değeri = yeni yılın baseAmount değeri
        baseAmount: e.projectedAmount,
        baseQuarterly: e.projectedQuarterly || { q1: 0, q2: 0, q3: 0, q4: 0 },
        projectedAmount: itemProjectedAmount,
        projectedQuarterly,
        description: e.description,
        isNew: false,
        startMonth: e.startMonth,
      };
    });

    // Build enhanced notes with investor hook data
    const inheritedItemsNote = `📦 ${referenceScenario.name} senaryosundan ${newRevenues.length} gelir ve ${newExpenses.length} gider kalemi miras alındı.\n\n`;
    
    // Odak proje notu
    const focusProjectNote = focusProjects.length > 0
      ? `🎯 Odak Projeler: ${focusProjects.join(', ')}\n📌 Diğer projeler sabit tutuldu.\n\n`
      : '';

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
      assumedExchangeRate: referenceScenario.assumedExchangeRate,
      notes: `🤖 AI tarafından oluşturuldu (Gemini Pro 3) - Globalleşme Odaklı\n\n${focusProjectNote}${inheritedItemsNote}📊 Strateji: ${aiProjection.strategy_note}\n\n💰 Toplam Gelir: $${totalAIRevenue.toLocaleString()}\n💸 Toplam Gider: $${totalAIExpenses.toLocaleString()}\n📈 Net Kâr: $${aiProjection.summary.net_profit.toLocaleString()}${investorHookNote}${virtualBalanceNote}`,
    };

    const savedId = await saveScenario(newScenario);
    if (savedId) {
      toast.success(`${newRevenues.length} gelir ve ${newExpenses.length} gider kalemi miras alındı`);
      return {
        ...newScenario,
        id: savedId,
      };
    }
    return null;
  }, [saveScenario, scenarios]);

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
