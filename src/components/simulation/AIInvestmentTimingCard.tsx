import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  AlertTriangle, 
  Target,
  TrendingDown,
  Zap,
  Calendar
} from 'lucide-react';
import { CapitalRequirement } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';

interface OptimalInvestmentTiming {
  recommendedQuarter: string;
  reason: string;
  riskIfDelayed: string;
  runwayWithoutInvestment: number;
  criticalCashMonth: string;
  confidenceScore: number;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
}

interface AIInvestmentTimingCardProps {
  quarterlyA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyB: { q1: number; q2: number; q3: number; q4: number };
  capitalNeedB: CapitalRequirement;
  investmentAmount: number;
}

export const AIInvestmentTimingCard: React.FC<AIInvestmentTimingCardProps> = ({
  quarterlyA,
  quarterlyB,
  capitalNeedB,
  investmentAmount,
}) => {
  // Calculate optimal investment timing based on cash flow patterns
  const timing = useMemo<OptimalInvestmentTiming>(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const flowsB = [quarterlyB.q1, quarterlyB.q2, quarterlyB.q3, quarterlyB.q4];
    
    // Find when cumulative cash goes negative (Death Valley)
    let cumulative = 0;
    let deathValleyQuarter = '';
    let deathValleyValue = 0;
    let firstNegativeQuarter = '';
    
    for (let i = 0; i < 4; i++) {
      cumulative += flowsB[i];
      if (cumulative < deathValleyValue) {
        deathValleyValue = cumulative;
        deathValleyQuarter = quarters[i];
      }
      if (cumulative < 0 && !firstNegativeQuarter) {
        firstNegativeQuarter = quarters[i];
      }
    }
    
    // Determine recommended quarter (one before death valley, or Q1 if critical)
    const quarterIndex = quarters.indexOf(deathValleyQuarter || firstNegativeQuarter || 'Q4');
    const recommendedIndex = Math.max(0, quarterIndex - 1);
    const recommendedQuarter = quarters[recommendedIndex];
    
    // Calculate urgency
    const monthsToDeathValley = capitalNeedB.runwayMonths;
    let urgencyLevel: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (monthsToDeathValley <= 3) urgencyLevel = 'critical';
    else if (monthsToDeathValley <= 6) urgencyLevel = 'high';
    else if (monthsToDeathValley <= 9) urgencyLevel = 'medium';
    
    // Build reason based on data
    let reason = '';
    if (capitalNeedB.selfSustaining) {
      reason = 'Şirket kendi kendini finanse edebiliyor. Yatırım büyüme hızlandırmak için kullanılabilir.';
    } else if (urgencyLevel === 'critical') {
      reason = `Nakit ${deathValleyQuarter}'de kritik seviyeye düşecek. Acil yatırım gerekli!`;
    } else {
      reason = `${deathValleyQuarter}'deki nakit açığından önce sermaye güvence altına alınmalı.`;
    }
    
    // Risk if delayed
    let riskIfDelayed = '';
    if (capitalNeedB.selfSustaining) {
      riskIfDelayed = 'Büyüme fırsatları kaçırılabilir ama operasyonlar devam eder.';
    } else if (urgencyLevel === 'critical') {
      riskIfDelayed = `${monthsToDeathValley} ay içinde nakit tükenir, operasyonlar durabilir!`;
    } else {
      riskIfDelayed = `${deathValleyQuarter} sonrasında ${formatCompactUSD(Math.abs(deathValleyValue))} açık oluşacak.`;
    }
    
    // Month mapping
    const quarterToMonth: Record<string, string> = {
      'Q1': 'Mart',
      'Q2': 'Haziran', 
      'Q3': 'Eylül',
      'Q4': 'Aralık'
    };
    
    return {
      recommendedQuarter,
      reason,
      riskIfDelayed,
      runwayWithoutInvestment: monthsToDeathValley,
      criticalCashMonth: quarterToMonth[deathValleyQuarter] || 'N/A',
      confidenceScore: capitalNeedB.selfSustaining ? 60 : Math.min(95, 70 + (12 - monthsToDeathValley) * 3),
      urgencyLevel,
    };
  }, [quarterlyB, capitalNeedB]);

  const urgencyColors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };

  const urgencyLabels = {
    critical: 'Kritik',
    high: 'Yüksek',
    medium: 'Orta',
    low: 'Düşük',
  };

  return (
    <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-400" />
          AI Optimal Yatırım Zamanlaması
        </CardTitle>
        <CardDescription className="text-xs">
          Nakit akışı pattern'lerine göre en uygun yatırım zamanı
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Recommended Quarter */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-blue-400" />
              <span className="text-xs text-muted-foreground">Önerilen</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">{timing.recommendedQuarter}</div>
            <div className="text-xs text-muted-foreground">2026</div>
          </div>

          {/* Urgency Level */}
          <div className="p-3 rounded-lg bg-muted/30 border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Aciliyet</span>
            </div>
            <Badge className={`${urgencyColors[timing.urgencyLevel]} text-sm`}>
              {urgencyLabels[timing.urgencyLevel]}
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {timing.runwayWithoutInvestment < 999 
                ? `${timing.runwayWithoutInvestment} ay runway` 
                : '∞'}
            </div>
          </div>

          {/* Confidence */}
          <div className="p-3 rounded-lg bg-muted/30 border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Güven</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{timing.confidenceScore}%</div>
            <div className="text-xs text-muted-foreground">Tahmin doğruluğu</div>
          </div>
        </div>

        {/* Explanation */}
        <div className="p-3 rounded-lg bg-muted/20 border space-y-2">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{timing.reason}</p>
          </div>
          
          <div className="flex items-start gap-2">
            <TrendingDown className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="text-red-400 font-medium">Erteleme riski:</span> {timing.riskIfDelayed}
            </p>
          </div>
        </div>

        {/* Critical Month */}
        {!capitalNeedB.selfSustaining && timing.criticalCashMonth !== 'N/A' && (
          <div className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20">
            <span className="text-xs text-red-400">Kritik Nakit Ayı</span>
            <Badge variant="outline" className="text-red-400 border-red-500/30">
              {timing.criticalCashMonth} 2026
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
