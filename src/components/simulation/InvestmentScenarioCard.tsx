import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
} from 'lucide-react';
import { InvestmentScenarioComparison } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';

interface InvestmentScenarioCardProps {
  comparison: InvestmentScenarioComparison;
  scenarioAName: string;
  scenarioBName: string;
}

const getRiskBadgeVariant = (level: string) => {
  switch (level) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

const getRiskLabel = (level: string) => {
  switch (level) {
    case 'critical': return 'Kritik Risk';
    case 'high': return 'Yüksek Risk';
    case 'medium': return 'Orta Risk';
    default: return 'Düşük Risk';
  }
};

export const InvestmentScenarioCard: React.FC<InvestmentScenarioCardProps> = ({
  comparison,
  scenarioAName,
  scenarioBName,
}) => {
  const { withInvestment, withoutInvestment, opportunityCost } = comparison;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Yatırım Senaryoları Karşılaştırması
        </CardTitle>
        <CardDescription className="text-xs">
          Yatırım alırsak vs alamazsak: Gelir, kâr ve değerleme farkları
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Two Column Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left: Yatırım Alırsak */}
          <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
                Yatırım Alırsak
              </span>
              <Badge variant="outline" className="ml-auto text-xs border-emerald-500/30 text-emerald-600">
                {scenarioAName}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Gelir:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCompactUSD(withInvestment.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Net Kâr:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCompactUSD(withInvestment.netProfit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Kâr Marjı:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  %{withInvestment.profitMargin.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-emerald-500/20">
                <span className="text-xs text-muted-foreground">5Y Değerleme:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCompactUSD(withInvestment.exitValuation)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">MOIC (5Y):</span>
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                  {withInvestment.moic5Year > 100 
                    ? `${(withInvestment.moic5Year / 1000).toFixed(1)}Kx` 
                    : `${withInvestment.moic5Year.toFixed(1)}x`}
                </Badge>
              </div>
            </div>
          </div>

          {/* Right: Yatırım Alamazsak */}
          <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="font-medium text-sm text-red-700 dark:text-red-400">
                Yatırım Alamazsak
              </span>
              <Badge variant="outline" className="ml-auto text-xs border-red-500/30 text-red-600">
                {scenarioBName}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Gelir:</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  {formatCompactUSD(withoutInvestment.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Net Kâr:</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  {formatCompactUSD(withoutInvestment.netProfit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Kâr Marjı:</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  %{withoutInvestment.profitMargin.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-red-500/20">
                <span className="text-xs text-muted-foreground">Organik Büyüme:</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">
                  %{(withoutInvestment.organicGrowthRate * 100).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">MOIC:</span>
                <Badge variant="outline" className="text-muted-foreground">
                  N/A
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Opportunity Cost Alert */}
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            Yatırım Alamazsak Zarar
            <Badge variant={getRiskBadgeVariant(opportunityCost.riskLevel)} className="ml-2">
              {getRiskLabel(opportunityCost.riskLevel)}
            </Badge>
          </AlertTitle>
          <AlertDescription>
            <div className="grid grid-cols-4 gap-3 mt-3">
              <div className="text-center p-2 rounded bg-background/50">
                <span className="text-xs text-muted-foreground block">Gelir Kaybı</span>
                <p className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  {formatCompactUSD(opportunityCost.revenueLoss)}
                </p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <span className="text-xs text-muted-foreground block">Kâr Kaybı</span>
                <p className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  {formatCompactUSD(opportunityCost.profitLoss)}
                </p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <span className="text-xs text-muted-foreground block">Büyüme Farkı</span>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  %{(opportunityCost.growthRateDiff * 100).toFixed(0)}
                </p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <span className="text-xs text-muted-foreground block">5Y Değerleme Kaybı</span>
                <p className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatCompactUSD(opportunityCost.valuationLoss)}
                </p>
              </div>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-3">
              Yatırım almazsanız, potansiyel gelirinizin <strong>%{opportunityCost.percentageLoss.toFixed(0)}'ini</strong> kaybedebilir
              ve 5 yıl sonunda şirket değerlemesi <strong>{formatCompactUSD(opportunityCost.valuationLoss)}</strong> daha düşük olabilir.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
