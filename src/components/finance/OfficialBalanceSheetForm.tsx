import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Lock, Unlock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useYearlyBalanceSheet, YearlyBalanceSheet } from '@/hooks/finance/useYearlyBalanceSheet';
import { BALANCE_SHEET_GROUPS } from '@/types/officialFinance';
import { formatFullTRY } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface OfficialBalanceSheetFormProps {
  year: number;
}

type BalanceFormData = Partial<YearlyBalanceSheet>;

const getEmptyBalanceData = (): BalanceFormData => ({
  cash_on_hand: 0,
  bank_balance: 0,
  trade_receivables: 0,
  partner_receivables: 0,
  vat_receivable: 0,
  other_vat: 0,
  inventory: 0,
  vehicles: 0,
  fixtures: 0,
  equipment: 0,
  accumulated_depreciation: 0,
  trade_payables: 0,
  partner_payables: 0,
  personnel_payables: 0,
  tax_payables: 0,
  social_security_payables: 0,
  vat_payable: 0,
  deferred_tax_liabilities: 0,
  tax_provision: 0,
  short_term_loan_debt: 0,
  bank_loans: 0,
  paid_capital: 0,
  unpaid_capital: 0,
  retained_earnings: 0,
  current_profit: 0,
});

export function OfficialBalanceSheetForm({ year }: OfficialBalanceSheetFormProps) {
  const { 
    yearlyBalance, 
    isLoading, 
    isLocked,
    upsertBalance, 
    lockBalance, 
    isUpdating,
  } = useYearlyBalanceSheet(year);

  const emptyData = useMemo(() => getEmptyBalanceData(), []);
  const [formData, setFormData] = useState<BalanceFormData>(emptyData);

  // Initialize form with existing data
  useEffect(() => {
    if (yearlyBalance) {
      setFormData(yearlyBalance);
    } else {
      setFormData(emptyData);
    }
  }, [yearlyBalance, emptyData]);

  // Calculate totals
  const totals = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    BALANCE_SHEET_GROUPS.forEach(group => {
      group.accounts.forEach(account => {
        const value = (formData as Record<string, number>)[account.field] || 0;
        const adjustedValue = account.isNegative ? -value : value;
        
        if (group.type === 'asset') {
          totalAssets += adjustedValue;
        } else if (group.type === 'liability') {
          totalLiabilities += adjustedValue;
        } else if (group.type === 'equity') {
          totalEquity += adjustedValue;
        }
      });
    });

    const totalPassive = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalPassive) < 1; // Allow 1 TRY tolerance

    return { totalAssets, totalLiabilities, totalEquity, totalPassive, isBalanced };
  }, [formData]);

  const handleInputChange = (field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSave = () => {
    upsertBalance({
      ...formData,
      total_assets: totals.totalAssets,
      total_liabilities: totals.totalPassive,
    });
  };

  const handleLock = () => {
    upsertBalance({
      ...formData,
      total_assets: totals.totalAssets,
      total_liabilities: totals.totalPassive,
    });
    setTimeout(() => lockBalance(true), 500);
  };

  const handleUnlock = () => {
    lockBalance(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {year} Yılı Resmi Bilanço
              {isLocked && (
                <Badge variant="default" className="bg-green-600">
                  <Lock className="h-3 w-3 mr-1" />
                  Kilitli
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Tekdüzen hesap planına göre bilanço verilerini girin
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isLocked ? (
              <Button variant="outline" onClick={handleUnlock} disabled={isUpdating}>
                <Unlock className="h-4 w-4 mr-2" />
                Kilidi Aç
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleSave} disabled={isUpdating}>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </Button>
                <Button onClick={handleLock} disabled={isUpdating}>
                  <Lock className="h-4 w-4 mr-2" />
                  Kaydet ve Kilitle
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {BALANCE_SHEET_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx}>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              {group.title}
            </h3>
            <div className="grid gap-3">
              {group.accounts.map((account) => (
                <div key={account.code} className="flex items-center gap-3">
                  <Label className="w-8 text-xs text-muted-foreground">{account.code}</Label>
                  <Label className="w-56 text-sm">
                    {account.name}
                  </Label>
                  <div className="flex-1 max-w-xs">
                    <Input
                      type="text"
                      inputMode="decimal"
                      disabled={isLocked}
                      value={String((formData as Record<string, number>)[account.field] || '')}
                      onChange={(e) => handleInputChange(account.field, e.target.value)}
                      className="text-right"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">₺</span>
                </div>
              ))}
            </div>
            {groupIdx < BALANCE_SHEET_GROUPS.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}

        {/* Summary Section */}
        <Separator />
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            {totals.isBalanced ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            Bilanço Özeti
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between font-semibold border-b pb-1">
                <span>AKTİF (Varlıklar):</span>
                <span>{formatFullTRY(totals.totalAssets)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Kısa + Uzun Vadeli Borçlar:</span>
                <span>{formatFullTRY(totals.totalLiabilities)}</span>
              </div>
              <div className="flex justify-between">
                <span>Özkaynaklar:</span>
                <span>{formatFullTRY(totals.totalEquity)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>PASİF (Kaynaklar):</span>
                <span>{formatFullTRY(totals.totalPassive)}</span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t">
            <div className={`flex items-center gap-2 text-sm font-medium ${totals.isBalanced ? 'text-green-600' : 'text-amber-600'}`}>
              {totals.isBalanced ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Bilanço Dengeli (Aktif = Pasif)
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Bilanço Dengesiz! Fark: {formatFullTRY(Math.abs(totals.totalAssets - totals.totalPassive))}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
