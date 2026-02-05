import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  TrendingUp,
} from 'lucide-react';
import { UnifiedAnalysisResult } from '@/types/simulation';

interface AIAnalysisDetailsProps {
  unifiedAnalysis: UnifiedAnalysisResult | null;
  targetYear?: number;
}

export const AIAnalysisDetails: React.FC<AIAnalysisDetailsProps> = ({
  unifiedAnalysis,
  targetYear,
}) => {
  const { t } = useTranslation(['simulation', 'common']);
  const [isOpen, setIsOpen] = useState(false);

  if (!unifiedAnalysis) return null;

  const hasDetails = 
    unifiedAnalysis.insights.length > 0 || 
    unifiedAnalysis.recommendations.length > 0 || 
    unifiedAnalysis.deal_analysis.risk_factors.length > 0;

  if (!hasDetails) return null;

  const hasCollapsibleContent = 
    unifiedAnalysis.insights.length > 0 || 
    unifiedAnalysis.deal_analysis.investor_attractiveness;

  return (
    <div className="space-y-4">
      {/* Recommendations - Her zaman görünür */}
      {unifiedAnalysis.recommendations.length > 0 && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              {t('aiDetails.recommendationsTitle')}
            </h4>
            <ul className="text-sm space-y-2">
              {unifiedAnalysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                  <span>
                    <strong className="text-emerald-300">{rec.title}:</strong>{' '}
                    <span className="text-muted-foreground">{rec.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Risk Factors - Her zaman görünür */}
      {unifiedAnalysis.deal_analysis.risk_factors.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {t('aiDetails.riskFactors')}
            </h4>
            <ul className="text-sm text-amber-300 space-y-2">
              {unifiedAnalysis.deal_analysis.risk_factors.map((risk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Strategy Note - Her zaman görünür */}
      {unifiedAnalysis.next_year_projection?.strategy_note && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-blue-400">
              <TrendingUp className="h-4 w-4" />
              {targetYear ? t('aiDetails.strategyNote', { year: targetYear + 1 }) : t('aiDetails.nextYearStrategy')}
            </h4>
            <p className="text-sm text-blue-300">{unifiedAnalysis.next_year_projection.strategy_note}</p>
          </CardContent>
        </Card>
      )}

      {/* Detaylı Analizler - Collapsible */}
      {hasCollapsibleContent && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="border-purple-500/20">
            <CardHeader className="pb-2">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
                >
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-400" />
                    {t('aiDetails.title')}
                    <Badge variant="secondary" className="text-xs ml-2">
                      {unifiedAnalysis.insights.length} {t('aiDetails.insights')}
                    </Badge>
                  </CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-2">
                {/* Investor Attractiveness */}
                {unifiedAnalysis.deal_analysis.investor_attractiveness && (
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                    <p className="text-sm text-muted-foreground">
                      {unifiedAnalysis.deal_analysis.investor_attractiveness}
                    </p>
                  </div>
                )}

                {/* Financial Insights */}
                {unifiedAnalysis.insights.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {t('aiDetails.financialInsights')}
                    </h4>
                    {unifiedAnalysis.insights.map((insight, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50">
                        <h5 className="text-sm font-medium">{insight.title}</h5>
                        <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
};
