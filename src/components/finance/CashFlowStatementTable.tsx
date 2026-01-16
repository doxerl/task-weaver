import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, Building2, Landmark, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatFullTRY } from '@/lib/formatters';
import type { CashFlowStatement } from '@/hooks/finance/useCashFlowStatement';

// Format currency for TRY
const formatCurrency = (value: number) => formatFullTRY(value);

interface CashFlowStatementTableProps {
  data: CashFlowStatement;
  year: number;
}

interface LineItemProps {
  label: string;
  amount: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  prefix?: '+' | '-' | '';
  indent?: boolean;
}

function LineItem({ label, amount, isSubtotal, isTotal, prefix = '', indent }: LineItemProps) {
  const isPositive = amount >= 0;
  const displayAmount = Math.abs(amount);
  
  const textClass = isTotal 
    ? 'font-bold text-base' 
    : isSubtotal 
      ? 'font-semibold text-sm' 
      : 'text-sm';
  
  const bgClass = isTotal 
    ? 'bg-muted/50' 
    : isSubtotal 
      ? 'bg-muted/30' 
      : '';

  const amountColor = isTotal || isSubtotal
    ? isPositive ? 'text-emerald-600' : 'text-rose-600'
    : 'text-foreground';

  return (
    <div className={`flex justify-between items-center py-2 px-3 ${bgClass} rounded-sm`}>
      <span className={`${textClass} ${indent ? 'pl-4' : ''}`}>{label}</span>
      <span className={`${textClass} ${amountColor} tabular-nums`}>
        {prefix && amount !== 0 && (
          <span className="text-muted-foreground mr-1">
            {amount > 0 ? '(+)' : '(-)'}
          </span>
        )}
        {!isPositive && !isTotal && !isSubtotal && '('}
        {formatCurrency(displayAmount)}
        {!isPositive && !isTotal && !isSubtotal && ')'}
      </span>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  total: number;
  children: React.ReactNode;
}

function Section({ title, icon, total, children }: SectionProps) {
  const isPositive = total >= 0;
  
  return (
    <Card className="border-l-4 border-l-primary/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {children}
        <Separator className="my-2" />
        <div className="flex justify-between items-center py-2 px-3 bg-primary/5 rounded-md">
          <span className="font-semibold text-sm flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
            Net Nakit Akışı
          </span>
          <span className={`font-bold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function CashFlowStatementTable({ data, year }: CashFlowStatementTableProps) {
  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Nakit Akış Tablosu</h2>
          <p className="text-sm text-muted-foreground">Dolaylı Yöntem (Indirect Method) - {year}</p>
        </div>
        <Badge variant={data.isBalanced ? 'default' : 'destructive'} className="flex items-center gap-1">
          {data.isBalanced ? (
            <>
              <CheckCircle2 className="h-3 w-3" />
              Dengeli
            </>
          ) : (
            <>
              <AlertTriangle className="h-3 w-3" />
              Fark: {formatCurrency(data.difference)}
            </>
          )}
        </Badge>
      </div>

      {/* A. İşletme Faaliyetleri */}
      <Section
        title="A. İŞLETME FAALİYETLERİNDEN NAKİT AKIŞLARI"
        icon={<Building2 className="h-4 w-4" />}
        total={data.operating.total}
      >
        <LineItem label="Dönem Net Kârı" amount={data.operating.netProfit} />
        <div className="text-xs text-muted-foreground px-3 py-1 bg-muted/20 rounded">
          Nakit Dışı Kalemler ve İşletme Sermayesi Düzeltmeleri:
        </div>
        <LineItem label="Amortisman ve İtfa Payları" amount={data.operating.depreciation} prefix="+" indent />
        <LineItem label="Ticari Alacaklardaki Değişim" amount={data.operating.receivablesChange} prefix={data.operating.receivablesChange >= 0 ? '+' : '-'} indent />
        <LineItem label="Ticari Borçlardaki Değişim" amount={data.operating.payablesChange} prefix={data.operating.payablesChange >= 0 ? '+' : '-'} indent />
        <LineItem label="Personel Borçlarındaki Değişim" amount={data.operating.personnelChange} prefix={data.operating.personnelChange >= 0 ? '+' : '-'} indent />
        <LineItem label="Ödenecek Vergi Değişimi" amount={data.operating.taxPayablesChange} prefix={data.operating.taxPayablesChange >= 0 ? '+' : '-'} indent />
        <LineItem label="Ödenecek SGK Değişimi" amount={data.operating.socialSecurityChange} prefix={data.operating.socialSecurityChange >= 0 ? '+' : '-'} indent />
        <LineItem label="Stoklardaki Değişim" amount={data.operating.inventoryChange} prefix={data.operating.inventoryChange >= 0 ? '+' : '-'} indent />
        <LineItem label="KDV Alacak/Borç Değişimi" amount={data.operating.vatChange} prefix={data.operating.vatChange >= 0 ? '+' : '-'} indent />
      </Section>

      {/* B. Yatırım Faaliyetleri */}
      <Section
        title="B. YATIRIM FAALİYETLERİNDEN NAKİT AKIŞLARI"
        icon={<TrendingUp className="h-4 w-4" />}
        total={data.investing.total}
      >
        {data.investing.vehiclePurchases > 0 && (
          <LineItem label="Taşıt Alımları" amount={-data.investing.vehiclePurchases} prefix="-" />
        )}
        {data.investing.equipmentPurchases > 0 && (
          <LineItem label="Ekipman Alımları" amount={-data.investing.equipmentPurchases} prefix="-" />
        )}
        {data.investing.fixturePurchases > 0 && (
          <LineItem label="Demirbaş Alımları" amount={-data.investing.fixturePurchases} prefix="-" />
        )}
        {data.investing.vehiclePurchases === 0 && data.investing.equipmentPurchases === 0 && data.investing.fixturePurchases === 0 && (
          <div className="text-sm text-muted-foreground px-3 py-2 italic">
            Bu dönemde yatırım hareketi bulunmamaktadır.
          </div>
        )}
      </Section>

      {/* C. Finansman Faaliyetleri */}
      <Section
        title="C. FİNANSMAN FAALİYETLERİNDEN NAKİT AKIŞLARI"
        icon={<Landmark className="h-4 w-4" />}
        total={data.financing.total}
      >
        {data.financing.loanProceeds > 0 && (
          <LineItem label="Kredi Kullanımı" amount={data.financing.loanProceeds} prefix="+" />
        )}
        {data.financing.loanRepayments > 0 && (
          <LineItem label="Kredi Geri Ödemeleri" amount={-data.financing.loanRepayments} prefix="-" />
        )}
        {data.financing.leasingPayments > 0 && (
          <LineItem label="Leasing Ödemeleri" amount={-data.financing.leasingPayments} prefix="-" />
        )}
        <Separator className="my-1" />
        <div className="flex items-center gap-2 px-3 py-1">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Ortak İşlemleri</span>
        </div>
        {data.financing.partnerDeposits > 0 && (
          <LineItem label="Ortaktan Gelen" amount={data.financing.partnerDeposits} prefix="+" indent />
        )}
        {data.financing.partnerWithdrawals > 0 && (
          <LineItem label="Ortağa Ödeme" amount={-data.financing.partnerWithdrawals} prefix="-" indent />
        )}
        {data.financing.capitalIncrease > 0 && (
          <LineItem label="Sermaye Artırımı" amount={data.financing.capitalIncrease} prefix="+" />
        )}
      </Section>

      {/* Özet Kart */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="pt-6 space-y-3">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">İşletme</p>
              <p className={`font-bold ${data.operating.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(data.operating.total)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Yatırım</p>
              <p className={`font-bold ${data.investing.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(data.investing.total)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Finansman</p>
              <p className={`font-bold ${data.financing.total >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(data.financing.total)}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Nakitteki Net Değişim</span>
              <span className={`font-bold text-lg ${data.netCashChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(data.netCashChange)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Dönem Başı Nakit</span>
              <span className="tabular-nums">{formatCurrency(data.openingCash)}</span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between items-center">
              <span className="font-bold">DÖNEM SONU NAKİT</span>
              <span className={`font-bold text-xl ${data.closingCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(data.closingCash)}
              </span>
            </div>
          </div>

          {!data.isBalanced && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Denklem Uyumsuzluğu</p>
                  <p className="text-amber-700 text-xs mt-1">
                    Beklenen: {formatCurrency(data.expectedClosingCash)} | 
                    Fark: {formatCurrency(data.difference)}
                  </p>
                  <p className="text-amber-600 text-xs mt-1">
                    Bu fark, kategorize edilmemiş işlemler veya önceki yıl verilerindeki eksikliklerden kaynaklanabilir.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
