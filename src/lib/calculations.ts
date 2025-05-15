import type { ApartmentData, CalculatedApartmentData, CommonExpenses, TariffRates, TariffTier } from './types';

export function calculateIndividualConsumption(currentReading: number, previousReading: number): number {
  if (currentReading < previousReading) {
    console.warn(`Leitura anterior (${previousReading}) maior que a atual (${currentReading}). Considerado consumo 0.`);
    return 0;
  }
  return currentReading - previousReading;
}

export function calculateAllApartments(
  apartmentsData: ApartmentData[],
  commonExpenses: CommonExpenses,
  tariffConfiguration: TariffRates
): CalculatedApartmentData[] {
  const numberOfUnits = apartmentsData.length;
  if (numberOfUnits === 0) return [];

  const fixedTier = tariffConfiguration.tiers.find(t => t.isFixedValue);
  const firstExceedingTier = tariffConfiguration.tiers.find(t => !t.isFixedValue);

  if (!fixedTier || typeof fixedTier.volume !== 'number' || fixedTier.volume < 0 || typeof fixedTier.totalCostForTier !== 'number') {
    console.error("Fixed tariff tier (minimum consumption) not found, invalid, or without total cost defined in configuration.");
     return apartmentsData.map(ap => ({
        ...ap,
        consumption: calculateIndividualConsumption(ap.currentReading, ap.previousReading),
        waterCost: 0,
        minimumFixedCostShare: 0,
        excessTierCostTotal: 0,
        equalShareCommonExpenses: 0,
        proportionalServiceFee: 0,
        totalBill: 0,
        tierCostBreakdown: {},
      }));
  }
  
  // ETAPA 1: Rateio da Faixa Mínima (valor fixo dividido entre todos)
  const minimumFixedCostSharePerApartment = fixedTier.totalCostForTier / numberOfUnits;

  // Calculate Value per m³ for Excess from the first exceeding tier
  // This is the "Valor Unit. Exced. Total (R$/m³)" mentioned by the user.
  let valuePerM3ForExcess = 0;
  if (firstExceedingTier && typeof firstExceedingTier.totalCostForTier === 'number' && firstExceedingTier.volume > 0) {
    valuePerM3ForExcess = firstExceedingTier.totalCostForTier / firstExceedingTier.volume;
  } else {
    console.warn("First exceeding tier not found or invalid. Excess costs will be zero if applicable.");
  }

  const results: CalculatedApartmentData[] = apartmentsData.map(ap => {
    const consumption = calculateIndividualConsumption(ap.currentReading, ap.previousReading);

    // User logic for excess calculation:
    // "a unidade Consumo (m³) por unidade - (Volume da Faixa (m³)/qtd (Apartamentos))"
    // This is: individual consumption - (fixed tier total volume / number of units)
    const fixedTierVolumeSharePerAp = fixedTier.volume / numberOfUnits; // e.g., 40m³ total fixed vol / 8 units = 5m³ fixed vol share per AP
    const individualExcessConsumption = Math.max(0, consumption - fixedTierVolumeSharePerAp);
    
    // "esse valor deve ser multiplicado pelo Valor Unit. Exced. Total (R$/m³)"
    const calculatedExcessCostForAp = individualExcessConsumption * valuePerM3ForExcess;
    
    const tierCostBreakdown: { [tierName: string]: number } = {
      [fixedTier.name]: parseFloat(minimumFixedCostSharePerApartment.toFixed(2)),
    };

    if (calculatedExcessCostForAp > 0 && firstExceedingTier) {
      // The cost for the "excess" part is now a single value, named after the first exceeding tier.
      tierCostBreakdown[firstExceedingTier.name] = parseFloat(calculatedExcessCostForAp.toFixed(2));
    }
    
    const totalWaterCost = minimumFixedCostSharePerApartment + calculatedExcessCostForAp;

    return {
      ...ap,
      consumption,
      waterCost: parseFloat(totalWaterCost.toFixed(2)),
      minimumFixedCostShare: parseFloat(minimumFixedCostSharePerApartment.toFixed(2)),
      excessTierCostTotal: parseFloat(calculatedExcessCostForAp.toFixed(2)), // This field feeds the "Custo Faixas Excedentes (R$)" column
      tierCostBreakdown,
      equalShareCommonExpenses: 0, 
      proportionalServiceFee: 0, 
      totalBill: totalWaterCost, 
    };
  });

  // Common expenses calculation
  const totalCondoArea = apartmentsData.reduce((sum, ap) => sum + ap.area, 0);
  const demaisServicosSum =
    commonExpenses.garbageFee +
    commonExpenses.garbageFeePenalty +
    commonExpenses.latePaymentAdjustment +
    commonExpenses.waterPenalty;
  const demaisServicosPerApartment = numberOfUnits > 0 ? demaisServicosSum / numberOfUnits : 0;

  results.forEach(apResult => {
    apResult.equalShareCommonExpenses = parseFloat(demaisServicosPerApartment.toFixed(2));
    apResult.totalBill += demaisServicosPerApartment;

    const proportionalFeeForOtherServices = totalCondoArea > 0 && apResult.area > 0
      ? (apResult.area / totalCondoArea) * commonExpenses.otherServicesFee
      : 0;
    apResult.proportionalServiceFee = parseFloat(proportionalFeeForOtherServices.toFixed(2));
    apResult.totalBill += proportionalFeeForOtherServices;
    
    apResult.totalBill = parseFloat(apResult.totalBill.toFixed(2));
  });
  
  // Difference adjustment based on totalUtilityWaterSewerBill
  const sumOfCalculatedWaterCostsForAllAps = results.reduce((sum, ap) => sum + ap.waterCost, 0);
  const waterBillDifference = commonExpenses.totalUtilityWaterSewerBill - sumOfCalculatedWaterCostsForAllAps;
  
  const totalSystemConsumption = results.reduce((sum, ap) => sum + ap.consumption, 0);

  if (Math.abs(waterBillDifference) > 0.01) { 
      results.forEach(apResult => {
          let differenceShare = 0;
          if (totalSystemConsumption > 0) {
              differenceShare = (apResult.consumption / totalSystemConsumption) * waterBillDifference;
          } else if (numberOfUnits > 0) { 
              differenceShare = waterBillDifference / numberOfUnits;
          }
          apResult.totalBill += differenceShare;
          apResult.totalBill = parseFloat(apResult.totalBill.toFixed(2));
          
          // Optionally, reflect this difference in waterCost and tierCostBreakdown for full transparency
          // For example:
          // apResult.waterCost += differenceShare;
          // apResult.waterCost = parseFloat(apResult.waterCost.toFixed(2));
          // apResult.tierCostBreakdown["Ajuste Diferença Fatura"] = parseFloat(differenceShare.toFixed(2));
      });
  }

  return results;
}
