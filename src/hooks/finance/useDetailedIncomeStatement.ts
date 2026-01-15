import { useMemo } from 'react';
import { useIncomeStatement } from './useIncomeStatement';
import { DetailedIncomeStatementLine, DetailedIncomeStatementData } from '@/types/reports';

const COMPANY_NAME = 'ALFA ZEN EĞİTİM VE DENETİM DANIŞMANLIK LİMİTED ŞİRKETİ';

export function useDetailedIncomeStatement(year: number) {
  const { statement, isLoading } = useIncomeStatement(year);

  const data = useMemo((): DetailedIncomeStatementData => {
    const lines: DetailedIncomeStatementLine[] = [];

    // A - BRÜT SATIŞLAR (60x)
    lines.push({ code: 'A', name: 'BRÜT SATIŞLAR', totalAmount: statement.grossSales.total, isHeader: true, isBold: true });
    
    if (statement.grossSales.yurtici > 0) {
      // Yurtiçi Satışlar - ana satır (genişletilebilir)
      lines.push({ 
        code: '1', 
        name: 'Yurtiçi Satışlar', 
        subAmount: statement.grossSales.yurtici, 
        isSubItem: true,
        isExpandable: true,
      });
      
      // Alt kategoriler (genişletildiğinde görünür)
      if (statement.grossSales.sbt > 0) {
        lines.push({ 
          code: '1.1', 
          name: '└ SBT Tracker Geliri', 
          subAmount: statement.grossSales.sbt, 
          isSubItem: true, 
          parentCode: '1',
          depth: 1,
        });
      }
      if (statement.grossSales.ls > 0) {
        lines.push({ 
          code: '1.2', 
          name: '└ L&S Eğitim Geliri', 
          subAmount: statement.grossSales.ls, 
          isSubItem: true, 
          parentCode: '1',
          depth: 1,
        });
      }
      if (statement.grossSales.zdhc > 0) {
        lines.push({ 
          code: '1.3', 
          name: '└ ZDHC/InCheck Geliri', 
          subAmount: statement.grossSales.zdhc, 
          isSubItem: true, 
          parentCode: '1',
          depth: 1,
        });
      }
      if (statement.grossSales.danis > 0) {
        lines.push({ 
          code: '1.4', 
          name: '└ Danışmanlık Geliri', 
          subAmount: statement.grossSales.danis, 
          isSubItem: true, 
          parentCode: '1',
          depth: 1,
        });
      }
      
      // Kategorize edilmemiş yurtiçi satışlar (varsa)
      const categorizedTotal = (statement.grossSales.sbt || 0) + (statement.grossSales.ls || 0) + 
                               (statement.grossSales.zdhc || 0) + (statement.grossSales.danis || 0);
      const uncategorized = statement.grossSales.yurtici - categorizedTotal;
      if (uncategorized > 0) {
        lines.push({ 
          code: '1.99', 
          name: '└ Diğer Yurtiçi Satışlar', 
          subAmount: uncategorized, 
          isSubItem: true, 
          parentCode: '1',
          depth: 1,
        });
      }
    }
    
    if (statement.grossSales.yurtdisi > 0) {
      lines.push({ code: '2', name: 'Yurtdışı Satışlar', subAmount: statement.grossSales.yurtdisi, isSubItem: true });
    }
    if (statement.grossSales.diger > 0) {
      lines.push({ code: '3', name: 'Diğer Gelirler', subAmount: statement.grossSales.diger, isSubItem: true });
    }

    // B - SATIŞ İNDİRİMLERİ (61x)
    if (statement.salesReturns !== 0) {
      lines.push({ code: 'B', name: 'SATIŞ İNDİRİMLERİ (-)', totalAmount: -Math.abs(statement.salesReturns), isHeader: true, isBold: true, isNegative: true });
      lines.push({ code: '1', name: 'Satıştan İadeler (-)', subAmount: -Math.abs(statement.salesReturns), isSubItem: true, isNegative: true });
    }

    // C - NET SATIŞLAR
    lines.push({ code: 'C', name: 'NET SATIŞLAR', totalAmount: statement.netSales, isHeader: true, isBold: true });

    // D - SATIŞLARIN MALİYETİ (62x)
    if (statement.costOfSales !== 0) {
      lines.push({ code: 'D', name: 'SATIŞLARIN MALİYETİ (-)', totalAmount: -Math.abs(statement.costOfSales), isHeader: true, isBold: true, isNegative: true });
      lines.push({ code: '3', name: 'Satılan Hizmet Maliyeti (-)', subAmount: -Math.abs(statement.costOfSales), isSubItem: true, isNegative: true });
    }

    // BRÜT SATIŞ KÂRI
    lines.push({ code: '', name: 'BRÜT SATIŞ KARI VEYA ZARARI', totalAmount: statement.grossProfit, isBold: true });

    // E - FAALİYET GİDERLERİ (63x)
    const opExpTotal = statement.operatingExpenses.total;
    lines.push({ code: 'E', name: 'FAALİYET GİDERLERİ (-)', totalAmount: -Math.abs(opExpTotal), isHeader: true, isBold: true, isNegative: true });
    
    if (statement.operatingExpenses.pazarlama > 0) {
      lines.push({ code: '1', name: 'Pazarlama Satış Dağıtım Gid. (-)', subAmount: -Math.abs(statement.operatingExpenses.pazarlama), isSubItem: true, isNegative: true });
    }
    
    if (statement.operatingExpenses.genelYonetim > 0) {
      // Genel Yönetim - ana satır (genişletilebilir)
      lines.push({ 
        code: '3', 
        name: 'Genel Yönetim Giderleri (-)', 
        subAmount: -Math.abs(statement.operatingExpenses.genelYonetim), 
        isSubItem: true, 
        isNegative: true,
        isExpandable: true,
      });
      
      // Alt kategoriler (genişletildiğinde görünür)
      if (statement.operatingExpenses.personel > 0) {
        lines.push({ 
          code: '3.1', 
          name: '└ Personel Giderleri', 
          subAmount: -Math.abs(statement.operatingExpenses.personel), 
          isSubItem: true, 
          isNegative: true,
          parentCode: '3',
          depth: 1,
        });
      }
      if (statement.operatingExpenses.kira > 0) {
        lines.push({ 
          code: '3.2', 
          name: '└ Kira Giderleri', 
          subAmount: -Math.abs(statement.operatingExpenses.kira), 
          isSubItem: true, 
          isNegative: true,
          parentCode: '3',
          depth: 1,
        });
      }
      if (statement.operatingExpenses.ulasim > 0) {
        lines.push({ 
          code: '3.3', 
          name: '└ Ulaşım Giderleri', 
          subAmount: -Math.abs(statement.operatingExpenses.ulasim), 
          isSubItem: true, 
          isNegative: true,
          parentCode: '3',
          depth: 1,
        });
      }
      if (statement.operatingExpenses.telekom > 0) {
        lines.push({ 
          code: '3.5', 
          name: '└ Telekomünikasyon', 
          subAmount: -Math.abs(statement.operatingExpenses.telekom), 
          isSubItem: true, 
          isNegative: true,
          parentCode: '3',
          depth: 1,
        });
      }
      if (statement.operatingExpenses.sigorta > 0) {
        lines.push({ 
          code: '3.6', 
          name: '└ Sigorta Giderleri', 
          subAmount: -Math.abs(statement.operatingExpenses.sigorta), 
          isSubItem: true, 
          isNegative: true,
          parentCode: '3',
          depth: 1,
        });
      }
      if (statement.operatingExpenses.ofis > 0) {
        lines.push({ 
          code: '3.7', 
          name: '└ Ofis Malzemeleri', 
          subAmount: -Math.abs(statement.operatingExpenses.ofis), 
          isSubItem: true, 
          isNegative: true,
          parentCode: '3',
          depth: 1,
        });
      }
      if (statement.operatingExpenses.muhasebe > 0) {
        lines.push({ 
          code: '3.8', 
          name: '└ Muhasebe/Hukuk', 
          subAmount: -Math.abs(statement.operatingExpenses.muhasebe), 
          isSubItem: true, 
          isNegative: true,
          parentCode: '3',
          depth: 1,
        });
      }
      if (statement.operatingExpenses.yazilim > 0) {
        lines.push({ 
          code: '3.11', 
          name: '└ Yazılım/IT Giderleri', 
          subAmount: -Math.abs(statement.operatingExpenses.yazilim), 
          isSubItem: true, 
          isNegative: true,
          parentCode: '3',
          depth: 1,
        });
      }
      if (statement.operatingExpenses.diger > 0) {
        lines.push({ 
          code: '3.99', 
          name: '└ Diğer Giderler', 
          subAmount: -Math.abs(statement.operatingExpenses.diger), 
          isSubItem: true, 
          isNegative: true,
          parentCode: '3',
          depth: 1,
        });
      }
    }

    // FAALİYET KÂRI
    lines.push({ code: '', name: 'FAALİYET KARI VEYA ZARARI', totalAmount: statement.operatingProfit, isBold: true });

    // F - DİĞER FAALİYET GELİRLERİ (64x)
    const otherIncomeTotal = statement.otherIncome.total;
    if (otherIncomeTotal !== 0) {
      lines.push({ code: 'F', name: 'DİĞ. FAAL. OLAĞAN GELİR VE KARLAR', totalAmount: otherIncomeTotal, isHeader: true, isBold: true });
      if (statement.otherIncome.faiz !== 0) {
        lines.push({ code: '3', name: 'Faiz Gelirleri', subAmount: statement.otherIncome.faiz, isSubItem: true });
      }
      if (statement.otherIncome.kurFarki !== 0) {
        lines.push({ code: '7', name: 'Kambiyo Karları', subAmount: statement.otherIncome.kurFarki, isSubItem: true });
      }
      if (statement.otherIncome.diger !== 0) {
        lines.push({ code: '10', name: 'Diğer Olağan Gelir ve Karlar', subAmount: statement.otherIncome.diger, isSubItem: true });
      }
    }

    // 65x - DİĞER FAALİYET GİDERLERİ
    const otherExpenseTotal = statement.otherExpenses.total;
    if (otherExpenseTotal !== 0) {
      lines.push({ code: 'G', name: 'DİĞER FAALİYET GİDERLERİ (-)', totalAmount: -Math.abs(otherExpenseTotal), isHeader: true, isBold: true, isNegative: true });
      if (statement.otherExpenses.komisyon !== 0) {
        lines.push({ code: '3', name: 'Komisyon Giderleri (-)', subAmount: -Math.abs(statement.otherExpenses.komisyon), isSubItem: true, isNegative: true });
      }
      if (statement.otherExpenses.kurFarki !== 0) {
        lines.push({ code: '7', name: 'Kambiyo Zararları (-)', subAmount: -Math.abs(statement.otherExpenses.kurFarki), isSubItem: true, isNegative: true });
      }
    }

    // H - FİNANSMAN GİDERLERİ (66x)
    if (statement.financeExpenses !== 0) {
      lines.push({ code: 'H', name: 'FİNANSMAN GİDERLERİ (-)', totalAmount: -Math.abs(statement.financeExpenses), isHeader: true, isBold: true, isNegative: true });
      lines.push({ code: '1', name: 'Kısa Vadeli Borçlanma Giderleri (-)', subAmount: -Math.abs(statement.financeExpenses), isSubItem: true, isNegative: true });
    }

    // OLAĞAN KÂR
    lines.push({ code: '', name: 'OLAĞAN KAR VEYA ZARAR', totalAmount: statement.ordinaryProfit, isBold: true });

    // I - OLAĞANDIŞI GELİRLER (67x)
    if (statement.extraordinaryIncome !== 0) {
      lines.push({ code: 'I', name: 'OLAĞANDIŞI GELİR VE KARLAR', totalAmount: statement.extraordinaryIncome, isHeader: true, isBold: true });
      lines.push({ code: '2', name: 'Diğer Olağandışı Gelir ve Karlar', subAmount: statement.extraordinaryIncome, isSubItem: true });
    }

    // J - OLAĞANDIŞI GİDERLER (68x)
    if (statement.extraordinaryExpenses !== 0) {
      lines.push({ code: 'J', name: 'OLAĞANDIŞI GİDER VE ZARARLAR (-)', totalAmount: -Math.abs(statement.extraordinaryExpenses), isHeader: true, isBold: true, isNegative: true });
      lines.push({ code: '3', name: 'Diğer Olağandışı Gider ve Zararlar (-)', subAmount: -Math.abs(statement.extraordinaryExpenses), isSubItem: true, isNegative: true });
    }

    // DÖNEM KÂRI
    lines.push({ code: '', name: 'DÖNEM KARI VEYA ZARARI', totalAmount: statement.preTaxProfit, isBold: true });

    // K - VERGİ (69x)
    if (statement.taxExpense !== 0) {
      lines.push({ code: 'K', name: "DÖN. KARI VERGİ VE Dİ.YA.YÜK.KAR.(-)", totalAmount: -Math.abs(statement.taxExpense), isHeader: true, isBold: true, isNegative: true });
      lines.push({ code: '1', name: 'Dön.Karı Vergi ve Diğ. Yas. Yük. Karş.', subAmount: -Math.abs(statement.taxExpense), isSubItem: true, isNegative: true });
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
