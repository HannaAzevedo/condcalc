
export interface CommonExpenses {
  garbageFee: number;
  garbageFeePenalty: number;
  latePaymentAdjustment: number;
  waterPenalty: number;
  otherServicesFee: number;
  totalUtilityWaterSewerBill: number;
}

export interface TariffTier {
  id: string;
  name: string;
  volume: number;
  waterCostForTier: number;
  sewerCostForTier?: number;
  totalCostForTier?: number;
  isFixedValue: boolean;
  ratePerM3Water?: number;
  unitExcessRateTotal?: number; // Added for display in TariffRatesForm
}

export interface TariffRates {
  tiers: TariffTier[];
  sewerRatePercentage: number;
}

export interface ApartmentData {
  id: string;
  unitNumber: string;
  area: number;
  currentReading: number;
  previousReading: number;
}

export interface CalculatedApartmentData extends ApartmentData {
  consumption: number;
  waterCost: number;
  minimumFixedCostShare: number;
  excessTierCostTotal: number;
  equalShareCommonExpenses: number;
  proportionalServiceFee: number;
  totalBill: number;
  tierCostBreakdown: { [tierName: string]: number };
}

export interface MonthlyRecord {
  id: string;
  monthYear: string;
  totalCondoReading: number;
  totalCondoConsumption: number;
  totalCondoBill: number;
  averageBillPerUnit: number;
  apartmentsData: CalculatedApartmentData[];
  commonExpenses: CommonExpenses;
  tariffRates: TariffRates;
}

export const DEFAULT_COMMON_EXPENSES: CommonExpenses = {
  garbageFee: 0,
  garbageFeePenalty: 0,
  latePaymentAdjustment: 0,
  waterPenalty: 0,
  otherServicesFee: 0,
  totalUtilityWaterSewerBill: 404.29,
};

export const DEFAULT_TARIFF_RATES: TariffRates = {
  tiers: [
    {
      id: 'fixedTier',
      name: "Mínimo (0-40m³)",
      volume: 40,
      waterCostForTier: 403.36,
      isFixedValue: true,
    },
    {
      id: 'exceedingTier1',
      name: "Faixa Excedente 1 (Acima de 40m³)",
      volume: 10, // Default example volume for this tier
      waterCostForTier: 15.60, // Calculated: 10 * 1.56
      isFixedValue: false,
      ratePerM3Water: 1.56,
    },
  ],
  sewerRatePercentage: 80,
};

export const FIXED_APARTMENT_UNIT_NUMBERS: string[] = ["11", "12", "21", "22", "31", "32", "41", "42"];

export const createInitialApartmentsList = (): ApartmentData[] => {
  return FIXED_APARTMENT_UNIT_NUMBERS.map(unitNumber => ({
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `fallback-id-${unitNumber}-${Math.random().toString(36).substring(7)}`,
    unitNumber: unitNumber,
    area: 100,
    previousReading: 0,
    currentReading: 0,
  }));
};

export const enrichTariffTiers = (rates: TariffRates): TariffRates => {
  if (!rates || !rates.tiers) {
    console.warn("enrichTariffTiers received invalid rates object", rates);
    return DEFAULT_TARIFF_RATES; // Or handle more gracefully
  }
  const enrichedTiers = rates.tiers.map(tier => {
    let currentWaterCostForTier = tier.waterCostForTier;

    if (!tier.isFixedValue && typeof tier.ratePerM3Water === 'number' && typeof tier.volume === 'number' && tier.volume >= 0) {
      currentWaterCostForTier = tier.volume * tier.ratePerM3Water;
    }

    const sewerCost = currentWaterCostForTier * (rates.sewerRatePercentage / 100);
    const totalCost = currentWaterCostForTier + sewerCost;
    let unitExcessRate = 0;
    if (!tier.isFixedValue && tier.volume > 0) {
        unitExcessRate = totalCost / tier.volume;
    }

    return {
      ...tier,
      waterCostForTier: parseFloat(currentWaterCostForTier.toFixed(2)),
      sewerCostForTier: parseFloat(sewerCost.toFixed(2)),
      totalCostForTier: parseFloat(totalCost.toFixed(2)),
      unitExcessRateTotal: parseFloat(unitExcessRate.toFixed(2)),
    };
  });
  return { ...rates, tiers: enrichedTiers };
};

export const parseAndValidateTariffRates = (storedData: string | null): TariffRates => {
  let ratesToReturn = DEFAULT_TARIFF_RATES;
  if (typeof window !== 'undefined' && storedData) {
    try {
      const parsed = JSON.parse(storedData);
      if (parsed && Array.isArray(parsed.tiers) && typeof parsed.sewerRatePercentage === 'number') {
        const isValid = parsed.tiers.every((tier: any) =>
          typeof tier.id === 'string' &&
          typeof tier.name === 'string' &&
          typeof tier.volume === 'number' &&
          typeof tier.waterCostForTier === 'number' &&
          typeof tier.isFixedValue === 'boolean'
          // ratePerM3Water is optional, so no need to check its existence for all tiers here
        );
        if (isValid) {
          ratesToReturn = parsed as TariffRates;
        } else {
          console.warn("Invalid tier structure in stored tariff rates. Resetting to default.");
        }
      } else {
        console.warn("Old or invalid tariff rates structure detected in localStorage. Resetting to default.");
      }
    } catch (e) {
      console.error("Failed to parse or validate tariff rates from localStorage", e);
    }
  }
  // Always enrich, whether from storage or default
  return enrichTariffTiers(ratesToReturn);
};

