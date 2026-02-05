import React from 'react';
import { PdfPageWrapper } from './PdfPageWrapper';
import { SimulationScenario } from '@/types/simulation';
import { GrowthAnalysisResult } from '@/hooks/finance/useGrowthAnalysis';
import { Milestone, Target, Users, TrendingUp, Globe } from 'lucide-react';

interface PdfMilestoneTimelinePageProps {
  baseScenario: SimulationScenario;
  growthScenario: SimulationScenario;
  analysis: GrowthAnalysisResult | null;
}

const milestoneTypeIcons: Record<string, React.ReactNode> = {
  revenue: <TrendingUp className="h-4 w-4" />,
  product: <Target className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  market: <Globe className="h-4 w-4" />,
};

const milestoneTypeColors: Record<string, string> = {
  revenue: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  product: 'bg-blue-100 text-blue-700 border-blue-300',
  team: 'bg-purple-100 text-purple-700 border-purple-300',
  market: 'bg-amber-100 text-amber-700 border-amber-300',
};

/**
 * PDF Page for Milestone Timeline - Strategic roadmap
 * Used in Growth Comparison export
 */
export function PdfMilestoneTimelinePage({
  baseScenario,
  growthScenario,
  analysis,
}: PdfMilestoneTimelinePageProps) {
  // Generate default milestones if AI analysis not available
  const milestones = analysis?.milestones ?? generateDefaultMilestones(baseScenario, growthScenario);

  // Group milestones by year
  const milestonesByYear = milestones.reduce((acc, m) => {
    const year = m.year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(m);
    return acc;
  }, {} as Record<number, typeof milestones>);

  return (
    <PdfPageWrapper>
      <div className="p-8 h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Milestone className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-foreground">Stratejik Yol Haritası</h1>
          </div>
          <p className="text-muted-foreground">
            {baseScenario.targetYear} - {growthScenario.targetYear} Dönemi için Kilometre Taşları
          </p>
        </div>

        {/* Timeline Legend */}
        <div className="flex gap-4 mb-6">
          {Object.entries(milestoneTypeColors).map(([type, classes]) => (
            <div key={type} className={`flex items-center gap-2 px-3 py-1 rounded-full border ${classes}`}>
              {milestoneTypeIcons[type]}
              <span className="text-xs font-medium capitalize">
                {type === 'revenue' ? 'Gelir' : 
                 type === 'product' ? 'Ürün' : 
                 type === 'team' ? 'Ekip' : 'Pazar'}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-hidden">
          {Object.entries(milestonesByYear)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([year, yearMilestones]) => (
              <div key={year} className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {year}
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="grid grid-cols-4 gap-3 ml-4">
                  {yearMilestones.map((milestone, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 ${milestoneTypeColors[milestone.type] || 'bg-muted'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {milestoneTypeIcons[milestone.type]}
                        <span className="text-xs font-medium">{milestone.quarter}</span>
                      </div>
                      <div className="font-semibold text-sm mb-1">{milestone.title}</div>
                      <div className="text-xs opacity-80">{milestone.description}</div>
                      {milestone.target && (
                        <div className="mt-2 text-xs font-medium bg-white/50 dark:bg-black/20 rounded px-2 py-1 inline-block">
                          Hedef: {milestone.target}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        {/* AI Recommendations (if available) */}
        {analysis?.milestoneRecommendations && analysis.milestoneRecommendations.length > 0 && (
          <div className="mt-4 border rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
            <h3 className="font-semibold mb-2 text-amber-700 dark:text-amber-400">
              ⚡ Kritik Başarı Faktörleri
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {analysis.milestoneRecommendations.slice(0, 4).map((rec, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-medium">{rec.title}:</span>{' '}
                  <span className="text-muted-foreground">{rec.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t flex justify-between text-xs text-muted-foreground">
          <span>Stratejik Yol Haritası</span>
          <span>{new Date().toLocaleDateString('tr-TR')}</span>
        </div>
      </div>
    </PdfPageWrapper>
  );
}

/**
 * Generate default milestones when AI analysis is not available
 */
function generateDefaultMilestones(
  baseScenario: SimulationScenario,
  growthScenario: SimulationScenario
): GrowthAnalysisResult['milestones'] {
  const baseYear = baseScenario.targetYear;
  const targetYear = growthScenario.targetYear;
  const years = [];
  
  for (let y = baseYear; y <= targetYear; y++) {
    years.push(y);
  }

  const milestones: GrowthAnalysisResult['milestones'] = [];

  // Add Q1 milestones for each year
  years.forEach((year, idx) => {
    if (idx === 0) {
      milestones.push({
        quarter: 'Q1',
        year,
        title: 'Temel Yapılandırma',
        description: 'Mevcut operasyonların optimizasyonu',
        type: 'product',
      });
      milestones.push({
        quarter: 'Q2',
        year,
        title: 'Ekip Güçlendirme',
        description: 'Kritik pozisyonların doldurulması',
        type: 'team',
      });
    } else if (idx === years.length - 1) {
      milestones.push({
        quarter: 'Q1',
        year,
        title: 'Hedef Gelir',
        description: 'Yıllık gelir hedefinin %25\'i',
        target: '$' + Math.round(growthScenario.revenues.reduce((s, r) => s + r.projectedAmount, 0) * 0.25 / 1000) + 'K',
        type: 'revenue',
      });
      milestones.push({
        quarter: 'Q4',
        year,
        title: 'Pazar Liderliği',
        description: 'Sektörde referans şirket konumu',
        type: 'market',
      });
    } else {
      milestones.push({
        quarter: 'Q2',
        year,
        title: 'Ürün Genişletme',
        description: 'Yeni özellik veya ürün lansmanı',
        type: 'product',
      });
      milestones.push({
        quarter: 'Q4',
        year,
        title: 'Gelir Artışı',
        description: 'Yıllık büyüme hedefine ulaşma',
        target: '+' + Math.round(((idx + 1) / years.length) * 50) + '%',
        type: 'revenue',
      });
    }
  });

  return milestones;
}

export default PdfMilestoneTimelinePage;
