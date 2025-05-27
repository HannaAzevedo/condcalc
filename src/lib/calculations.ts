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
    console.error("Faixa fixa (consumo mínimo) não encontrada, inválida ou sem custo total definido na configuração.");
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

  if (!firstExceedingTier || typeof firstExceedingTier.totalCostForTier !== 'number') {
    console.warn("Primeira faixa excedente não encontrada ou sem custo total definido. Custos excedentes serão zero.");
    // Proceed with fixed cost calculation but excess will be 0
  }
  
  const minimumFixedCostSharePerApartment = fixedTier.totalCostForTier / numberOfUnits;
  const fixedTierVolumePerUnitShare = fixedTier.volume / numberOfUnits; // This is effectively 5m³ if fixedTier.volume is 40 and numberOfUnits is 8

  // Stage 1: Calculate individual consumptions and their excess over the per-unit fixed share
  const apartmentsWithConsumption = apartmentsData.map(ap => {
    const consumption = calculateIndividualConsumption(ap.currentReading, ap.previousReading);
    // User's logic: excess is volume consumed greater than 5m³ (which is fixedTierVolumePerUnitShare)
    const individualUnitExcessVolume = Math.max(0, consumption - fixedTierVolumePerUnitShare); 
    return {
      ...ap,
      consumption,
      individualUnitExcessVolume,
    };
  });

  // Stage 2: Calculate total excess volume for the condominium
  const totalCondoExcessVolume = apartmentsWithConsumption.reduce((sum, ap) => sum + ap.individualUnitExcessVolume, 0);

  // Stage 3: Calculate final details for each apartment
  let results: CalculatedApartmentData[] = apartmentsWithConsumption.map(apWithConsumption => {
    let calculatedExcessCostForAp = 0;
    
    if (totalCondoExcessVolume > 0 && firstExceedingTier && typeof firstExceedingTier.totalCostForTier === 'number') {
      calculatedExcessCostForAp = (apWithConsumption.individualUnitExcessVolume / totalCondoExcessVolume) * firstExceedingTier.totalCostForTier;
    }
    
    const tierCostBreakdown: { [tierName: string]: number } = {
      [fixedTier.name]: parseFloat(minimumFixedCostSharePerApartment.toFixed(2)),
    };

    if (calculatedExcessCostForAp > 0 && firstExceedingTier) {
      tierCostBreakdown[firstExceedingTier.name] = parseFloat(calculatedExcessCostForAp.toFixed(2));
    }
    
    const totalWaterCost = minimumFixedCostSharePerApartment + calculatedExcessCostForAp;

    return {
      ...apWithConsumption, // This includes original ap data, consumption, and individualUnitExcessVolume
      waterCost: parseFloat(totalWaterCost.toFixed(2)),
      minimumFixedCostShare: parseFloat(minimumFixedCostSharePerApartment.toFixed(2)),
      excessTierCostTotal: parseFloat(calculatedExcessCostForAp.toFixed(2)),
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

  results = results.map(apResult => {
    const equalShareCommonExpenses = parseFloat(demaisServicosPerApartment.toFixed(2));
    const proportionalFeeForOtherServices = totalCondoArea > 0 && apResult.area > 0
      ? (apResult.area / totalCondoArea) * commonExpenses.otherServicesFee
      : 0;
    
    let currentTotalBill = apResult.totalBill + equalShareCommonExpenses + proportionalFeeForOtherServices;

    return {
        ...apResult,
        equalShareCommonExpenses: equalShareCommonExpenses,
        proportionalServiceFee: parseFloat(proportionalFeeForOtherServices.toFixed(2)),
        totalBill: parseFloat(currentTotalBill.toFixed(2)), // Initial total before difference adjustment
    };
  });
  
  // Difference adjustment based on totalUtilityWaterSewerBill
  const sumOfCalculatedWaterCostsForAllAps = results.reduce((sum, ap) => sum + ap.waterCost, 0); // waterCost already includes minShare + excessTierCost
  const waterBillDifference = commonExpenses.totalUtilityWaterSewerBill - sumOfCalculatedWaterCostsForAllAps;
  
  const totalSystemConsumption = results.reduce((sum, ap) => sum + ap.consumption, 0);

  if (Math.abs(waterBillDifference) > 0.01 && totalSystemConsumption > 0) { 
      results = results.map(apResult => {
          let differenceShare = 0;
          if (totalSystemConsumption > 0) { // Check to prevent division by zero if all consumptions are 0
              differenceShare = (apResult.consumption / totalSystemConsumption) * waterBillDifference;
          } else if (numberOfUnits > 0) { // Fallback: if no consumption, divide difference equally
              differenceShare = waterBillDifference / numberOfUnits;
          }
          
          const newTotalBill = apResult.totalBill + differenceShare;
          // Optionally adjust waterCost or add to tierBreakdown for transparency
          // For now, just adjusting totalBill
          return {
              ...apResult,
              totalBill: parseFloat(newTotalBill.toFixed(2)),
              // Example of reflecting in tierBreakdown:
              // tierCostBreakdown: {
              //   ...apResult.tierCostBreakdown,
              //   "Ajuste Diferença Fatura": parseFloat(differenceShare.toFixed(2))
              // }
          };
      });
  } else if (Math.abs(waterBillDifference) > 0.01 && totalSystemConsumption === 0 && numberOfUnits > 0) {
      // Handle case where there's a difference but no consumption (e.g. fixed utility charges)
      // Distribute equally among units
      const differenceSharePerUnit = waterBillDifference / numberOfUnits;
      results = results.map(apResult => {
          const newTotalBill = apResult.totalBill + differenceSharePerUnit;
          return {
              ...apResult,
              totalBill: parseFloat(newTotalBill.toFixed(2)),
          };
      });
  }


  return results;
}

