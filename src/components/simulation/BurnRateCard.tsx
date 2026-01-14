import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, Flame, DollarSign } from 'lucide-react';
import { BurnRateAnalysis, QuarterlyProjection } from '@/types/simulation';
import { cn } from '@/lib/utils';

interface BurnRateCardProps {
  burnAnalysis: BurnRateAnalysis;
  currentCash: number;
  className?: string;
}

function formatUSD(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${value < 0 ? '-' : ''}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${value < 0 ? '-' : ''}$${absValue.toFixed(0)}`;
}

function QuarterlyTable({ 
  projections, 
  title, 
  variant 
}: { 
  projections: QuarterlyProjection[]; 
  title: string;
  variant: 'with' | 'without';
}) {
  const hasNegativeClosing = projections.some(p => p.closingBalance < 0);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        {variant === 'without' && !hasNegativeClosing && (
          <Badge variant="outline" className="text-green-600 border-green-600/50">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Yeterli
          </Badge>
        )}
        {variant === 'without' && hasNegativeClosing && (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Açık Var
          </Badge>
        )}
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-20">Çeyrek</TableHead>
              <TableHead className="text-right">Açılış</TableHead>
              <TableHead className="text-right text-green-600">Gelir</TableHead>
              <TableHead className="text-right text-red-600">Gider</TableHead>
              {variant === 'with' && (
                <TableHead className="text-right text-orange-600">Yatırım</TableHead>
              )}
              <TableHead className="text-right font-medium">Kapanış</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projections.map((p) => (
              <TableRow key={p.quarter}>
                <TableCell className="font-medium">{p.quarter}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatUSD(p.openingBalance)}
                </TableCell>
                <TableCell className="text-right text-green-600">
                  +{formatUSD(p.revenue)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  -{formatUSD(p.expense)}
                </TableCell>
                {variant === 'with' && (
                  <TableCell className="text-right text-orange-600">
                    {p.investment > 0 ? `-${formatUSD(p.investment)}` : '-'}
                  </TableCell>
                )}
                <TableCell className={cn(
                  "text-right font-medium",
                  p.closingBalance < 0 ? "text-destructive" : "text-foreground"
                )}>
                  {formatUSD(p.closingBalance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function BurnRateCard({ burnAnalysis, currentCash, className }: BurnRateCardProps) {
  const isGeneratingCash = burnAnalysis.netBurnRate < 0;
  const hasDeficit = burnAnalysis.cashDeficitWithoutInvestment > 0;
  
  // Get year-end values
  const withInvestmentYearEnd = burnAnalysis.quarterlyProjectionsWithInvestment[3]?.closingBalance || 0;
  const withoutInvestmentYearEnd = burnAnalysis.quarterlyProjectionsWithoutInvestment[3]?.closingBalance || 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Burn Rate Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Mevcut Nakit</span>
            </div>
            <p className="text-2xl font-bold">{formatUSD(currentCash)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flame className="h-4 w-4" />
              <span className="text-sm">Aylık Net Burn</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              isGeneratingCash ? "text-green-600" : "text-red-600"
            )}>
              {isGeneratingCash ? '+' : ''}{formatUSD(-burnAnalysis.netBurnRate)}/ay
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isGeneratingCash ? 'Nakit üretimi' : 'Nakit yakımı'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {withInvestmentYearEnd >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">Yıl Sonu (Yatırımlı)</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              withInvestmentYearEnd >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatUSD(withInvestmentYearEnd)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {hasDeficit ? (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              <span className="text-sm">Yıl Sonu (Yatırımsız)</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              withoutInvestmentYearEnd >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatUSD(withoutInvestmentYearEnd)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasDeficit 
                ? `${formatUSD(burnAnalysis.cashDeficitWithoutInvestment)} açık` 
                : `${formatUSD(burnAnalysis.cashSurplusWithoutInvestment)} fazla`
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Quarter Warning */}
      {burnAnalysis.criticalQuarter && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  Kritik Nokta: {burnAnalysis.criticalQuarter}
                </p>
                <p className="text-sm text-muted-foreground">
                  Bu çeyrekte nakit bakiyesi minimum seviyeye düşüyor. 
                  Yatırım veya finansman bu noktadan önce sağlanmalı.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quarterly Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Yatırım Dahil Senaryo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuarterlyTable 
              projections={burnAnalysis.quarterlyProjectionsWithInvestment}
              title=""
              variant="with"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Yatırım Hariç Senaryo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuarterlyTable 
              projections={burnAnalysis.quarterlyProjectionsWithoutInvestment}
              title=""
              variant="without"
            />
          </CardContent>
        </Card>
      </div>

      {/* Comparison Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Senaryo Karşılaştırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Metrik</TableHead>
                  <TableHead className="text-right">Yatırım Dahil</TableHead>
                  <TableHead className="text-right">Yatırım Hariç</TableHead>
                  <TableHead className="text-right">Fark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Yıl Sonu Bakiye</TableCell>
                  <TableCell className={cn(
                    "text-right",
                    withInvestmentYearEnd >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatUSD(withInvestmentYearEnd)}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right",
                    withoutInvestmentYearEnd >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatUSD(withoutInvestmentYearEnd)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatUSD(withInvestmentYearEnd - withoutInvestmentYearEnd)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Runway</TableCell>
                  <TableCell className="text-right">
                    {burnAnalysis.runwayMonths > 24 ? '24+ ay' : `${burnAnalysis.runwayMonths} ay`}
                  </TableCell>
                  <TableCell className="text-right">
                    {!hasDeficit ? '∞' : `${Math.max(0, Math.floor(currentCash / burnAnalysis.grossBurnRate))} ay`}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
