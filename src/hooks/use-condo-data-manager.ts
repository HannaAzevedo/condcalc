import { useState, useEffect, useCallback } from 'react';
import type {
  ApartmentData,
  CommonExpenses,
  TariffRates,
  MonthlyRecord,
  CalculatedApartmentData,
} from '@/lib/types';
import {
  DEFAULT_COMMON_EXPENSES,
  DEFAULT_TARIFF_RATES,
  FIXED_APARTMENT_UNIT_NUMBERS,
  createInitialApartmentsList, 
  enrichTariffTiers, 
} from '@/lib/types';
import { calculateAllApartments } from '@/lib/calculations';
import { useToast } from "@/hooks/use-toast";

const COMMON_EXPENSES_STORAGE_KEY = 'condoCalcCommonExpenses';
const TARIFF_RATES_STORAGE_KEY = 'condoCalcTariffRates';
const APARTMENTS_STORAGE_KEY = 'condoCalcApartments';
const HISTORY_STORAGE_KEY = 'condoCalcHistory';

const parseAndValidateTariffRates = (storedData: string | null): TariffRates => {
  let ratesToReturn = DEFAULT_TARIFF_RATES;
  if (typeof window !== 'undefined' && storedData) { // Check for window for client-side
    try {
      const parsed = JSON.parse(storedData);
      if (parsed && Array.isArray(parsed.tiers) && typeof parsed.sewerRatePercentage === 'number') {
        const isValid = parsed.tiers.every((tier: any) =>
          typeof tier.id === 'string' &&
          typeof tier.name === 'string' &&
          typeof tier.volume === 'number' &&
          typeof tier.waterCostForTier === 'number' && 
          typeof tier.isFixedValue === 'boolean'
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
  return enrichTariffTiers(ratesToReturn);
};


export function useCondoDataManager() {
  const { toast } = useToast();

  const [commonExpenses, setCommonExpenses] = useState<CommonExpenses>(DEFAULT_COMMON_EXPENSES);
  const [tariffRates, setTariffRates] = useState<TariffRates>(() => parseAndValidateTariffRates(null)); 
  const [apartments, setApartmentsInternal] = useState<ApartmentData[]>(createInitialApartmentsList());
  const [history, setHistory] = useState<MonthlyRecord[]>([]);

  const [calculatedBills, setCalculatedBills] = useState<CalculatedApartmentData[]>([]);
  const [currentMonthYear, setCurrentMonthYearInternal] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [canImportPreviousReadings, setCanImportPreviousReadings] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const storedCommonExpenses = localStorage.getItem(COMMON_EXPENSES_STORAGE_KEY);
        if (storedCommonExpenses) {
          try {
            setCommonExpenses(JSON.parse(storedCommonExpenses));
          } catch (e) { console.error("Error parsing common expenses from localStorage", e); }
        }

        const storedTariffRates = localStorage.getItem(TARIFF_RATES_STORAGE_KEY);
        setTariffRates(parseAndValidateTariffRates(storedTariffRates));

        const storedApartments = localStorage.getItem(APARTMENTS_STORAGE_KEY);
        if (storedApartments) {
          try {
            const parsedApts = JSON.parse(storedApartments) as ApartmentData[];
            const initialApts = createInitialApartmentsList();

            if (
              Array.isArray(parsedApts) &&
              parsedApts.length === initialApts.length &&
              parsedApts.every(ap => FIXED_APARTMENT_UNIT_NUMBERS.includes(ap.unitNumber))
            ) {
              const alignedApartments = parsedApts.map(loadedAp => {
                const defaultAp = initialApts.find(d => d.unitNumber === loadedAp.unitNumber);
                return {
                  ...loadedAp,
                  id: defaultAp ? defaultAp.id : loadedAp.unitNumber, // Ensure ID from initial list
                };
              });
              setApartmentsInternal(alignedApartments);
            } else {
               setApartmentsInternal(initialApts); 
            }
          } catch (e) {
            console.error("Error parsing apartments from localStorage", e);
            setApartmentsInternal(createInitialApartmentsList()); 
          }
        } else {
            setApartmentsInternal(createInitialApartmentsList());
        }


        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (storedHistory) {
          try {
            setHistory(JSON.parse(storedHistory));
          } catch (e) { console.error("Error parsing history from localStorage", e); }
        }
    }
  }, []);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(COMMON_EXPENSES_STORAGE_KEY, JSON.stringify(commonExpenses));
    }
  }, [commonExpenses]);

  useEffect(() => {
     if (typeof window !== 'undefined') {
        localStorage.setItem(TARIFF_RATES_STORAGE_KEY, JSON.stringify(tariffRates));
     }
  }, [tariffRates]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(APARTMENTS_STORAGE_KEY, JSON.stringify(apartments));
    }
  }, [apartments]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  // Effect to determine if previous month's readings can be imported
  useEffect(() => {
    if (typeof window === 'undefined' || !history.length) {
      setCanImportPreviousReadings(false);
      return;
    }

    const [year, month] = currentMonthYear.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevMonthId = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const previousMonthRecord = history.find(record => record.id === prevMonthId);
    setCanImportPreviousReadings(!!previousMonthRecord && !!previousMonthRecord.apartmentsData?.length);
  }, [currentMonthYear, history]);


  const updateCommonExpenses = useCallback((newExpenses: CommonExpenses) => {
    setCommonExpenses(newExpenses);
    toast({ title: "Despesas Comuns Salvas", description: "As despesas comuns foram atualizadas." });
  }, [toast]);

  const updateTariffRates = useCallback((newRates: TariffRates) => {
    const enrichedRates = enrichTariffTiers(newRates); 
    setTariffRates(enrichedRates);
    toast({ title: "Tarifas Salvas", description: "As tarifas de consumo foram atualizadas." });
  }, [toast]);

  const updateApartments = useCallback((newApartments: ApartmentData[]) => {
    const initialApts = createInitialApartmentsList();
    const stableNewApartments = newApartments.map(ap => {
        const defaultAp = initialApts.find(d => d.unitNumber === ap.unitNumber);
        return {
            ...ap,
            id: defaultAp ? defaultAp.id : ap.unitNumber, 
        };
    });
    setApartmentsInternal(stableNewApartments);
  }, []);

  const setCurrentMonthYear = useCallback((monthYear: string) => {
    setCurrentMonthYearInternal(monthYear);
    // When month changes, reset calculated bills as they are for the previous month
    setCalculatedBills([]); 
  }, []);


  const performCalculations = useCallback(() => {
    if (apartments.length === 0) {
      toast({
        title: "Nenhuma Unidade",
        description: "Por favor, adicione dados das unidades antes de calcular.",
        variant: "destructive",
      });
      setCalculatedBills([]);
      return false;
    }
    const hasInvalidReadings = apartments.some(ap => ap.currentReading < ap.previousReading);
    if (hasInvalidReadings) {
      toast({
        title: "Erro de Leitura",
        description: "Leitura atual não pode ser menor que a anterior. Verifique os dados das unidades.",
        variant: "destructive",
        duration: 5000,
      });
      setCalculatedBills([]);
      return false;
    }
    
    const ratesForCalc = tariffRates.tiers.some(t => t.totalCostForTier === undefined) ? enrichTariffTiers(tariffRates) : tariffRates;

    const results = calculateAllApartments(apartments, commonExpenses, ratesForCalc);
    setCalculatedBills(results);
    toast({
      title: "Cálculos Concluídos",
      description: "As contas foram calculadas com sucesso.",
    });
    return true;
  }, [apartments, commonExpenses, tariffRates, toast]);

  const saveToHistory = useCallback(() => {
    if (calculatedBills.length === 0) {
      toast({
        title: "Sem Cálculos para Salvar",
        description: "Por favor, realize os cálculos primeiro.",
        variant: "destructive",
      });
      return;
    }

    const totalCondoConsumption = calculatedBills.reduce((sum, ap) => sum + ap.consumption, 0);
    const totalCondoBill = calculatedBills.reduce((sum, ap) => sum + ap.totalBill, 0);
    const totalCondoReading = apartments.reduce((sum, ap) => sum + ap.currentReading, 0);
    const averageBillPerUnit = calculatedBills.length > 0 ? totalCondoBill / calculatedBills.length : 0;

    const newRecord: MonthlyRecord = {
      id: currentMonthYear,
      monthYear: currentMonthYear,
      totalCondoReading,
      totalCondoConsumption,
      totalCondoBill,
      averageBillPerUnit,
      apartmentsData: JSON.parse(JSON.stringify(calculatedBills)),
      commonExpenses: JSON.parse(JSON.stringify(commonExpenses)),
      tariffRates: JSON.parse(JSON.stringify(enrichTariffTiers(tariffRates))) 
    };

    setHistory(prevHistory => {
      const updatedHistory = prevHistory.filter(record => record.id !== currentMonthYear);
      return [...updatedHistory, newRecord].sort((a, b) => b.id.localeCompare(a.id));
    });

    toast({
      title: "Histórico Atualizado/Salvo",
      description: `Os dados de ${currentMonthYear} foram processados no histórico.`,
    });

  }, [calculatedBills, commonExpenses, tariffRates, currentMonthYear, toast, apartments]);

  const loadMonthFromHistory = useCallback((monthId: string) => {
    const record = history.find(r => r.id === monthId);
    if (record) {
      setCommonExpenses(record.commonExpenses);
      setTariffRates(enrichTariffTiers(record.tariffRates));
      
      const initialAptsForMapping = createInitialApartmentsList();
      const baseApartmentsFromHistory = record.apartmentsData.map(calcAp => {
        const { consumption, waterCost, excessTierCostTotal, equalShareCommonExpenses, proportionalServiceFee, totalBill, tierCostBreakdown, minimumFixedCostShare, ...baseAp } = calcAp;
        const defaultAp = initialAptsForMapping.find(d => d.unitNumber === baseAp.unitNumber);
        return {
          ...baseAp,
          id: defaultAp ? defaultAp.id : baseAp.unitNumber, 
        };
      });
      updateApartments(baseApartmentsFromHistory);
      setCalculatedBills(record.apartmentsData);
      setCurrentMonthYearInternal(record.monthYear); // Use internal setter to avoid clearing calculatedBills
      toast({
        title: "Dados Carregados",
        description: `Dados de ${record.monthYear} carregados do histórico.`,
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível encontrar o mês selecionado no histórico.",
        variant: "destructive",
      });
    }
  }, [history, toast, updateApartments]);

  const importPreviousMonthReadings = useCallback(() => {
    const [year, month] = currentMonthYear.split('-').map(Number);
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevMonthId = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const previousMonthRecord = history.find(record => record.id === prevMonthId);

    if (previousMonthRecord && previousMonthRecord.apartmentsData) {
      const updatedApartments = apartments.map(currentAp => {
        const prevApData = previousMonthRecord.apartmentsData.find(
          prevRecAp => prevRecAp.unitNumber === currentAp.unitNumber
        );
        if (prevApData) {
          return {
            ...currentAp,
            previousReading: prevApData.currentReading,
          };
        }
        return currentAp;
      });
      updateApartments(updatedApartments);
      toast({
        title: "Leituras Importadas",
        description: `As leituras atuais de ${previousMonthRecord.monthYear} foram copiadas para as leituras anteriores de ${currentMonthYear}.`,
      });
    } else {
      toast({
        title: "Importação Falhou",
        description: "Não foi possível encontrar dados do mês anterior para importar ou os dados estão incompletos.",
        variant: "destructive",
      });
    }
  }, [currentMonthYear, history, apartments, updateApartments, toast]);


  return {
    commonExpenses,
    updateCommonExpenses,
    tariffRates,
    updateTariffRates,
    apartments,
    setApartments: updateApartments,
    history,
    calculatedBills,
    performCalculations,
    saveToHistory,
    currentMonthYear,
    setCurrentMonthYear,
    loadMonthFromHistory,
    canImportPreviousReadings,
    importPreviousMonthReadings,
  };
}