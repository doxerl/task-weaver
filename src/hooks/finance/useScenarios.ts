import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  ProjectionItem, 
  InvestmentItem, 
  SimulationScenario 
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

      const mapped: SimulationScenario[] = (data as unknown as DatabaseScenario[]).map(d => ({
        id: d.id,
        name: d.name,
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
      revenues: scenario.revenues,
      expenses: scenario.expenses,
      investments: scenario.investments,
      assumedExchangeRate: scenario.assumedExchangeRate,
      notes: scenario.notes,
    });
  }, [scenarios, saveScenario]);

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
  };
}
