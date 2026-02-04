import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DollarSign,
  AlertTriangle,
  PiggyBank,
  Percent,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SECTOR_MULTIPLES,
  DEFAULT_DILUTION_CONFIG,
} from '@/types/simulation';
import { calculateMOICWithDilution } from '@/lib/valuationService';
import { formatCompactUSD } from '@/lib/formatters';
import { 
  STARTUP_GROWTH_PROFILES, 
  calculateDecayYear5Revenue, 
  type BusinessModel 
} from '@/constants/simulation';

export interface CashAnalysis {
  deathValley: number;
  deathValleyQuarter: string;
  yearEndCash: number;
  needsInvestment: boolean;
  suggestedInvestment: number;
  monthlyBurn: number;
}

/** ExitPlan Year 5 projection data */
export interface ExitPlanYear5 {
  revenue: number;
  companyValuation: number;
  appliedGrowthRate?: number;
}

export interface DealSimulatorCardProps {
  // Cash analysis data
  cashAnalysis: CashAnalysis;
  scenarioType: 'positive' | 'negative';
  currentRevenue: number;

  // Deal configuration state
  investmentAmount: number;
  equityPercentage: number;
  sectorMultiple: number;
  valuationType: 'pre-money' | 'post-money';
  isOpen: boolean;

  // Callbacks
  onInvestmentAmountChange: (amount: number) => void;
  onEquityPercentageChange: (percentage: number) => void;
  onSectorMultipleChange: (multiple: number) => void;
  onValuationTypeChange: (type: 'pre-money' | 'post-money') => void;
  onOpenChange: (open: boolean) => void;

  // NEW: ExitPlan Year 5 projection (preferred source)
  exitPlanYear5?: ExitPlanYear5;
  
  // NEW: Business model for fallback decay calculation
  businessModel?: BusinessModel;

  // Optional: className for styling
  className?: string;
}

export const DealSimulatorCard: React.FC<DealSimulatorCardProps> = ({
  cashAnalysis,
  scenarioType,
  currentRevenue,
  investmentAmount,
  equityPercentage,
  sectorMultiple,
  valuationType,
  isOpen,
  onInvestmentAmountChange,
  onEquityPercentageChange,
  onSectorMultipleChange,
  onValuationTypeChange,
  onOpenChange,
  exitPlanYear5,
  businessModel = 'SAAS',
  className,
}) => {
  const { t } = useTranslation(['simulation', 'common']);

  // Calculate deal metrics with dynamic growth model
  const dealMetrics = useMemo(() => {
    // Post-money calculation
    const postMoneyValuation = investmentAmount / (equityPercentage / 100);
    const preMoneyValuation = postMoneyValuation - investmentAmount;

    // If user selected pre-money, recalculate
    let effectivePreMoney = preMoneyValuation;
    let effectivePostMoney = postMoneyValuation;
    let effectiveEquity = equityPercentage;

    if (valuationType === 'pre-money') {
      // User entered pre-money, calculate post-money and equity
      effectivePreMoney = postMoneyValuation; // Treat input as pre-money
      effectivePostMoney = effectivePreMoney + investmentAmount;
      effectiveEquity = (investmentAmount / effectivePostMoney) * 100;
    }

    // =====================================================
    // 5-YEAR EXIT VALUE - DYNAMIC GROWTH MODEL
    // =====================================================
    let year5Revenue: number;
    let year5ExitValue: number;
    let projectionSource: 'exitPlan' | 'decayModel';

    if (exitPlanYear5 && exitPlanYear5.companyValuation > 0) {
      // Priority 1: Use ExitPlan projection (most accurate)
      year5Revenue = exitPlanYear5.revenue;
      year5ExitValue = exitPlanYear5.companyValuation;
      projectionSource = 'exitPlan';
    } else {
      // Fallback: Use Startup Decay Growth Model
      year5Revenue = calculateDecayYear5Revenue(currentRevenue, businessModel);
      year5ExitValue = year5Revenue * sectorMultiple;
      projectionSource = 'decayModel';
    }

    // MOIC with dilution
    const moicResult = calculateMOICWithDilution(
      investmentAmount,
      effectiveEquity,
      year5ExitValue,
      DEFAULT_DILUTION_CONFIG,
      5
    );

    // Founder dilution calculation
    const founderPreInvestment = 100;
    const founderPostInvestment = founderPreInvestment - effectiveEquity;
    const founderPostESOP = founderPostInvestment * (1 - DEFAULT_DILUTION_CONFIG.esopPoolSize);

    return {
      preMoneyValuation: effectivePreMoney,
      postMoneyValuation: effectivePostMoney,
      effectiveEquity,
      year5Revenue,
      year5ExitValue,
      projectionSource,
      moicNoDilution: moicResult.moicNoDilution,
      moicWithDilution: moicResult.moicWithDilution,
      investorProceeds: moicResult.investorProceeds,
      ownershipAtExit: moicResult.ownershipAtExit,
      irrEstimate: moicResult.irrEstimate,
      founderPreInvestment,
      founderPostInvestment,
      founderPostESOP,
    };
  }, [investmentAmount, equityPercentage, sectorMultiple, valuationType, currentRevenue, exitPlanYear5, businessModel]);

  // Don't render if not needed
  if (!cashAnalysis.needsInvestment && scenarioType !== 'positive') {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card className={`border-2 ${
        cashAnalysis.needsInvestment
          ? 'border-red-500/50 bg-red-500/5'
          : 'border-blue-500/30 bg-blue-500/5'
      } ${className || ''}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {cashAnalysis.needsInvestment ? (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                ) : (
                  <PiggyBank className="h-5 w-5 text-blue-500" />
                )}
                <div>
                  <CardTitle className="text-sm">
                    {cashAnalysis.needsInvestment
                      ? t('simulation:investment.dealSimulator.title') + ' \u26A0\uFE0F'
                      : t('simulation:investment.dealSimulator.title')
                    }
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {cashAnalysis.needsInvestment ? (
                      <>
                        Death Valley: <span className="text-red-500 font-semibold">{formatCompactUSD(cashAnalysis.deathValley)}</span>
                        {' '}({cashAnalysis.deathValleyQuarter}) {'\u2022'}
                        {t('simulation:investment.dealSimulator.suggested')}: <span className="text-amber-500 font-semibold">{formatCompactUSD(cashAnalysis.suggestedInvestment)}</span>
                      </>
                    ) : (
                      t('simulation:investment.dealSimulator.description')
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cashAnalysis.needsInvestment && (
                  <Badge variant="destructive" className="text-xs">
                    {t('simulation:capital.notSelfSustaining')}
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Input Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Investment Amount */}
              <div className="space-y-2">
                <Label className="text-xs">{t('simulation:investment.dealSimulator.investmentAmount')}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => onInvestmentAmountChange(Number(e.target.value))}
                    className="pl-8 font-mono"
                  />
                </div>
                {cashAnalysis.needsInvestment && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => onInvestmentAmountChange(Math.round(cashAnalysis.suggestedInvestment))}
                  >
                    {t('simulation:investment.dealSimulator.suggestedAmount')}: {formatCompactUSD(cashAnalysis.suggestedInvestment)}
                  </Button>
                )}
              </div>

              {/* Equity Percentage */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  {t('simulation:investment.dealSimulator.equityRatio')}: {equityPercentage}%
                </Label>
                <Slider
                  value={[equityPercentage]}
                  onValueChange={([v]) => onEquityPercentageChange(v)}
                  min={5}
                  max={30}
                  step={1}
                  className="mt-3"
                />
                <p className="text-xs text-muted-foreground">
                  {valuationType === 'post-money' ? 'Post-Money' : 'Pre-Money'}: {formatCompactUSD(dealMetrics.postMoneyValuation)}
                </p>
              </div>

              {/* Valuation Type */}
              <div className="space-y-2">
                <Label className="text-xs">{t('simulation:investment.dealSimulator.valuation')} Tipi</Label>
                <Select value={valuationType} onValueChange={(v: 'pre-money' | 'post-money') => onValuationTypeChange(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post-money">Post-Money</SelectItem>
                    <SelectItem value="pre-money">Pre-Money</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {valuationType === 'post-money'
                    ? `Pre: ${formatCompactUSD(dealMetrics.preMoneyValuation)}`
                    : `Post: ${formatCompactUSD(dealMetrics.postMoneyValuation)}`
                  }
                </p>
              </div>

              {/* Sector Multiple */}
              <div className="space-y-2">
                <Label className="text-xs">{t('simulation:investment.dealSimulator.sectorMultiple')}</Label>
                <Select
                  value={String(sectorMultiple)}
                  onValueChange={(v) => onSectorMultipleChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SECTOR_MULTIPLES).map(([sector, multiple]) => (
                      <SelectItem key={sector} value={String(multiple)}>
                        {sector} ({multiple}x)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
              {/* Valuation Box */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">{t('simulation:investment.dealSimulator.postMoneyValuation')}</p>
                <p className="text-lg font-bold text-primary">{formatCompactUSD(dealMetrics.postMoneyValuation)}</p>
                <p className="text-xs text-muted-foreground">
                  Pre: {formatCompactUSD(dealMetrics.preMoneyValuation)}
                </p>
              </div>

              {/* Investor Return Box */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-xs text-muted-foreground mb-1">5Y MOIC (Dilution ile)</p>
                <p className="text-lg font-bold text-emerald-500">{dealMetrics.moicWithDilution.toFixed(1)}x</p>
                <p className="text-xs text-muted-foreground">
                  IRR: ~{dealMetrics.irrEstimate.toFixed(0)}%
                </p>
              </div>

              {/* Investor Proceeds Box */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-muted-foreground mb-1">Yatirimci 5Y Exit Getiri</p>
                <p className="text-lg font-bold text-blue-500">{formatCompactUSD(dealMetrics.investorProceeds)}</p>
                <p className="text-xs text-muted-foreground">
                  Exit Ownership: {dealMetrics.ownershipAtExit.toFixed(1)}%
                </p>
              </div>

              {/* Founder Dilution Box */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-xs text-muted-foreground mb-1">Kurucu Hissesi</p>
                <p className="text-lg font-bold text-amber-500">
                  %{dealMetrics.founderPreInvestment} {'\u2192'} %{dealMetrics.founderPostESOP.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ESOP sonrasi (10% havuz)
                </p>
              </div>
            </div>

            {/* Projection Model Transparency */}
            <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded flex flex-wrap gap-x-4 gap-y-1">
              <span>📊 {t('simulation:investment.dealSimulator.projectionModel')}: {dealMetrics.projectionSource === 'exitPlan' ? 'Two-Stage Growth' : 'Startup Decay'}</span>
              <span>📈 Year 5 {t('simulation:investment.dealSimulator.revenue')}: {formatCompactUSD(dealMetrics.year5Revenue)}</span>
              <span>🎯 Year 5 {t('simulation:investment.dealSimulator.valuation')}: {formatCompactUSD(dealMetrics.year5ExitValue)}</span>
            </div>

            {/* Warning for high dilution */}
            {dealMetrics.moicWithDilution < 3 && (
              <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 text-xs text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                MOIC 3x altinda - yatirimcilar icin cekicilik dusuk olabilir. Degerlemeyi veya cikis carpanini gozden gecirin.
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default DealSimulatorCard;
