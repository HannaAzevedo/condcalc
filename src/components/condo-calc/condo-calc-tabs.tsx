
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataInputTab } from "./data-input-tab";
import type { DataInputTabProps } from "./data-input-tab";
import { CalculationsTab } from "./calculations-tab";
import type { CalculationsTabProps } from "./calculations-tab";
import { HistoryTab } from "./history-tab";
import type { HistoryTabProps } from "./history-tab";
import { LayoutGrid, Calculator, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useCondoDataManager } from "@/hooks/use-condo-data-manager";

export function CondoCalcTabs() {
  const {
    commonExpenses,
    updateCommonExpenses,
    tariffRates,
    updateTariffRates,
    apartments,
    setApartments,
    performCalculations,
    saveToHistory,
    currentMonthYear,
    setCurrentMonthYear,
    calculatedBills,
    history,
    loadMonthFromHistory,
    canImportPreviousReadings,
    importPreviousMonthReadings,
  } = useCondoDataManager();

  const dataInputTabProps: DataInputTabProps = {
    commonExpenses,
    updateCommonExpenses,
    tariffRates,
    updateTariffRates,
    apartments,
    setApartments,
    performCalculations,
    saveToHistory,
    currentMonthYear,
    setCurrentMonthYear,
    canImportPreviousReadings,
    importPreviousMonthReadings,
  };

  const calculationsTabProps: CalculationsTabProps = {
    calculatedBills,
    commonExpenses,
    tariffRates,
    currentMonthYear, // Pass currentMonthYear here
  };

  const historyTabProps: HistoryTabProps = {
    history,
    loadMonthFromHistory,
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 md:p-6 lg:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary tracking-tight">
          CondoCalc
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Gerenciador de Contas de Água Condominial
        </p>
      </header>
      <Tabs defaultValue="data-input" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-12 mb-6 rounded-lg shadow-sm">
          <TabsTrigger value="data-input" className="py-2.5 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md sm:rounded-l-md sm:rounded-r-none">
            <LayoutGrid className="mr-2 h-5 w-5" /> Entrada de Dados
          </TabsTrigger>
          <TabsTrigger value="calculations" className="py-2.5 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md sm:rounded-none">
            <Calculator className="mr-2 h-5 w-5" /> Cálculos
          </TabsTrigger>
          <TabsTrigger value="history" className="py-2.5 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md sm:rounded-r-md sm:rounded-l-none">
            <History className="mr-2 h-5 w-5" /> Histórico
          </TabsTrigger>
        </TabsList>
        
        <Card className="shadow-xl border-none">
          <CardContent className="p-0">
            <TabsContent value="data-input">
              <DataInputTab {...dataInputTabProps} />
            </TabsContent>
            <TabsContent value="calculations">
              <CalculationsTab {...calculationsTabProps} />
            </TabsContent>
            <TabsContent value="history">
              <HistoryTab {...historyTabProps} />
            </TabsContent>
          </CardContent>
        </Card>

        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-12 mt-6 rounded-lg shadow-sm">
          <TabsTrigger value="data-input" className="py-2.5 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md sm:rounded-l-md sm:rounded-r-none">
            <LayoutGrid className="mr-2 h-5 w-5" /> Entrada de Dados
          </TabsTrigger>
          <TabsTrigger value="calculations" className="py-2.5 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md sm:rounded-none">
            <Calculator className="mr-2 h-5 w-5" /> Cálculos
          </TabsTrigger>
          <TabsTrigger value="history" className="py-2.5 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md rounded-md sm:rounded-r-md sm:rounded-l-none">
            <History className="mr-2 h-5 w-5" /> Histórico
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
