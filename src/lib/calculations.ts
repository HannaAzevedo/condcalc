
import type { ApartmentData, CalculatedApartmentData, CommonExpenses, TariffRates } from './types';

export function calculateIndividualConsumption(currentReading: number, previousReading: number): number {
  if (currentReading < previousReading) {
    // console.warn(`Leitura anterior (${previousReading}) maior que a atual (${currentReading}). Considerado consumo 0.`);
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

  // A parte do volume da faixa fixa por unidade (ex: 40m³ total / 8 unidades = 5m³/unidade)
  // Este é o limiar acima do qual o consumo é considerado "excedente" para uma unidade individual.
  const fixedTierVolumePerUnitShare = fixedTier.volume / numberOfUnits; // User confirmed this as "maior que 5"

  const minimumFixedCostSharePerApartment = fixedTier.totalCostForTier / numberOfUnits;

  const apartmentsWithConsumption = apartmentsData.map(ap => {
    const consumption = calculateIndividualConsumption(ap.currentReading, ap.previousReading);
    // Calcula o excesso da unidade individual: consumo além da sua parte do volume da faixa fixa
    const individualUnitExcessVolume = Math.max(0, consumption - fixedTierVolumePerUnitShare);
    return {
      ...ap,
      consumption,
      individualUnitExcessVolume,
    };
  });

  const totalCondoExcessVolume = apartmentsWithConsumption.reduce((sum, ap) => sum + ap.individualUnitExcessVolume, 0);

  // Calcula os custos de água e esgoto puros, antes de outras taxas e ajustes
  const resultsIntermediate = apartmentsWithConsumption.map(apWithConsumption => {
    let calculatedExcessCostForAp = 0;
    
    // "Custo Total da Faixa" refere-se ao custo total da primeira faixa excedente
    if (totalCondoExcessVolume > 0 && firstExceedingTier && typeof firstExceedingTier.totalCostForTier === 'number') {
      calculatedExcessCostForAp = (apWithConsumption.individualUnitExcessVolume / totalCondoExcessVolume) * firstExceedingTier.totalCostForTier;
    }
    
    const pureWaterCost = minimumFixedCostSharePerApartment + calculatedExcessCostForAp;

    const tierCostBreakdown: { [tierName: string]: number } = {
      [fixedTier.name]: parseFloat(minimumFixedCostSharePerApartment.toFixed(2)),
    };
    if (calculatedExcessCostForAp > 0 && firstExceedingTier) {
      tierCostBreakdown[firstExceedingTier.name] = parseFloat(calculatedExcessCostForAp.toFixed(2));
    }

    return {
      ...apWithConsumption,
      waterCost: parseFloat(pureWaterCost.toFixed(2)), // Custo puro de água (cota fixa + cota excedente)
      minimumFixedCostShare: parseFloat(minimumFixedCostSharePerApartment.toFixed(2)),
      excessTierCostTotal: parseFloat(calculatedExcessCostForAp.toFixed(2)), // Este é o "Custo Faixas Excedentes"
      tierCostBreakdown,
    };
  });

  // Calcula despesas comuns e a conta final
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
    
    // Total antes do ajuste da fatura da concessionária
    let preliminaryTotalBill = apResult.waterCost + equalShareExpensesPerApartment + proportionalFeeForOtherServices;

    return {
        ...apResult,
        equalShareCommonExpenses: parseFloat(equalShareExpensesPerApartment.toFixed(2)),
        proportionalServiceFee: parseFloat(proportionalFeeForOtherServices.toFixed(2)),
        totalBill: parseFloat(preliminaryTotalBill.toFixed(2)), // Total preliminar
    };
  });
  
  // Ajuste da diferença com base na `totalUtilityWaterSewerBill` de `commonExpenses`
  const sumOfPureCalculatedWaterCosts = finalResults.reduce((sum, ap) => sum + ap.waterCost, 0);
  const waterBillDifference = commonExpenses.totalUtilityWaterSewerBill - sumOfPureCalculatedWaterCosts;
  
  const totalSystemConsumption = finalResults.reduce((sum, ap) => sum + ap.consumption, 0);

  if (Math.abs(waterBillDifference) > 0.01) { // Ajusta apenas se a diferença for significativa
      finalResults = finalResults.map(apResult => {
          let differenceShare = 0;
          if (totalSystemConsumption > 0) { 
              differenceShare = (apResult.consumption / totalSystemConsumption) * waterBillDifference;
          } else if (numberOfUnits > 0) { 
              differenceShare = waterBillDifference / numberOfUnits;
          }
          
          const newTotalBill = apResult.totalBill + differenceShare;
          
          const updatedTierBreakdown = { ...apResult.tierCostBreakdown };
          if (Math.abs(differenceShare) >= 0.01) {
            updatedTierBreakdown["Ajuste Diferença Fatura"] = parseFloat((updatedTierBreakdown["Ajuste Diferença Fatura"] || 0 + differenceShare).toFixed(2));
          }

          return {
              ...apResult,
              totalBill: parseFloat(newTotalBill.toFixed(2)), // `waterCost` e `excessTierCostTotal` não são alterados aqui
              tierCostBreakdown: updatedTierBreakdown,
          };
      });
  }

  return finalResults;
}
