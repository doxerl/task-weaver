import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  AlertTriangle, 
  Target,
  TrendingDown,
  Zap,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { CapitalRequirement } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { useTranslation } from 'react-i18next';

interface OptimalInvestmentTiming {
  recommendedQuarter: string;
  recommendedTiming: string;
  reason: string;
  riskIfDelayed: string;
  requiredInvestment: number;
  confidenceScore: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  firstDeficitQuarter: string;
  maxDeficitQuarter: string;
  quarterlyNeeds: number[];
}

interface AIInvestmentTimingCardProps {
  quarterlyA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyB: { q1: number; q2: number; q3: number; q4: number };
  capitalNeedB: CapitalRequirement;
  investmentAmount: number;
  targetYear?: number;
}

export const AIInvestmentTimingCard: React.FC<AIInvestmentTimingCardProps> = ({
  quarterlyB,
  capitalNeedB,
  targetYear = 2026,
}) => {
  const { t, i18n } = useTranslation(['simulation']);
  const isEnglish = i18n.language === 'en';

  // Month names based on language
  const monthMap: Record<string, string> = isEnglish 
    ? { 'Q1': 'March', 'Q2': 'June', 'Q3': 'September' }
    : { 'Q1': 'Mart', 'Q2': 'Haziran', 'Q3': 'Eylül' };

  // Calculate optimal investment timing based on NEGATIVE scenario cash flow
  const timing = useMemo<OptimalInvestmentTiming>(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const flowsB = [quarterlyB.q1, quarterlyB.q2, quarterlyB.q3, quarterlyB.q4];
    
    // 1. Calculate cumulative cash position (negative scenario = without investment)
    let cumulative = 0;
    let firstDeficitQuarter = '';
    let firstDeficitAmount = 0;
    let maxDeficit = 0;
    let maxDeficitQuarter = '';
    const quarterlyNeeds: number[] = [];
    
    for (let i = 0; i < 4; i++) {
      cumulative += flowsB[i];
      
      // Track quarterly capital needs
      quarterlyNeeds.push(cumulative < 0 ? Math.abs(cumulative) : 0);
      
      // Find FIRST deficit quarter
      if (cumulative < 0 && !firstDeficitQuarter) {
        firstDeficitQuarter = quarters[i];
        firstDeficitAmount = Math.abs(cumulative);
      }
      
      // Find maximum deficit (Death Valley)
      if (cumulative < maxDeficit) {
        maxDeficit = cumulative;
        maxDeficitQuarter = quarters[i];
      }
    }
    
    // 2. Investment timing - Must be BEFORE first deficit
    let recommendedQuarter: string;
    let recommendedTiming: string;
    
    if (!firstDeficitQuarter) {
      recommendedQuarter = t('aiTiming.optional');
      recommendedTiming = t('aiTiming.anyTime');
    } else if (firstDeficitQuarter === 'Q1') {
      recommendedQuarter = t('aiTiming.yearStart');
      recommendedTiming = t('aiTiming.before', { date: `${isEnglish ? 'January' : 'Ocak'} ${targetYear}` });
    } else {
      const firstDeficitIndex = quarters.indexOf(firstDeficitQuarter);
      recommendedQuarter = quarters[firstDeficitIndex - 1];
      recommendedTiming = t('aiTiming.byEnd', { date: `${monthMap[recommendedQuarter]} ${targetYear}` });
    }
    
    // 3. URGENCY
    let urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
    
    if (!firstDeficitQuarter) {
      urgencyLevel = 'low';
    } else if (firstDeficitQuarter === 'Q1') {
      urgencyLevel = 'critical';
    } else if (firstDeficitQuarter === 'Q2') {
      urgencyLevel = 'high';
    } else if (firstDeficitQuarter === 'Q3') {
      urgencyLevel = 'medium';
    } else {
      urgencyLevel = 'low';
    }
    
    // 4. Reason and risk explanations
    let reason: string;
    let riskIfDelayed: string;
    
    if (!firstDeficitQuarter) {
      reason = t('aiTiming.reasons.selfSustaining');
      riskIfDelayed = t('aiTiming.risks.selfSustaining');
    } else if (firstDeficitQuarter === 'Q1') {
      reason = t('aiTiming.reasons.q1Deficit', { amount: formatCompactUSD(firstDeficitAmount) });
      riskIfDelayed = t('aiTiming.risks.q1Deficit');
    } else {
      reason = t('aiTiming.reasons.futureDeficit', { quarter: firstDeficitQuarter, amount: formatCompactUSD(firstDeficitAmount) });
      riskIfDelayed = t('aiTiming.risks.futureDeficit', { quarter: firstDeficitQuarter });
    }
    
    // 5. Required investment = Max deficit + 20% safety margin
    const requiredInvestment = Math.abs(maxDeficit) * 1.20;
    
    return {
      recommendedQuarter,
      recommendedTiming,
      reason,
      riskIfDelayed,
      requiredInvestment,
      quarterlyNeeds,
      firstDeficitQuarter: firstDeficitQuarter || t('aiTiming.none'),
      maxDeficitQuarter: maxDeficitQuarter || t('aiTiming.none'),
      urgencyLevel,
      confidenceScore: firstDeficitQuarter ? 90 : 60
    };
  }, [quarterlyB, capitalNeedB, targetYear, t, isEnglish, monthMap]);

  const urgencyColors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  const urgencyLabels = {
    critical: t('aiTiming.urgencyLevels.critical'),
    high: t('aiTiming.urgencyLevels.high'),
    medium: t('aiTiming.urgencyLevels.medium'),
    low: t('aiTiming.urgencyLevels.low'),
  };

  const urgencyDescriptions = {
    critical: t('aiTiming.urgencyDescriptions.critical'),
    high: t('aiTiming.urgencyDescriptions.high'),
    medium: t('aiTiming.urgencyDescriptions.medium'),
    low: t('aiTiming.urgencyDescriptions.low'),
  };

  const maxNeed = Math.max(...timing.quarterlyNeeds, 1);

  return (
    <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-400" />
          {t('aiTiming.title')}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('aiTiming.description', { year: targetYear })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Recommended Quarter */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-blue-400" />
              <span className="text-xs text-muted-foreground">{t('aiTiming.recommended')}</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{timing.recommendedQuarter}</div>
            <div className="text-xs text-muted-foreground">{timing.recommendedTiming}</div>
          </div>

          {/* Urgency Level */}
          <div className="p-3 rounded-lg bg-muted/30 border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('aiTiming.urgency')}</span>
            </div>
            <Badge className={`${urgencyColors[timing.urgencyLevel]} text-sm`}>
              {urgencyLabels[timing.urgencyLevel]}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {urgencyDescriptions[timing.urgencyLevel]}
            </div>
          </div>

          {/* Required Investment */}
          <div className="p-3 rounded-lg bg-muted/30 border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('aiTiming.requiredCapital')}</span>
            </div>
            <div className="text-xl font-bold text-foreground">
              {formatCompactUSD(timing.requiredInvestment)}
            </div>
            <div className="text-xs text-muted-foreground">{t('aiTiming.safetyIncluded')}</div>
          </div>
        </div>

        {/* Quarterly Capital Needs Visualization */}
        {timing.quarterlyNeeds.some(n => n > 0) && (
          <div className="p-3 rounded-lg bg-muted/20 border space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t('aiTiming.quarterlyCumulativeNeed')}
            </p>
            <div className="space-y-1.5">
              {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
                <div key={q} className="flex items-center gap-2">
                  <span className="text-xs w-8 text-muted-foreground font-medium">{q}</span>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        timing.firstDeficitQuarter === q 
                          ? 'bg-red-500' 
                          : timing.quarterlyNeeds[i] > 0 
                            ? 'bg-orange-400' 
                            : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.max((timing.quarterlyNeeds[i] / maxNeed) * 100, timing.quarterlyNeeds[i] > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-14 text-right">
                    {timing.quarterlyNeeds[i] > 0 ? formatCompactUSD(timing.quarterlyNeeds[i]) : '-'}
                  </span>
                  {timing.firstDeficitQuarter === q && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                      {t('aiTiming.firstDeficit')}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="p-3 rounded-lg bg-muted/20 border space-y-2">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{timing.reason}</p>
          </div>
          
          <div className="flex items-start gap-2">
            <TrendingDown className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="text-red-400 font-medium">{t('aiTiming.delayRisk')}:</span> {timing.riskIfDelayed}
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <div className="flex items-center gap-1">
            <span>{t('aiTiming.analysisConfidence')}: {timing.confidenceScore}%</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            <span>{t('aiTiming.firstDeficitLabel')}: {timing.firstDeficitQuarter}</span>
            <span className="mx-1">•</span>
            <span>{t('aiTiming.maxDeficitLabel')}: {timing.maxDeficitQuarter}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
