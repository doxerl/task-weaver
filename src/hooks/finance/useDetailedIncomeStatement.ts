import { useMemo } from 'react';
import { useIncomeStatement } from './useIncomeStatement';
import { DetailedIncomeStatementLine, DetailedIncomeStatementData } from '@/types/reports';

const COMPANY_NAME = 'ALFA ZEN EĞİTİM VE DENETİM DANIŞMANLIK LİMİTED ŞİRKETİ';

export function useDetailedIncomeStatement(year: number) {
  const { statement, isLoading } = useIncomeStatement(year);

  const data = useMemo((): DetailedIncomeStatementData => {
    const lines: DetailedIncomeStatementLine[] = [];

    // A - BRÜT SATIŞLAR
    lines.push({ code: 'A', name: 'BRÜT SATIŞLAR', totalAmount: statement.grossSales.total, isHeader: true, isBold: true });
    if (statement.grossSales.sbt > 0) lines.push({ code: '1', name: 'Yurtiçi Satışlar - SBT', subAmount: statement.grossSales.sbt, isSubItem: true });
    if (statement.grossSales.ls > 0) lines.push({ code: '2', name: 'Yurtiçi Satışlar - LS', subAmount: statement.grossSales.ls, isSubItem: true });
    if (statement.grossSales.zdhc > 0) lines.push({ code: '3', name: 'Yurtiçi Satışlar - ZDHC', subAmount: statement.grossSales.zdhc, isSubItem: true });
    if (statement.grossSales.danis > 0) lines.push({ code: '4', name: 'Yurtiçi Satışlar - Danışmanlık', subAmount: statement.grossSales.danis, isSubItem: true });
    if (statement.grossSales.diger > 0) lines.push({ code: '5', name: 'Diğer Gelirler', subAmount: statement.grossSales.diger, isSubItem: true });

    // B - SATIŞ İNDİRİMLERİ
    if (statement.salesReturns !== 0) {
      lines.push({ code: 'B', name: 'SATIŞ İNDİRİMLERİ (-)', totalAmount: -Math.abs(statement.salesReturns), isHeader: true, isBold: true, isNegative: true });
      lines.push({ code: '1', name: 'Satıştan İadeler (-)', subAmount: -Math.abs(statement.salesReturns), isSubItem: true, isNegative: true });
    }

    // C - NET SATIŞLAR
    lines.push({ code: 'C', name: 'NET SATIŞLAR', totalAmount: statement.netSales, isHeader: true, isBold: true });

    // D - SATIŞLARIN MALİYETİ
    if (statement.costOfSales !== 0) {
      lines.push({ code: 'D', name: 'SATIŞLARIN MALİYETİ (-)', totalAmount: -Math.abs(statement.costOfSales), isHeader: true, isBold: true, isNegative: true });
      lines.push({ code: '3', name: 'Satılan Hizmet Maliyeti (-)', subAmount: -Math.abs(statement.costOfSales), isSubItem: true, isNegative: true });
    }

    // BRÜT SATIŞ KÂRI
    lines.push({ code: '', name: 'BRÜT SATIŞ KARI VEYA ZARARI', totalAmount: statement.grossProfit, isBold: true });

    // E - FAALİYET GİDERLERİ
    const opExpTotal = statement.operatingExpenses.total;
    lines.push({ code: 'E', name: 'FAALİYET GİDERLERİ (-)', totalAmount: -Math.abs(opExpTotal), isHeader: true, isBold: true, isNegative: true });
    
    // Operating expense sub-items
    const opExpItems = [
      { code: '1', name: 'Personel Giderleri (-)', amount: statement.operatingExpenses.personel },
      { code: '2', name: 'Kira Giderleri (-)', amount: statement.operatingExpenses.kira },
      { code: '3', name: 'Ulaşım Giderleri (-)', amount: statement.operatingExpenses.ulasim },
      { code: '4', name: 'İletişim Giderleri (-)', amount: statement.operatingExpenses.telekom },
      { code: '5', name: 'Sigorta Giderleri (-)', amount: statement.operatingExpenses.sigorta },
      { code: '6', name: 'Ofis Giderleri (-)', amount: statement.operatingExpenses.ofis },
      { code: '7', name: 'Muhasebe/Danışmanlık Giderleri (-)', amount: statement.operatingExpenses.muhasebe },
      { code: '8', name: 'Yazılım/Teknoloji Giderleri (-)', amount: statement.operatingExpenses.yazilim },
      { code: '9', name: 'Banka/Komisyon Giderleri (-)', amount: statement.operatingExpenses.banka },
      { code: '10', name: 'Diğer Genel Yönetim Giderleri (-)', amount: statement.operatingExpenses.diger },
    ];
    
    opExpItems.forEach(item => {
      if (item.amount !== 0) {
        lines.push({ code: item.code, name: item.name, subAmount: -Math.abs(item.amount), isSubItem: true, isNegative: true });
      }
    });

    // FAALİYET KÂRI
    lines.push({ code: '', name: 'FAALİYET KARI VEYA ZARARI', totalAmount: statement.operatingProfit, isBold: true });

    // F - DİĞER FAALİYET GELİRLERİ
    const otherIncomeTotal = statement.otherIncome.total;
    if (otherIncomeTotal !== 0) {
      lines.push({ code: 'F', name: 'DİĞ. FAAL. OLAĞAN GELİR VE KARLAR', totalAmount: otherIncomeTotal, isHeader: true, isBold: true });
      if (statement.otherIncome.faiz !== 0) {
        lines.push({ code: '3', name: 'Faiz Gelirleri', subAmount: statement.otherIncome.faiz, isSubItem: true });
      }
      if (statement.otherIncome.kurFarki !== 0) {
        lines.push({ code: '7', name: 'Kambiyo Karları', subAmount: statement.otherIncome.kurFarki, isSubItem: true });
      }
    }

    // G - DİĞER FAALİYET GİDERLERİ (skip if zero)
    const otherExpenseTotal = statement.otherExpenses.total;
    if (otherExpenseTotal !== 0) {
      lines.push({ code: 'G', name: 'DİĞER FAALİYET GİDERLERİ (-)', totalAmount: -Math.abs(otherExpenseTotal), isHeader: true, isBold: true, isNegative: true });
      if (statement.otherExpenses.kurFarki !== 0) {
        lines.push({ code: '7', name: 'Kambiyo Zararları (-)', subAmount: -Math.abs(statement.otherExpenses.kurFarki), isSubItem: true, isNegative: true });
      }
    }

    // H - FİNANSMAN GİDERLERİ
    const financeExpense = statement.otherExpenses.faiz;
    if (financeExpense !== 0) {
      lines.push({ code: 'H', name: 'FİNANSMAN GİDERLERİ (-)', totalAmount: -Math.abs(financeExpense), isHeader: true, isBold: true, isNegative: true });
      lines.push({ code: '1', name: 'Kısa Vadeli Borçlanma Giderleri (-)', subAmount: -Math.abs(financeExpense), isSubItem: true, isNegative: true });
    }

    // OLAĞAN KÂR
    const ordinaryProfit = statement.operatingProfit + otherIncomeTotal - otherExpenseTotal - financeExpense;
    lines.push({ code: '', name: 'OLAĞAN KAR VEYA ZARAR', totalAmount: ordinaryProfit, isBold: true });

    // I - OLAĞANDIŞI GELİRLER (placeholder)
    // J - OLAĞANDIŞI GİDERLER (placeholder)

    // DÖNEM KÂRI
    lines.push({ code: '', name: 'DÖNEM KARI VEYA ZARARI', totalAmount: statement.preTaxProfit, isBold: true });

    // K - VERGİ
    if (statement.taxExpense !== 0) {
      lines.push({ code: 'K', name: "DÖN. KARI VERGİ VE Dİ.YA.YÜK.KAR.(-)", totalAmount: -Math.abs(statement.taxExpense), isHeader: true, isBold: true, isNegative: true });
    } else {
      lines.push({ code: 'K', name: "DÖN. KARI VERGİ VE Dİ.YA.YÜK.KAR.(-)", totalAmount: 0, isHeader: true, isBold: true });
    }

    // DÖNEM NET KÂRI
    lines.push({ code: '', name: 'DÖNEM NET KARI VEYA ZARARI', totalAmount: statement.netProfit, isBold: true });

    return {
      companyName: COMPANY_NAME,
      periodStart: `01.01.${year}`,
      periodEnd: `31.12.${year}`,
      year,
      lines,
    };
  }, [statement, year]);

  return { data, isLoading };
}
