-- Mevcut constraint'i kaldır
ALTER TABLE scenario_ai_analyses 
DROP CONSTRAINT IF EXISTS scenario_ai_analyses_analysis_type_check;

-- Yeni constraint ekle ('unified' dahil)
ALTER TABLE scenario_ai_analyses 
ADD CONSTRAINT scenario_ai_analyses_analysis_type_check 
CHECK (analysis_type = ANY (ARRAY['scenario_comparison'::text, 'investor_pitch'::text, 'unified'::text]));