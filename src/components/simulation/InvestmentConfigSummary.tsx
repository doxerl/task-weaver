import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, DollarSign, Percent, Settings, Megaphone, Users } from 'lucide-react';
import { InvestmentAllocation, DealConfig } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';

export interface InvestmentConfigSummaryProps {
  focusProjects: string[];
  focusProjectPlan: string;
  investmentAllocation: InvestmentAllocation;
  dealConfig?: DealConfig;
  scenarioName: string;
}

export const InvestmentConfigSummary: React.FC<InvestmentConfigSummaryProps> = ({
  focusProjects,
  focusProjectPlan,
  investmentAllocation,
  dealConfig,
  scenarioName,
}) => {
  const { t } = useTranslation(['simulation']);

  const hasConfig = focusProjects.length > 0 || dealConfig;

  if (!hasConfig) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('simulation:investmentConfig.noConfig')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const allocationItems = [
    { key: 'product', label: t('simulation:focusProject.productDev'), icon: Settings, value: investmentAllocation.product },
    { key: 'marketing', label: t('simulation:focusProject.marketing'), icon: Megaphone, value: investmentAllocation.marketing },
    { key: 'hiring', label: t('simulation:focusProject.personnel'), icon: Users, value: investmentAllocation.hiring },
    { key: 'operations', label: t('simulation:focusProject.operational'), icon: DollarSign, value: investmentAllocation.operations },
  ];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-sm">
              {t('simulation:comparison.savedConfigSummary')}
            </CardTitle>
            <CardDescription className="text-xs">
              {scenarioName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Focus Projects */}
        {focusProjects.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              {t('simulation:investmentConfig.focusProjects')}
            </p>
            <div className="flex flex-wrap gap-2">
              {focusProjects.map(project => (
                <Badge key={project} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  <Target className="h-3 w-3 mr-1" />
                  {project}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Deal Terms */}
        {dealConfig && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              {t('simulation:investmentConfig.dealTerms')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-muted/50 border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  {t('simulation:investment.dealSimulator.investmentAmount')}
                </div>
                <p className="text-sm font-semibold">{formatCompactUSD(dealConfig.investmentAmount)}</p>
              </div>
              <div className="p-2 rounded bg-muted/50 border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Percent className="h-3 w-3" />
                  {t('simulation:investment.dealSimulator.equityRatio')}
                </div>
                <p className="text-sm font-semibold">%{dealConfig.equityPercentage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Investment Allocation */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            {t('simulation:investmentConfig.allocation')}
          </p>
          <div className="space-y-1.5">
            {allocationItems.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-center gap-2">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs w-20 text-muted-foreground truncate">{item.label}</span>
                  <Progress value={item.value} className="h-1.5 flex-1" />
                  <span className="text-xs w-8 text-right">{item.value}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Growth Plan */}
        {focusProjectPlan && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              {t('simulation:investmentConfig.growthPlan')}
            </p>
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border italic">
              "{focusProjectPlan}"
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvestmentConfigSummary;
