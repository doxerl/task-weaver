import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, ArrowLeftRight, Target } from 'lucide-react';
import { QuarterlyItemizedData } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';

interface ScenarioComparisonCardsProps {
  quarterlyItemized: QuarterlyItemizedData;
  type: 'revenues' | 'expenses';
}

interface ComparisonItem {
  category: string;
  scenarioA: { q1: number; q2: number; q3: number; q4: number; total: number };
  scenarioB: { q1: number; q2: number; q3: number; q4: number; total: number };
  diffs: { q1: number; q2: number; q3: number; q4: number; total: number };
  percentDiffs: { q1: number; q2: number; q3: number; q4: number; total: number };
  riskLevel: 'low' | 'medium' | 'high';
  maxDiffQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  divergenceTrend: 'increasing' | 'decreasing' | 'stable';
}

export function ScenarioComparisonCards({ quarterlyItemized, type }: ScenarioComparisonCardsProps) {
  const title = type === 'revenues' ? 'Gelir Kalemleri Senaryo Karşılaştırması' : 'Gider Kalemleri Senaryo Karşılaştırması';
  const isRevenue = type === 'revenues';
  
  const comparisonItems = useMemo((): ComparisonItem[] => {
    const itemsA = type === 'revenues' ? quarterlyItemized.scenarioA.revenues : quarterlyItemized.scenarioA.expenses;
    const itemsB = type === 'revenues' ? quarterlyItemized.scenarioB.revenues : quarterlyItemized.scenarioB.expenses;
    
    return itemsA.map(itemA => {
      const itemB = itemsB.find(b => b.category === itemA.category) || { q1: 0, q2: 0, q3: 0, q4: 0, total: 0, category: itemA.category };
      
      // Farkları hesapla (Pozitif - Negatif)
      const diffs = {
        q1: itemA.q1 - itemB.q1,
        q2: itemA.q2 - itemB.q2,
        q3: itemA.q3 - itemB.q3,
        q4: itemA.q4 - itemB.q4,
        total: itemA.total - itemB.total
      };
      
      // Yüzdesel farklar
      const calcPercent = (a: number, b: number) => b !== 0 ? ((a - b) / Math.abs(b)) * 100 : (a !== 0 ? 100 : 0);
      const percentDiffs = {
        q1: calcPercent(itemA.q1, itemB.q1),
        q2: calcPercent(itemA.q2, itemB.q2),
        q3: calcPercent(itemA.q3, itemB.q3),
        q4: calcPercent(itemA.q4, itemB.q4),
        total: calcPercent(itemA.total, itemB.total)
      };
      
      // En büyük farkın olduğu çeyrek
      const absDiffs = [Math.abs(diffs.q1), Math.abs(diffs.q2), Math.abs(diffs.q3), Math.abs(diffs.q4)];
      const maxIdx = absDiffs.indexOf(Math.max(...absDiffs));
      const maxDiffQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' = (['Q1', 'Q2', 'Q3', 'Q4'] as const)[maxIdx];
      
      // Risk seviyesi (fark oranına göre)
      const avgAbsPercentDiff = Math.abs(percentDiffs.total);
      const riskLevel: 'high' | 'medium' | 'low' = avgAbsPercentDiff > 40 ? 'high' : avgAbsPercentDiff > 20 ? 'medium' : 'low';
      
      // Divergence trend (fark zamanla artıyor mu azalıyor mu?)
      const diffGrowth = diffs.q1 !== 0 ? ((diffs.q4 - diffs.q1) / Math.abs(diffs.q1)) * 100 : 0;
      const divergenceTrend: 'increasing' | 'decreasing' | 'stable' = diffGrowth > 15 ? 'increasing' : diffGrowth < -15 ? 'decreasing' : 'stable';
      
      return {
        category: itemA.category,
        scenarioA: { q1: itemA.q1, q2: itemA.q2, q3: itemA.q3, q4: itemA.q4, total: itemA.total },
        scenarioB: { q1: itemB.q1, q2: itemB.q2, q3: itemB.q3, q4: itemB.q4, total: itemB.total },
        diffs,
        percentDiffs,
        riskLevel,
        maxDiffQuarter,
        divergenceTrend
      };
    }).sort((a, b) => Math.abs(b.diffs.total) - Math.abs(a.diffs.total));
  }, [quarterlyItemized, type]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'high':
        return 'Yüksek Fark';
      case 'medium':
        return 'Orta Fark';
      default:
        return 'Düşük Fark';
    }
  };

  const getDivergenceIcon = (trend: string, isRevenue: boolean) => {
    // Gelir için: artan fark = iyi (pozitif senaryo daha iyi), azalan = kötü
    // Gider için: azalan fark = iyi (pozitif senaryo daha iyi), artan = kötü
    if (trend === 'increasing') {
      return isRevenue ? (
        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
          <TrendingUp className="h-3 w-3" />↗️ Artan Fark
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/20 gap-1">
          <TrendingUp className="h-3 w-3" />↗️ Artan Risk
        </Badge>
      );
    } else if (trend === 'decreasing') {
      return isRevenue ? (
        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1">
          <TrendingDown className="h-3 w-3" />↘️ Azalan Fark
        </Badge>
      ) : (
        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
          <TrendingDown className="h-3 w-3" />↘️ Azalan Risk
        </Badge>
      );
    }
    return null;
  };

  const formatDiff = (diff: number, percentDiff: number) => {
    const sign = diff >= 0 ? '+' : '';
    return (
      <div className="text-center">
        <span className={`text-xs font-medium ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {sign}{formatCompactUSD(diff)}
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          ({sign}{percentDiff.toFixed(0)}%)
        </span>
      </div>
    );
  };

  if (comparisonItems.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Pozitif (A) vs Negatif (B) senaryo karşılaştırması</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {comparisonItems.map((item, idx) => (
          <div 
            key={idx} 
            className="p-3 bg-muted/30 rounded-lg border border-border/50"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{item.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${getRiskColor(item.riskLevel)}`}>
                  {getRiskLabel(item.riskLevel)}
                </Badge>
                {getDivergenceIcon(item.divergenceTrend, isRevenue)}
              </div>
            </div>
            
            {/* Totals Row */}
            <div className="grid grid-cols-3 gap-2 mb-2 p-2 bg-background/50 rounded-md">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Pozitif (A)</p>
                <p className="text-sm font-semibold text-emerald-400">{formatCompactUSD(item.scenarioA.total)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Negatif (B)</p>
                <p className="text-sm font-semibold text-red-400">{formatCompactUSD(item.scenarioB.total)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Toplam Fark</p>
                <p className={`text-sm font-semibold ${item.diffs.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {item.diffs.total >= 0 ? '+' : ''}{formatCompactUSD(item.diffs.total)}
                </p>
              </div>
            </div>
            
            {/* Quarterly Comparison */}
            <div className="grid grid-cols-4 gap-1">
              {(['q1', 'q2', 'q3', 'q4'] as const).map((q, qIdx) => {
                const quarterLabel = ['Q1', 'Q2', 'Q3', 'Q4'][qIdx];
                const isMaxDiff = item.maxDiffQuarter === quarterLabel;
                
                return (
                  <div 
                    key={q} 
                    className={`p-2 rounded-md text-center ${isMaxDiff ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/20'}`}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center justify-center gap-1">
                      {quarterLabel}
                      {isMaxDiff && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                    </p>
                    <div className="space-y-0.5">
                      <p className="text-xs">
                        <span className="text-emerald-400">{formatCompactUSD(item.scenarioA[q])}</span>
                      </p>
                      <p className="text-xs">
                        <span className="text-red-400">{formatCompactUSD(item.scenarioB[q])}</span>
                      </p>
                      {formatDiff(item.diffs[q], item.percentDiffs[q])}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        {/* Summary Alert */}
        {comparisonItems.filter(i => i.riskLevel === 'high').length > 0 && (
          <div className="mt-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">Yüksek Fark Uyarısı:</span>
              {comparisonItems.filter(i => i.riskLevel === 'high').map(i => i.category).join(', ')} kalemlerinde senaryolar arası fark %40'ın üzerinde
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
