export interface CommonExpenses {
  garbageFee: number; // Taxa de lixo
  garbageFeePenalty: number; // Multa taxa de lixo
  latePaymentAdjustment: number; // Atualização monetária por atraso
  waterPenalty: number; // Multa água
  otherServicesFee: number; // Demais serviços
  totalUtilityWaterSewerBill: number; // Valor total da fatura de água/esgoto da concessionária
}

export interface TariffTier {
  id: string;
  name: string;
  volume: number; // Volume da faixa em m³ (para faixas de consumo) ou 0/ignorado para valor fixo. Para faixas excedentes, é o volume DAQUELA FAIXA.
  waterCostForTier: number; // Custo da ÁGUA para esta faixa (se for fixa, é o custo total; se excedente, é volume * taxa/m³)
  sewerCostForTier?: number; // Custo do ESGOTO para esta faixa (calculado como % do waterCostForTier)
  totalCostForTier?: number; // Custo TOTAL (água + esgoto) para esta faixa
  isFixedValue: boolean; // true se for a faixa de consumo mínimo (custo fixo)
  ratePerM3Water?: number; // Custo da ÁGUA por m³ para esta faixa (usado para faixas excedentes)
}


export interface TariffRates {
  tiers: TariffTier[];
  sewerRatePercentage: number; // Percentual da taxa de esgoto sobre o custo da água (ex: 80 para 80%)
}


export interface ApartmentData {
  id: string; // UUID ou identificador único
  unitNumber: string; // Ex: "101", "202A"
  area: number; // Metragem em m² (ainda mantida para rateio proporcional de "outrosServiços")
  currentReading: number; // Leitura atual do hidrômetro em m³
  previousReading: number; // Leitura anterior do hidrômetro em m³
}

export interface CalculatedApartmentData extends ApartmentData {
  consumption: number; // Consumo individual em m³ (leituraAtual - leituraAnterior)
  waterCost: number; // Custo total de água E esgoto para o apartamento (faixa mínima + faixas excedentes)
  minimumFixedCostShare: number; // Cota parte do custo fixo mínimo para este apartamento
  excessTierCostTotal: number; // Soma dos custos de todas as faixas excedentes para este apartamento
  equalShareCommonExpenses: number; // Parte do rateio igual das despesas comuns (lixo, multas fixas, etc.)
  proportionalServiceFee: number; // Parte do rateio proporcional de "outrosServiços" (baseado na área)
  totalBill: number; // Conta total do apartamento (waterCost + equalShareCommonExpenses + proportionalServiceFee)
  tierCostBreakdown: { [tierName: string]: number }; // Detalhamento do custo por faixa de tarifa (incluindo a mínima)
}


export interface MonthlyRecord {
  id: string; // Geralmente o 'monthYear' como "YYYY-MM"
  monthYear: string; // Mês e ano de referência
  totalCondoReading: number; // Soma das leituras atuais de todos os hidrômetros
  totalCondoConsumption: number; // Consumo total de água do condomínio em m³
  totalCondoBill: number; // Custo total do condomínio (soma de todas as contas dos apartamentos)
  averageBillPerUnit: number; // Custo médio por unidade
  apartmentsData: CalculatedApartmentData[]; // Array com os dados calculados de cada apartamento
  commonExpenses: CommonExpenses; // Cópia das despesas comuns usadas para este cálculo
  tariffRates: TariffRates; // Cópia das tarifas usadas para este cálculo
}

export const DEFAULT_COMMON_EXPENSES: CommonExpenses = {
  garbageFee: 0,
  garbageFeePenalty: 0,
  latePaymentAdjustment: 0,
  waterPenalty: 0,
  otherServicesFee: 0,
  totalUtilityWaterSewerBill: 404.29, // Valor da fatura da concessionária
};

export const DEFAULT_TARIFF_RATES: TariffRates = {
  tiers: [
    {
      id: 'fixedTier',
      name: "Mínimo (0-40m³)", // Nome da faixa mínima
      volume: 40, // Volume da faixa mínima em m³
      waterCostForTier: 403.36, // Custo de ÁGUA para esta faixa mínima
      isFixedValue: true,
    },
    {
      id: 'exceedingTier1',
      name: "Faixa Excedente 1 (Acima de 40m³)",
      volume: 10, // Volume DESTA FAIXA EXCEDENTE (ex: de 40.001 a 50m³)
      waterCostForTier: 15.60, // Custo da ÁGUA para esta faixa (calculado: volume * ratePerM3Water)
      isFixedValue: false,
      ratePerM3Water: 1.56, // Valor do m³ de ÁGUA para esta faixa excedente
    },
  ],
  sewerRatePercentage: 80, // Esgoto é 80% do valor da água
};


export const FIXED_APARTMENT_UNIT_NUMBERS: string[] = ["11", "12", "21", "22", "31", "32", "41", "42"];

// Returns a static default list, does not access localStorage on server.
// Client-side useEffect in useCondoDataManager will handle localStorage.
export const createInitialApartmentsList = (): ApartmentData[] => {
  return FIXED_APARTMENT_UNIT_NUMBERS.map(unitNumber => ({
    id: crypto.randomUUID(), // Use crypto.randomUUID for unique IDs
    unitNumber: unitNumber,
    area: 100, // Default area
    previousReading: 0,
    currentReading: 0,
  }));
};


export const enrichTariffTiers = (rates: TariffRates): TariffRates => {
  const enrichedTiers = rates.tiers.map(tier => {
    let currentWaterCostForTier = tier.waterCostForTier;

    if (!tier.isFixedValue && typeof tier.ratePerM3Water === 'number' && typeof tier.volume === 'number' && tier.volume >= 0) {
      currentWaterCostForTier = tier.volume * tier.ratePerM3Water;
    }

    const sewerCost = currentWaterCostForTier * (rates.sewerRatePercentage / 100);
    return {
      ...tier,
      waterCostForTier: parseFloat(currentWaterCostForTier.toFixed(2)),
      sewerCostForTier: parseFloat(sewerCost.toFixed(2)),
      totalCostForTier: parseFloat((currentWaterCostForTier + sewerCost).toFixed(2)),
    };
  });
  return { ...rates, tiers: enrichedTiers };
};
