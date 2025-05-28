
import type { CalculatedApartmentData, CommonExpenses, MonthlyRecord, TariffRates, TariffTier } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * @fileOverview Functions for PDF export.
 * This file contains functions for exporting data to PDF using jspdf and jspdf-autotable.
 */

const formatCurrencyForPDF = (value: number | undefined | null): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'R$ 0,00';
  }
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

const formatDateForPDF = (monthYear: string): string => {
    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
        return "Mês/Ano Indefinido";
    }
    const [year, month] = monthYear.split('-');
    return `${month}/${year}`;
}

/**
 * Exports calculations data to PDF.
 * @param calculatedBills - Array of calculated apartment data.
 * @param commonExpenses - Common expenses object.
 * @param tariffRates - Tariff rates object.
 * @param currentMonthYear - The current reference month/year string (e.g., "2023-10").
 */
export function exportCalculationsToPDF(
  calculatedBills: CalculatedApartmentData[],
  commonExpenses: CommonExpenses,
  tariffRates: TariffRates,
  currentMonthYear: string
): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageHeight = doc.internal.pageSize.height; 
  const pageWidth = doc.internal.pageSize.width;  
  let startY = 20;
  const leftMargin = 15;
  const usableWidth = pageWidth - (leftMargin * 2);


  doc.setFontSize(18);
  doc.text("Relatório de Cálculos de Água", leftMargin, startY);
  startY += 10;

  doc.setFontSize(12);
  doc.text(`Mês de Referência: ${formatDateForPDF(currentMonthYear)}`, leftMargin, startY);
  startY += 10;

  // Calculate totals for the footer
  const totalPreviousReading = calculatedBills.reduce((sum, ap) => sum + ap.previousReading, 0);
  const totalCurrentReading = calculatedBills.reduce((sum, ap) => sum + ap.currentReading, 0);
  const totalConsumption = calculatedBills.reduce((sum, ap) => sum + ap.consumption, 0);
  const totalMinimumFixedCostShare = calculatedBills.reduce((sum, ap) => sum + ap.minimumFixedCostShare, 0);
  const totalEqualShareCommonExpenses = calculatedBills.reduce((sum, ap) => sum + ap.equalShareCommonExpenses, 0);
  const totalExcessTierCostTotal = calculatedBills.reduce((sum, ap) => sum + ap.excessTierCostTotal, 0);
  const totalWaterCost = calculatedBills.reduce((sum, ap) => sum + ap.waterCost, 0);
  const totalProportionalServiceFee = calculatedBills.reduce((sum, ap) => sum + ap.proportionalServiceFee, 0);
  const totalOverallBill = calculatedBills.reduce((sum, ap) => sum + ap.totalBill, 0);

  const head = [
    'Unidade', 
    'Leitura Anterior (m³)',
    'Leitura Atual (m³)',
    'Consumo (m³)', 
    'Rateio Mín. Fixo (R$)',
    'Custo Faixas Excedentes (R$)',
    'Custo Água/Esgoto (R$)',
    'Taxas Comuns (R$)', 
    'Serviços Prop. (R$)', 
    'Total (R$)'
  ];
  const body = calculatedBills.map(ap => [
    ap.unitNumber,
    Math.round(ap.previousReading).toString(),
    Math.round(ap.currentReading).toString(),
    Math.round(ap.consumption).toString(),
    formatCurrencyForPDF(ap.minimumFixedCostShare),
    formatCurrencyForPDF(ap.excessTierCostTotal),
    formatCurrencyForPDF(ap.waterCost),
    formatCurrencyForPDF(ap.equalShareCommonExpenses),
    formatCurrencyForPDF(ap.proportionalServiceFee),
    formatCurrencyForPDF(ap.totalBill)
  ]);
  const foot = [[
      'TOTAIS',
      '', // Leitura Anterior
      '', // Leitura Atual
      Math.round(totalConsumption).toString() + ' m³',
      formatCurrencyForPDF(totalMinimumFixedCostShare),
      formatCurrencyForPDF(totalExcessTierCostTotal),
      formatCurrencyForPDF(totalWaterCost),
      formatCurrencyForPDF(totalEqualShareCommonExpenses),
      formatCurrencyForPDF(totalProportionalServiceFee),
      formatCurrencyForPDF(totalOverallBill)
  ]];


  autoTable(doc, {
    startY: startY,
    head: [head],
    body: body,
    foot: foot,
    theme: 'striped',
    headStyles: { fillColor: [22, 160, 133] }, 
    footStyles: { fillColor: [200, 200, 200], textColor: [0,0,0], fontStyle: 'bold' },
    margin: { left: leftMargin, right: leftMargin },
    didDrawPage: (data: any) => {
        // startY is updated automatically by autoTable for the next table
    }
  });
  
  startY = (doc as any).lastAutoTable.finalY + 15;


  if (startY > pageHeight - 40) { 
    doc.addPage();
    startY = 20;
  }

  doc.setFontSize(14);
  doc.text("Resumo das Despesas Comuns", leftMargin, startY);
  startY += 7;
  
  const commonExpensesData = [
    ["Taxa de Lixo", formatCurrencyForPDF(commonExpenses.garbageFee)],
    ["Multa Taxa de Lixo", formatCurrencyForPDF(commonExpenses.garbageFeePenalty)],
    ["Atualização Monetária", formatCurrencyForPDF(commonExpenses.latePaymentAdjustment)],
    ["Multa Água", formatCurrencyForPDF(commonExpenses.waterPenalty)],
    ["Demais Serviços", formatCurrencyForPDF(commonExpenses.otherServicesFee)],
    ["Total Fatura Concessionária", formatCurrencyForPDF(commonExpenses.totalUtilityWaterSewerBill)],
  ];

  autoTable(doc, {
    startY: startY,
    head: [['Descrição da Despesa', 'Valor (R$)']],
    body: commonExpensesData,
    theme: 'grid',
    headStyles: { fillColor: [100, 100, 100] }, 
    margin: { left: leftMargin, right: leftMargin },
    didDrawPage: (data: any) => {
      // startY updated automatically
    }
  });
  startY = (doc as any).lastAutoTable.finalY + 15;
  
  if (startY > pageHeight - 50) { doc.addPage(); startY = 20; }

  doc.setFontSize(14);
  doc.text("Configuração de Tarifas Aplicada", leftMargin, startY);
  startY += 7;

  const tariffTableData: (string | number)[][] = [
      ["Percentual Esgoto", `${tariffRates.sewerRatePercentage}%`]
  ];

  tariffRates.tiers.forEach((tier: TariffTier) => {
      let tierDetails = `Nome: ${tier.name}\nVolume: ${tier.volume}m³`;
      if (tier.isFixedValue) {
          tierDetails += `\nCusto Água: ${formatCurrencyForPDF(tier.waterCostForTier)}`;
          if (tier.sewerCostForTier !== undefined) {
              tierDetails += `\nCusto Esgoto: ${formatCurrencyForPDF(tier.sewerCostForTier)}`;
          }
          if (tier.totalCostForTier !== undefined) {
              tierDetails += `\nCusto Total Faixa: ${formatCurrencyForPDF(tier.totalCostForTier)}`;
          }
      } else {
          tierDetails += `\nTaxa Água/m³: ${formatCurrencyForPDF(tier.ratePerM3Water)}`;
          tierDetails += `\nCusto Água Faixa: ${formatCurrencyForPDF(tier.waterCostForTier)}`;
          if (tier.sewerCostForTier !== undefined) {
              tierDetails += `\nCusto Esgoto Faixa: ${formatCurrencyForPDF(tier.sewerCostForTier)}`;
          }
          if (tier.totalCostForTier !== undefined) {
              tierDetails += `\nCusto Total Faixa: ${formatCurrencyForPDF(tier.totalCostForTier)}`;
          }
          // A linha abaixo referente a 'unitExcessRateTotal' foi removida
      }
      tariffTableData.push([`Faixa ${tariffRates.tiers.indexOf(tier) + 1}`, tierDetails]);
  });
  
  autoTable(doc, {
      startY: startY,
      head: [['Item da Tarifa', 'Detalhes']],
      body: tariffTableData,
      theme: 'grid',
      headStyles: { fillColor: [100, 100, 100] },
      columnStyles: {
          0: { cellWidth: usableWidth * 0.3 }, 
          1: { cellWidth: usableWidth * 0.7 }, 
      },
      margin: { left: leftMargin, right: leftMargin },
      styles: { cellPadding: 2, fontSize: 9,
        overflow: 'linebreak', 
      }, 
      didDrawPage: (data:any) => {
        // startY updated automatically
      }
  });

  doc.save(`relatorio_calculos_${currentMonthYear.replace('-', '_')}.pdf`);
}

/**
 * Exports history data to PDF.
 * @param history - Array of monthly records.
 */
export function exportHistoryToPDF(history: MonthlyRecord[]): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  const leftMargin = 15;
  
  doc.setFontSize(18);
  doc.text("Relatório de Histórico de Contas", leftMargin, 20);

  autoTable(doc, {
    startY: 30,
    head: [['Mês/Ano', 'Consumo Total (m³)', 'Conta Total (R$)', 'Média/Unidade (R$)']],
    body: history.map(record => [
      formatDateForPDF(record.monthYear),
      record.totalCondoConsumption.toFixed(0),
      formatCurrencyForPDF(record.totalCondoBill),
      formatCurrencyForPDF(record.averageBillPerUnit)
    ]),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] }, 
    margin: { left: leftMargin, right: leftMargin },
  });

  doc.save('relatorio_historico.pdf');
}

