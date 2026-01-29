import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatFullTRY } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface SubAccount {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
}

interface AccountDetailRowProps {
  code: string;
  name: string;
  debit: number;
  credit: number;
  debitBalance: number;
  creditBalance: number;
  subAccounts?: SubAccount[];
}

export function AccountDetailRow({
  code,
  name,
  debit,
  credit,
  debitBalance,
  creditBalance,
  subAccounts = [],
}: AccountDetailRowProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasSubAccounts = subAccounts.length > 0;

  if (!hasSubAccounts) {
    return (
      <TableRow>
        <TableCell className="font-mono pl-6">{code}</TableCell>
        <TableCell>{name}</TableCell>
        <TableCell className="text-right">{formatFullTRY(debit)}</TableCell>
        <TableCell className="text-right">{formatFullTRY(credit)}</TableCell>
        <TableCell className="text-right">{formatFullTRY(debitBalance)}</TableCell>
        <TableCell className="text-right">{formatFullTRY(creditBalance)}</TableCell>
      </TableRow>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setIsOpen(!isOpen)}>
        <TableCell className="font-mono">
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-1">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {code}
            </div>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell>
          <div>
            {name}
            <span className="text-xs text-muted-foreground ml-2">
              ({subAccounts.length} alt hesap)
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right font-medium">{formatFullTRY(debit)}</TableCell>
        <TableCell className="text-right font-medium">{formatFullTRY(credit)}</TableCell>
        <TableCell className="text-right font-medium">{formatFullTRY(debitBalance)}</TableCell>
        <TableCell className="text-right font-medium">{formatFullTRY(creditBalance)}</TableCell>
      </TableRow>
      <CollapsibleContent asChild>
        <>
          {subAccounts.map((sub) => (
            <TableRow key={sub.code} className="bg-muted/30">
              <TableCell className="font-mono pl-8 text-sm text-muted-foreground">
                {sub.code}
              </TableCell>
              <TableCell className="text-sm pl-4">{sub.name}</TableCell>
              <TableCell className="text-right text-sm">{formatFullTRY(sub.debit)}</TableCell>
              <TableCell className="text-right text-sm">{formatFullTRY(sub.credit)}</TableCell>
              <TableCell className="text-right text-sm">{formatFullTRY(sub.debitBalance)}</TableCell>
              <TableCell className="text-right text-sm">{formatFullTRY(sub.creditBalance)}</TableCell>
            </TableRow>
          ))}
        </>
      </CollapsibleContent>
    </Collapsible>
  );
}
