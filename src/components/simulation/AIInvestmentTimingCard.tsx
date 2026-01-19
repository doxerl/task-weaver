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
  // Calculate optimal investment timing based on NEGATIVE scenario cash flow
  // Investment transforms negative scenario into positive - so timing must be based on when deficits occur
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
      
      // Find FIRST deficit quarter - this is when investment becomes critical
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
    // Because investment funds the growth expenses that create positive scenario
    let recommendedQuarter: string;
    let recommendedTiming: string;
    
    if (!firstDeficitQuarter) {
      // No deficit - company is self-sustaining
      recommendedQuarter = 'İsteğe Bağlı';
      recommendedTiming = 'Büyüme hızlandırma için yıl içinde herhangi bir zamanda';
    } else if (firstDeficitQuarter === 'Q1') {
      // Deficit starts in Q1 - investment needed BEFORE year starts
      recommendedQuarter = 'Yıl Başı';
      recommendedTiming = `Ocak ${targetYear} öncesi`;
    } else {
      // Get quarter before first deficit
      const firstDeficitIndex = quarters.indexOf(firstDeficitQuarter);
      recommendedQuarter = quarters[firstDeficitIndex - 1];
      const monthMap: Record<string, string> = { 'Q1': 'Mart', 'Q2': 'Haziran', 'Q3': 'Eylül' };
      recommendedTiming = `${monthMap[recommendedQuarter]} ${targetYear} sonuna kadar`;
    }
    
    // 3. URGENCY - Based on FIRST deficit, not Death Valley
    // If Q1 has deficit, urgency is critical because we need money NOW
    let urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
    
    if (!firstDeficitQuarter) {
      urgencyLevel = 'low';
    } else if (firstDeficitQuarter === 'Q1') {
      urgencyLevel = 'critical'; // Deficit starts immediately
    } else if (firstDeficitQuarter === 'Q2') {
      urgencyLevel = 'high'; // 3 months until deficit
    } else if (firstDeficitQuarter === 'Q3') {
      urgencyLevel = 'medium'; // 6 months until deficit
    } else {
      urgencyLevel = 'low'; // 9+ months
    }
    
    // 4. Reason and risk explanations - Explain the cause-effect relationship
    let reason: string;
    let riskIfDelayed: string;
    
    if (!firstDeficitQuarter) {
      reason = 'Şirket öz sermaye ile operasyonları sürdürebilir. Yatırım büyümeyi hızlandırmak için kullanılabilir.';
      riskIfDelayed = 'Büyüme fırsatları kaçırılabilir ama operasyonlar devam eder.';
    } else if (firstDeficitQuarter === 'Q1') {
      reason = `Q1'de ${formatCompactUSD(firstDeficitAmount)} nakit açığı başlıyor. Bu açık kapatılmadan planlanan büyüme harcamaları (fuar, personel, pazarlama) yapılamaz.`;
      riskIfDelayed = 'Yatırım olmadan pozitif senaryoya geçiş mümkün değil. Büyüme stratejisi ertelenir, pazar payı kaybedilir.';
    } else {
      reason = `${firstDeficitQuarter}'de ${formatCompactUSD(firstDeficitAmount)} nakit açığı başlayacak. Bu tarihten önce sermaye güvence altına alınmalı.`;
      riskIfDelayed = `${firstDeficitQuarter} sonrasında büyüme için planlanan harcamalar yapılamaz hale gelir. Pozitif senaryo gerçekleşmez.`;
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
      firstDeficitQuarter: firstDeficitQuarter || 'Yok',
      maxDeficitQuarter: maxDeficitQuarter || 'Yok',
      urgencyLevel,
      confidenceScore: firstDeficitQuarter ? 90 : 60
    };
  }, [quarterlyB, capitalNeedB, targetYear]);

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

  const urgencyDescriptions = {
    critical: "Q1'de açık başlıyor - Şu an yatırım gerekli",
    high: '3 ay içinde açık başlayacak',
    medium: '6 ay içinde açık başlayacak',
    low: 'Nakit pozisyonu güçlü',
  };

  const maxNeed = Math.max(...timing.quarterlyNeeds, 1);

  return (
    <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-400" />
          AI Optimal Yatırım Zamanlaması
        </CardTitle>
        <CardDescription className="text-xs">
          {targetYear || ''} Negatif senaryo nakit açıklarına göre optimal yatırım zamanı
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
            <div className="text-xs text-muted-foreground">{timing.recommendedTiming}</div>
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
              {urgencyDescriptions[timing.urgencyLevel]}
            </div>
          </div>

          {/* Required Investment */}
          <div className="p-3 rounded-lg bg-muted/30 border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Gerekli Sermaye</span>
            </div>
            <div className="text-xl font-bold text-foreground">
              {formatCompactUSD(timing.requiredInvestment)}
            </div>
            <div className="text-xs text-muted-foreground">%20 güvenlik dahil</div>
          </div>
        </div>

        {/* Quarterly Capital Needs Visualization */}
        {timing.quarterlyNeeds.some(n => n > 0) && (
          <div className="p-3 rounded-lg bg-muted/20 border space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Çeyreklik Kümülatif Sermaye İhtiyacı (Negatif Senaryo)
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
                      İlk Açık
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
              <span className="text-red-400 font-medium">Erteleme riski:</span> {timing.riskIfDelayed}
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
          <div className="flex items-center gap-1">
            <span>Analiz Güveni: {timing.confidenceScore}%</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            <span>İlk açık: {timing.firstDeficitQuarter}</span>
            <span className="mx-1">•</span>
            <span>Max açık: {timing.maxDeficitQuarter}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
