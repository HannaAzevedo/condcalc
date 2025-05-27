
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
  parseAndValidateTariffRates,
} from '@/lib/types';
import { calculateAllApartments } from '@/lib/calculations';
import { useToast } from "@/hooks/use-toast";

const COMMON_EXPENSES_STORAGE_KEY = 'condoCalcCommonExpenses';
const TARIFF_RATES_STORAGE_KEY = 'condoCalcTariffRates';
const APARTMENTS_STORAGE_KEY = 'condoCalcApartments';
const HISTORY_STORAGE_KEY = 'condoCalcHistory';

export function useCondoDataManager() {
  const { toast } = useToast();

  // Initialize with default values first for consistent server/client initial render
  const [commonExpenses, setCommonExpensesState] = useState<CommonExpenses>(DEFAULT_COMMON_EXPENSES);
  const [tariffRates, setTariffRatesState] = useState<TariffRates>(() => enrichTariffTiers(DEFAULT_TARIFF_RATES));
  const [apartments, setApartmentsInternalState] = useState<ApartmentData[]>(createInitialApartmentsList);
  const [history, setHistoryState] = useState<MonthlyRecord[]>([]);

  const [calculatedBills, setCalculatedBills] = useState<CalculatedApartmentData[]>([]);
  const [currentMonthYear, setCurrentMonthYearInternal] = useState<string>(() => {
    if (typeof window !== 'undefined') {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    // Fallback for SSR, though this might be set again on client
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [canImportPreviousReadings, setCanImportPreviousReadings] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);


  // Effect to load data from localStorage on the client after initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCommonExpenses = localStorage.getItem(COMMON_EXPENSES_STORAGE_KEY);
      if (storedCommonExpenses) {
        try {
          const parsed = JSON.parse(storedCommonExpenses);
          // Basic validation
          if (typeof parsed.garbageFee === 'number') {
            setCommonExpensesState(parsed);
          }
        } catch (e) { console.error("Error parsing common expenses from localStorage", e); }
      }

      const storedTariffRates = localStorage.getItem(TARIFF_RATES_STORAGE_KEY);
      // parseAndValidateTariffRates handles null, parsing, validation, and enrichment
      setTariffRatesState(parseAndValidateTariffRates(storedTariffRates));
      
      const storedApartments = localStorage.getItem(APARTMENTS_STORAGE_KEY);
      if (storedApartments) {
        try {
          const parsedApts = JSON.parse(storedApartments) as ApartmentData[];
          const initialAptsFromFixed = createInitialApartmentsList();

          if (
            Array.isArray(parsedApts) &&
            parsedApts.length === initialAptsFromFixed.length &&
            parsedApts.every(ap => FIXED_APARTMENT_UNIT_NUMBERS.includes(ap.unitNumber))
          ) {
            const alignedApartments = initialAptsFromFixed.map(fixedAp => {
              const storedApData = parsedApts.find(sAp => sAp.unitNumber === fixedAp.unitNumber);
              return {
                ...fixedAp,
                previousReading: storedApData ? storedApData.previousReading : 0,
                currentReading: storedApData ? storedApData.currentReading : 0,
              };
            });
            setApartmentsInternalState(alignedApartments);
          } else {
             console.warn("Stored apartments data malformed or mismatched, using default list for this load cycle.");
             // Do not reset to default here if it's already set by useState,
             // only log or handle if necessary. The useState already sets a default.
          }
        } catch (e) {
          console.error("Error parsing apartments from localStorage, using default list for this load cycle.", e);
        }
      }

      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        try {
          const parsed = JSON.parse(storedHistory);
          if (Array.isArray(parsed)) {
            setHistoryState(parsed);
          }
        } catch (e) { console.error("Error parsing history from localStorage", e); }
      }
      setIsDataLoaded(true); // Signal that data loading attempt is complete
    }
  }, []); // Empty dependency array ensures this runs once on mount (client-side)

  // Persistence useEffects (run when the respective state changes)
  useEffect(() => {
    if (typeof window !== 'undefined' && isDataLoaded) { // Only save after initial load
      localStorage.setItem(COMMON_EXPENSES_STORAGE_KEY, JSON.stringify(commonExpenses));
    }
  }, [commonExpenses, isDataLoaded]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isDataLoaded) {
      localStorage.setItem(TARIFF_RATES_STORAGE_KEY, JSON.stringify(tariffRates));
    }
  }, [tariffRates, isDataLoaded]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isDataLoaded) {
      localStorage.setItem(APARTMENTS_STORAGE_KEY, JSON.stringify(apartments));
    }
  }, [apartments, isDataLoaded]);

  useEffect(() => {
    if (typeof window !== 'undefined' && isDataLoaded) {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    }
  }, [history, isDataLoaded]);


  // Effect to determine if previous month's readings can be imported
 useEffect(() => {
    if (typeof window === 'undefined' || !history.length || !isDataLoaded) {
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
  }, [currentMonthYear, history, isDataLoaded]);


  const updateCommonExpenses = useCallback((newExpenses: CommonExpenses) => {
    setCommonExpensesState(newExpenses);
    toast({ title: "Despesas Comuns Salvas", description: "As despesas comuns foram atualizadas." });
  }, [toast]);

  const updateTariffRates = useCallback((newRates: TariffRates) => {
    const enrichedRates = enrichTariffTiers(newRates);
    setTariffRatesState(enrichedRates);
    toast({ title: "Tarifas Salvas", description: "As tarifas de consumo foram atualizadas." });
  }, [toast]);

  const updateApartments = useCallback((newApartments: ApartmentData[]) => {
    const initialApts = createInitialApartmentsList();
    const stableNewApartments = newApartments.map(ap => {
        const defaultAp = initialApts.find(d => d.unitNumber === ap.unitNumber);
        return {
            ...ap,
            id: defaultAp ? defaultAp.id : (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString()),
            area: defaultAp ? defaultAp.area : 100,
        };
    });
    setApartmentsInternalState(stableNewApartments);
  }, []);

  const setCurrentMonthYear = useCallback((monthYear: string) => {
    setCurrentMonthYearInternal(monthYear);
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

    setHistoryState(prevHistory => {
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
      setCommonExpensesState(record.commonExpenses);
      setTariffRatesState(enrichTariffTiers(record.tariffRates)); 
      
      const initialAptsForMapping = createInitialApartmentsList();
      const baseApartmentsFromHistory = record.apartmentsData.map(calcAp => {
        const { consumption, waterCost, excessTierCostTotal, equalShareCommonExpenses, proportionalServiceFee, totalBill, tierCostBreakdown, minimumFixedCostShare, ...baseAp } = calcAp;
        const defaultAp = initialAptsForMapping.find(d => d.unitNumber === baseAp.unitNumber);
        return {
          ...baseAp,
          id: defaultAp ? defaultAp.id : (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString()),
          area: defaultAp ? defaultAp.area : 100,
        };
      });
      setApartmentsInternalState(baseApartmentsFromHistory);
      setCalculatedBills(record.apartmentsData);
      setCurrentMonthYearInternal(record.monthYear);
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
  }, [history, toast]); 

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
      const updatedApartmentsList = apartments.map(currentAp => {
        const prevApData = previousMonthRecord.apartmentsData.find(
          prevRecAp => prevRecAp.unitNumber === currentAp.unitNumber
        );
        if (prevApData) {
          return {
            ...currentAp,
            previousReading: prevApData.currentReading, // Import current from prev as previous for new
            currentReading: 0, // Optionally reset current reading for the new month
          };
        }
        return currentAp;
      });
      setApartmentsInternalState(updatedApartmentsList); 
      toast({
        title: "Leituras Importadas",
        description: `As leituras atuais de ${previousMonthRecord.monthYear} foram copiadas para as leituras anteriores de ${currentMonthYear}. As leituras atuais foram zeradas.`,
      });
    } else {
      toast({
        title: "Importação Falhou",
        description: "Não foi possível encontrar dados do mês anterior para importar ou os dados estão incompletos.",
        variant: "destructive",
      });
    }
  }, [currentMonthYear, history, apartments, toast]); 


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
    isDataLoaded, // Expose this if components need to know if data is ready
  };
}

