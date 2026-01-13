import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCurrency, CurrencyType } from '@/contexts/CurrencyContext';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CurrencyToggleProps {
  year?: number;
  className?: string;
}

export function CurrencyToggle({ year, className }: CurrencyToggleProps) {
  const { 
    currency, 
    setCurrency, 
    rates, 
    isLoading,
    getAvailableMonthsCount,
  } = useCurrency();
  
  const currentYear = year ?? new Date().getFullYear();
  const availableMonths = getAvailableMonthsCount(currentYear);
  const hasAnyRates = availableMonths > 0;
  
  const handleChange = (value: string) => {
    if (value) {
      setCurrency(value as CurrencyType);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Kurlar...</span>
      </div>
    );
  }

  return (
    <ToggleGroup 
      type="single" 
      value={currency} 
      onValueChange={handleChange}
      className={className}
    >
      <ToggleGroupItem 
        value="TRY" 
        aria-label="Türk Lirası"
        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3"
      >
        ₺ TRY
      </ToggleGroupItem>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <ToggleGroupItem 
              value="USD" 
              aria-label="ABD Doları"
              disabled={!hasAnyRates}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 disabled:opacity-50"
            >
              $ USD
            </ToggleGroupItem>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {hasAnyRates 
            ? `${currentYear} için ${availableMonths}/12 ay kur verisi mevcut`
            : `${currentYear} için kur verisi bulunmuyor`
          }
        </TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}
