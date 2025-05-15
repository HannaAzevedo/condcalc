"use client";

import type { MouseEventHandler } from 'react';
import { CommonExpensesForm } from "./common-expenses-form";
import { ApartmentDataForm } from "./apartment-data-form";
import { TariffRatesForm } from "./tariff-rates-form";
import { Button } from "@/components/ui/button";
import { Calculator, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import type { CommonExpenses, TariffRates, ApartmentData } from '@/lib/types';

export interface DataInputTabProps {
  commonExpenses: CommonExpenses;
  updateCommonExpenses: (newExpenses: CommonExpenses) => void;
  tariffRates: TariffRates;
  updateTariffRates: (newRates: TariffRates) => void;
  apartments: ApartmentData[];
  setApartments: (newApartments: ApartmentData[]) => void;
  performCalculations: () => boolean;
  saveToHistory: () => void;
  currentMonthYear: string;
  setCurrentMonthYear: (monthYear: string) => void;
  canImportPreviousReadings: boolean;
  importPreviousMonthReadings: () => void;
}

export function DataInputTab({
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
}: DataInputTabProps) {
  const { toast } = useToast();

  const handleCalculateOnly: MouseEventHandler<HTMLButtonElement> = () => {
    performCalculations();
  };

  const handleCalculateAndSaveToHistory: MouseEventHandler<HTMLButtonElement> = () => {
    const calculationsSuccessful = performCalculations();
    if (calculationsSuccessful) {
      saveToHistory();
    } else {
      toast({
        title: "Salvamento Bloqueado",
        description: "Os cálculos devem ser bem-sucedidos antes de salvar no histórico.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div>
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-primary">Mês de Referência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label htmlFor="monthYear" className="text-sm font-medium text-foreground/80">Selecione o Mês/Ano</Label>
              <Input
                id="monthYear"
                type="month"
                value={currentMonthYear}
                onChange={(e) => setCurrentMonthYear(e.target.value)}
                className="bg-secondary text-foreground border-input focus:ring-accent mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <CommonExpensesForm
          defaultValues={commonExpenses}
          onSubmit={updateCommonExpenses}
        />

        <ApartmentDataForm
          defaultValues={apartments}
          onApartmentChange={setApartments}
          onSubmit={() => { /* onSubmit for ApartmentDataForm is handled internally for validation and update via onApartmentChange */ }}
          canImportPreviousReadings={canImportPreviousReadings}
          onImportPreviousReadings={importPreviousMonthReadings}
        />

        <TariffRatesForm
          defaultValues={tariffRates}
          onSubmit={updateTariffRates}
        />

        <div className="mt-8 flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4">
           <Button 
            type="button"
            onClick={handleCalculateOnly}
            className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto py-3 px-6 text-base rounded-lg shadow-md transition-transform duration-150 hover:scale-105"
            aria-label="Calcular Contas"
          >
            <Calculator className="mr-2 h-5 w-5" /> Calcular Contas
          </Button>
          <Button 
            type="button" 
            onClick={handleCalculateAndSaveToHistory}
            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto py-3 px-6 text-base rounded-lg shadow-md transition-transform duration-150 hover:scale-105"
            aria-label="Salvar Dados no Histórico"
          >
            <Save className="mr-2 h-5 w-5" /> Salvar no Histórico
          </Button>
        </div>
      </div>
    </div>
  );
}