import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import { DealSimulatorCard, CashAnalysis, ExitPlanYear5 } from './DealSimulatorCard';
import { FocusProjectSelector } from './FocusProjectSelector';
import { ProjectionItem, InvestmentAllocation, DealConfig } from '@/types/simulation';

export interface InvestmentConfigPanelProps {
  // Deal Simulator props
  cashAnalysis: CashAnalysis;
  scenarioType: 'positive' | 'negative';
  currentRevenue: number;
  investmentAmount: number;
  equityPercentage: number;
  sectorMultiple: number;
  valuationType: 'pre-money' | 'post-money';
  dealSimulatorOpen: boolean;
  onInvestmentAmountChange: (amount: number) => void;
  onEquityPercentageChange: (percentage: number) => void;
  onSectorMultipleChange: (multiple: number) => void;
  onValuationTypeChange: (type: 'pre-money' | 'post-money') => void;
  onDealSimulatorOpenChange: (open: boolean) => void;
  exitPlanYear5?: ExitPlanYear5;

  // Focus Project Selector props
  revenues: ProjectionItem[];
  focusProjects: string[];
  focusProjectPlan: string;
  investmentAllocation: InvestmentAllocation;
  onFocusProjectsChange: (projects: string[]) => void;
  onFocusProjectPlanChange: (plan: string) => void;
  onInvestmentAllocationChange: (allocation: InvestmentAllocation) => void;

  // Panel state
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvestmentConfigPanel: React.FC<InvestmentConfigPanelProps> = ({
  // Deal Simulator props
  cashAnalysis,
  scenarioType,
  currentRevenue,
  investmentAmount,
  equityPercentage,
  sectorMultiple,
  valuationType,
  dealSimulatorOpen,
  onInvestmentAmountChange,
  onEquityPercentageChange,
  onSectorMultipleChange,
  onValuationTypeChange,
  onDealSimulatorOpenChange,
  exitPlanYear5,

  // Focus Project Selector props
  revenues,
  focusProjects,
  focusProjectPlan,
  investmentAllocation,
  onFocusProjectsChange,
  onFocusProjectPlanChange,
  onInvestmentAllocationChange,

  // Panel state
  isOpen,
  onOpenChange,
}) => {
  const { t } = useTranslation(['simulation', 'common']);

  const hasConfig = focusProjects.length > 0 || investmentAmount > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <Card className="border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-sm">
                    {t('simulation:investmentConfig.title')}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t('simulation:investmentConfig.description')}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasConfig && (
                  <Badge variant="secondary" className="text-xs">
                    {focusProjects.length > 0 && `${focusProjects.length} ${t('simulation:investmentConfig.projectsSelected')}`}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Deal Simulator Card */}
              <DealSimulatorCard
                cashAnalysis={cashAnalysis}
                scenarioType={scenarioType}
                currentRevenue={currentRevenue}
                investmentAmount={investmentAmount}
                equityPercentage={equityPercentage}
                sectorMultiple={sectorMultiple}
                valuationType={valuationType}
                isOpen={dealSimulatorOpen}
                onInvestmentAmountChange={onInvestmentAmountChange}
                onEquityPercentageChange={onEquityPercentageChange}
                onSectorMultipleChange={onSectorMultipleChange}
                onValuationTypeChange={onValuationTypeChange}
                onOpenChange={onDealSimulatorOpenChange}
                exitPlanYear5={exitPlanYear5}
                businessModel="SAAS"
              />

              {/* Focus Project Selector */}
              <FocusProjectSelector
                revenues={revenues}
                focusProjects={focusProjects}
                focusProjectPlan={focusProjectPlan}
                investmentAllocation={investmentAllocation}
                onFocusProjectsChange={onFocusProjectsChange}
                onFocusProjectPlanChange={onFocusProjectPlanChange}
                onInvestmentAllocationChange={onInvestmentAllocationChange}
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default InvestmentConfigPanel;
