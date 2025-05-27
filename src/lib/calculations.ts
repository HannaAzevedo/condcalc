
import type { ApartmentData, CalculatedApartmentData, CommonExpenses, TariffRates } from './types';

export function calculateIndividualConsumption(currentReading: number, previousReading: number): number {
  if (currentReading < previousReading) {
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

  const minimumFixedCostSharePerApartment = fixedTier.totalCostForTier / numberOfUnits;
  const individualExcessThreshold = 5; // Threshold de 5m³ para excedente individual

  const apartmentsWithConsumption = apartmentsData.map(ap => {
    const consumption = calculateIndividualConsumption(ap.currentReading, ap.previousReading);
    // Excedente individual: consumo além do limiar de 5m³
    const individualExcessVolume = Math.max(0, consumption - individualExcessThreshold);
    return {
      ...ap,
      consumption,
      individualExcessVolume,
    };
  });

  const totalCondoExcessVolume = apartmentsWithConsumption.reduce((sum, ap) => sum + ap.individualExcessVolume, 0);

  const resultsIntermediate = apartmentsWithConsumption.map(apWithConsumption => {
    let calculatedExcessCostForAp = 0;
    
    // O "Custo Total da Faixa" aqui refere-se ao custo total da *primeira faixa excedente* configurada
    if (totalCondoExcessVolume > 0 && firstExceedingTier && typeof firstExceedingTier.totalCostForTier === 'number') {
      calculatedExcessCostForAp = (apWithConsumption.individualExcessVolume / totalCondoExcessVolume) * firstExceedingTier.totalCostForTier;
    }
    
    // Custo de água puro (cota fixa + cota excedente calculada pelas tarifas)
    const pureWaterTariffCost = minimumFixedCostSharePerApartment + calculatedExcessCostForAp;

    const tierCostBreakdown: { [tierName: string]: number } = {
      [fixedTier.name]: parseFloat(minimumFixedCostSharePerApartment.toFixed(2)),
    };
    if (calculatedExcessCostForAp > 0 && firstExceedingTier) {
      tierCostBreakdown[firstExceedingTier.name] = parseFloat(calculatedExcessCostForAp.toFixed(2));
    }

    return {
      ...apWithConsumption,
      waterCost: parseFloat(pureWaterTariffCost.toFixed(2)), 
      minimumFixedCostShare: parseFloat(minimumFixedCostSharePerApartment.toFixed(2)),
      excessTierCostTotal: parseFloat(calculatedExcessCostForAp.toFixed(2)),
      tierCostBreakdown,
    };
  });

  const totalCondoArea = apartmentsData.reduce((sum, ap) => sum + ap.area, 0);
  const equalShareExpensesSum =
    commonExpenses.garbageFee +
    commonExpenses.garbageFeePenalty +
    commonExpenses.latePaymentAdjustment +
    commonExpenses.waterPenalty;
  const equalShareExpensesPerApartment = numberOfUnits > 0 ? equalShareExpensesSum / numberOfUnits : 0;

  let finalResults: CalculatedApartmentData[] = resultsIntermediate.map(apResult => {
    const proportionalFeeForOtherServices = totalCondoArea > 0 && apResult.area > 0
      ? (apResult.area / totalCondoArea) * commonExpenses.otherServicesFee
      : 0;
    
    let preliminaryTotalBill = apResult.waterCost + equalShareExpensesPerApartment + proportionalFeeForOtherServices;

    return {
        ...apResult,
        equalShareCommonExpenses: parseFloat(equalShareExpensesPerApartment.toFixed(2)),
        proportionalServiceFee: parseFloat(proportionalFeeForOtherServices.toFixed(2)),
        totalBill: parseFloat(preliminaryTotalBill.toFixed(2)),
    };
  });
  
  const sumOfCalculatedWaterCostsBeforeAdjustment = finalResults.reduce((sum, ap) => sum + ap.waterCost, 0);
  const waterBillDifferenceToAdjust = commonExpenses.totalUtilityWaterSewerBill - sumOfCalculatedWaterCostsBeforeAdjustment;
  
  const totalSystemConsumptionForAdjustment = finalResults.reduce((sum, ap) => sum + ap.consumption, 0);

  if (Math.abs(waterBillDifferenceToAdjust) > 0.01) { 
      finalResults = finalResults.map(apResult => {
          let differenceShare = 0;
          if (totalSystemConsumptionForAdjustment > 0) { 
              differenceShare = (apResult.consumption / totalSystemConsumptionForAdjustment) * waterBillDifferenceToAdjust;
          } else if (numberOfUnits > 0) { 
              differenceShare = waterBillDifferenceToAdjust / numberOfUnits;
          }
          
          const newTotalBill = apResult.totalBill + differenceShare;
          
          const updatedTierBreakdown = { ...apResult.tierCostBreakdown };
          if (Math.abs(differenceShare) >= 0.01) {
            updatedTierBreakdown["Ajuste Diferença Fatura"] = parseFloat((updatedTierBreakdown["Ajuste Diferença Fatura"] || 0 + differenceShare).toFixed(2));
          }

          // O waterCost e excessTierCostTotal NÃO são alterados aqui, eles refletem o cálculo puro das tarifas.
          // A diferença da fatura da concessionária ajusta o totalBill e é detalhada.
          return {
              ...apResult,
              totalBill: parseFloat(newTotalBill.toFixed(2)), 
              tierCostBreakdown: updatedTierBreakdown,
          };
      });
  }

  return finalResults;
}
