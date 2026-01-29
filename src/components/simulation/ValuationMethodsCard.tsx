import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  BarChart3, 
  TrendingUp, 
  Rocket,
  Scale
} from 'lucide-react';
import { ValuationBreakdown, ValuationConfiguration } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { DEFAULT_VALUATION_CONFIG } from '@/lib/valuationCalculator';

interface ValuationMethodsCardProps {
  valuations: ValuationBreakdown;
  sectorMultiple: number;
  ebitdaMultiple: number;
  config?: ValuationConfiguration;
  year5Label?: string;
}

export const ValuationMethodsCard: React.FC<ValuationMethodsCardProps> = ({
  valuations,
  sectorMultiple,
  ebitdaMultiple,
  config = DEFAULT_VALUATION_CONFIG,
  year5Label = '5. Yıl'
}) => {
  const weights = config.weights;
  
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Değerleme Metodları Karşılaştırması
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Revenue Multiple */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">Ciro Çarpanı</span>
            </div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCompactUSD(valuations.revenueMultiple)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Ciro x {sectorMultiple}x
            </div>
            <Badge variant="secondary" className="mt-1 text-[10px]">
              Ağırlık: %{(weights.revenueMultiple * 100).toFixed(0)}
            </Badge>
          </div>
          
          {/* EBITDA Multiple */}
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium">EBITDA Çarpanı</span>
            </div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {formatCompactUSD(valuations.ebitdaMultiple)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              EBITDA x {ebitdaMultiple}x
            </div>
            <Badge variant="secondary" className="mt-1 text-[10px]">
              Ağırlık: %{(weights.ebitdaMultiple * 100).toFixed(0)}
            </Badge>
          </div>
          
          {/* DCF */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium">DCF</span>
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCompactUSD(valuations.dcf)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              İskonto: %{(config.discountRate * 100).toFixed(0)}
            </div>
            <Badge variant="secondary" className="mt-1 text-[10px]">
              Ağırlık: %{(weights.dcf * 100).toFixed(0)}
            </Badge>
          </div>
          
          {/* VC Method */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium">VC Metodu</span>
            </div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatCompactUSD(valuations.vcMethod)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Exit / {config.expectedROI}x ROI
            </div>
            <Badge variant="secondary" className="mt-1 text-[10px]">
              Ağırlık: %{(weights.vcMethod * 100).toFixed(0)}
            </Badge>
          </div>
        </div>
        
        {/* Weighted Result */}
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">Ağırlıklı Değerleme ({year5Label})</span>
              <p className="text-xs text-muted-foreground mt-1">
                4 farklı metodun ağırlıklı ortalaması
              </p>
            </div>
            <span className="text-2xl font-bold text-primary">
              {formatCompactUSD(valuations.weighted)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
