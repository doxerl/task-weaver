import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain,
  Sparkles,
  RefreshCw,
  Loader2,
  Target,
  Presentation,
  Rocket,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { UnifiedAnalysisResult, SimulationScenario, EnhancedExecutiveSummary } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';

interface ScenarioSummary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
}

interface AIAnalysisSummaryCardProps {
  unifiedAnalysis: UnifiedAnalysisResult | null;
  isLoading: boolean;
  onAnalyze: () => void;
  onShowPitchDeck: () => void;
  onCreateNextYear: () => void;
  targetYear?: number;
  cachedAt?: Date | null;
  // NEW: Scenario data for comparison display
  scenarioA?: SimulationScenario;
  scenarioB?: SimulationScenario;
  summaryA?: ScenarioSummary;
  summaryB?: ScenarioSummary;
  // Projection year from AI (max(A.year, B.year) + 1)
  projectionYear?: number;
}

export const AIAnalysisSummaryCard: React.FC<AIAnalysisSummaryCardProps> = ({
  unifiedAnalysis,
  isLoading,
  onAnalyze,
  onShowPitchDeck,
  onCreateNextYear,
  targetYear,
  cachedAt,
  scenarioA,
  scenarioB,
  summaryA,
  summaryB,
  projectionYear,
}) => {
  // Calculate display year for next year button
  // Priority: projectionYear from AI > targetYear + 1 > fallback
  const nextYearDisplay = projectionYear || 
    (unifiedAnalysis?.next_year_projection?.projection_year) ||
    (targetYear ? targetYear + 1 : null);
  // Get top revenue items from scenario A
  const topRevenues = React.useMemo(() => {
    if (!scenarioA?.revenues) return [];
    return [...scenarioA.revenues]
      .sort((a, b) => b.projectedAmount - a.projectedAmount)
      .slice(0, 4);
  }, [scenarioA]);

  // Calculate investment impact (difference between A and B)
  const investmentImpact = React.useMemo(() => {
    if (!summaryA || !summaryB) return null;
    const revenueGap = summaryA.totalRevenue - summaryB.totalRevenue;
    const profitGap = summaryA.netProfit - summaryB.netProfit;
    const percentGap = summaryB.totalRevenue > 0 
      ? ((revenueGap / summaryB.totalRevenue) * 100) 
      : 0;
    return { revenueGap, profitGap, percentGap };
  }, [summaryA, summaryB]);

  // Check if executive_summary is enhanced (object) or legacy (string)
  const isEnhancedSummary = (summary: string | EnhancedExecutiveSummary | undefined): summary is EnhancedExecutiveSummary => {
    return typeof summary === 'object' && summary !== null && 'short_pitch' in summary;
  };

  return (
    <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            🧠 Kapsamlı AI Analizi (Gemini Pro 3)
          </CardTitle>
          <div className="flex items-center gap-2">
            {cachedAt && (
              <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {cachedAt.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
            <Button 
              onClick={onAnalyze} 
              disabled={isLoading}
              size="sm"
              className={unifiedAnalysis 
                ? "bg-muted hover:bg-muted/80 text-foreground" 
                : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              }
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analiz Ediliyor...
                </>
              ) : unifiedAnalysis ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Yeniden Analiz
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Yatırımcı Sunumu Oluştur
                </>
              )}
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          Senaryo verilerini analiz ederek yatırımcı sunumu, deal skoru ve gelecek yıl projeksiyonu oluşturur
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ) : unifiedAnalysis ? (
          <div className="space-y-4">
            {/* Top Revenue Items - Before deal score */}
            {topRevenues.length > 0 && (
              <div className="text-xs text-muted-foreground border-b border-purple-500/10 pb-2">
                📊 <span className="font-medium">Gelir Kalemleri:</span>{' '}
                {topRevenues.map((r, i) => (
                  <span key={r.id}>
                    {r.category} ({formatCompactUSD(r.projectedAmount)})
                    {i < topRevenues.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </div>
            )}

            {/* Scenario Comparison - A vs B with Year Labels */}
            {scenarioA && scenarioB && summaryA && summaryB && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-medium text-emerald-400 truncate">
                      {scenarioA.targetYear} {scenarioA.name}
                    </span>
                  </div>
                  <div className="text-foreground font-semibold">{formatCompactUSD(summaryA.totalRevenue)}</div>
                  <div className="text-muted-foreground">
                    Kâr: {formatCompactUSD(summaryA.netProfit)}
                  </div>
                </div>
                <div className="bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                    <span className="font-medium text-red-400 truncate">
                      {scenarioB.targetYear} {scenarioB.name}
                    </span>
                  </div>
                  <div className="text-foreground font-semibold">{formatCompactUSD(summaryB.totalRevenue)}</div>
                  <div className="text-muted-foreground">
                    Kâr: {formatCompactUSD(summaryB.netProfit)}
                  </div>
                </div>
              </div>
            )}

            {/* Investment Impact Alert */}
            {investmentImpact && investmentImpact.revenueGap > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-amber-400">Yatırım Alamazsak:</span>{' '}
                  <span className="text-foreground">
                    {formatCompactUSD(investmentImpact.revenueGap)} daha az gelir 
                    ({investmentImpact.percentGap.toFixed(0)}% kayıp)
                  </span>
                </div>
              </div>
            )}

            {/* Deal Score & Verdict - Compact Summary */}
            {unifiedAnalysis.deal_analysis.deal_score > 0 ? (
              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium">Deal Skoru:</span>
                    </div>
                    <Badge className={`text-lg px-3 py-1 ${
                      unifiedAnalysis.deal_analysis.deal_score >= 7 ? 'bg-emerald-600' :
                      unifiedAnalysis.deal_analysis.deal_score >= 5 ? 'bg-amber-600' : 'bg-red-600'
                    }`}>
                      {unifiedAnalysis.deal_analysis.deal_score}/10
                    </Badge>
                    <Badge variant="outline" className={`${
                      unifiedAnalysis.deal_analysis.valuation_verdict === 'cheap' ? 'border-emerald-500 text-emerald-400' :
                      unifiedAnalysis.deal_analysis.valuation_verdict === 'premium' ? 'border-red-500 text-red-400' :
                      'border-amber-500 text-amber-400'
                    }`}>
                      {unifiedAnalysis.deal_analysis.valuation_verdict === 'cheap' ? '💎 Ucuz' :
                       unifiedAnalysis.deal_analysis.valuation_verdict === 'premium' ? '💰 Pahalı' : '⚖️ Adil'}
                    </Badge>
                  </div>
                </div>
                
                {/* Enhanced Executive Summary */}
                {unifiedAnalysis.pitch_deck?.executive_summary && (
                  <div className="text-sm text-muted-foreground border-t border-purple-500/20 pt-3 space-y-2">
                    {isEnhancedSummary(unifiedAnalysis.pitch_deck.executive_summary) ? (
                      <>
                        <p>{unifiedAnalysis.pitch_deck.executive_summary.short_pitch}</p>
                        {unifiedAnalysis.pitch_deck.executive_summary.scenario_comparison && (
                          <p className="text-xs border-t border-purple-500/10 pt-2 mt-2">
                            📊 {unifiedAnalysis.pitch_deck.executive_summary.scenario_comparison}
                          </p>
                        )}
                        {unifiedAnalysis.pitch_deck.executive_summary.investment_impact && (
                          <p className="text-xs text-amber-400/80">
                            ⚠️ {unifiedAnalysis.pitch_deck.executive_summary.investment_impact}
                          </p>
                        )}
                      </>
                    ) : (
                      <p>{unifiedAnalysis.pitch_deck.executive_summary}</p>
                    )}
                  </div>
                )}
                
                {/* Next Year Summary */}
                {unifiedAnalysis.next_year_projection && (
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center border-t border-purple-500/20 pt-3">
                    <div>
                      <div className="text-sm font-bold text-blue-400">
                        {formatCompactUSD(unifiedAnalysis.next_year_projection.summary.total_revenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">{nextYearDisplay || 'Gelecek Yıl'} Gelir</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-red-400">
                        {formatCompactUSD(unifiedAnalysis.next_year_projection.summary.total_expenses)}
                      </div>
                      <div className="text-xs text-muted-foreground">Gider</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-400">
                        {formatCompactUSD(unifiedAnalysis.next_year_projection.summary.net_profit)}
                      </div>
                      <div className="text-xs text-muted-foreground">Net Kâr</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Fallback for incomplete/old format analyses */
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Eksik Analiz Verileri</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bu analiz eski formatta kaydedilmiş. Tam sonuçlar için yukarıdaki "Yeniden Analiz" butonuna tıklayın.
                </p>
                {/* Show existing insights if available */}
                {unifiedAnalysis.insights && unifiedAnalysis.insights.length > 0 && (
                  <div className="space-y-1.5 border-t border-amber-500/20 pt-3 mt-3">
                    <p className="text-xs font-medium text-muted-foreground">📊 Mevcut Analizler ({unifiedAnalysis.insights.length}):</p>
                    {unifiedAnalysis.insights.slice(0, 3).map((insight, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        • {insight.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Pitch Deck Button */}
              <Card 
                className="border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 transition-colors cursor-pointer" 
                onClick={onShowPitchDeck}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Presentation className="h-8 w-8 text-purple-400" />
                  <div>
                    <h4 className="font-medium text-sm">Pitch Deck</h4>
                    <p className="text-xs text-muted-foreground">5 slaytlık yatırımcı sunumu</p>
                  </div>
                </CardContent>
              </Card>

              {/* Next Year Button */}
              {unifiedAnalysis.next_year_projection && (
                <Card 
                  className="border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors cursor-pointer" 
                  onClick={onCreateNextYear}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <Rocket className="h-8 w-8 text-emerald-400" />
                    <div>
                      <h4 className="font-medium text-sm">{nextYearDisplay || 'Sonraki Yıl'}'e Geç</h4>
                      <p className="text-xs text-muted-foreground">AI projeksiyonuyla yeni yıl</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Brain className="h-12 w-12 mx-auto mb-3 text-purple-400/30" />
            <p className="text-sm text-muted-foreground">
              Aşağıdaki yatırım ayarlarını yapın ve <strong>Yatırımcı Sunumu Oluştur</strong> butonuna tıklayın.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              🤖 Gemini Pro 3 ile derin analiz, pitch deck ve gelecek yıl projeksiyonu oluşturulacak.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
