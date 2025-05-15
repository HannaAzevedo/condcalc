
"use client";

import { ResultsTable } from "./results-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Info, FileDown } from "lucide-react";
import type { CalculatedApartmentData, CommonExpenses, TariffRates } from "@/lib/types";
import { exportCalculationsToPDF } from "@/lib/pdf-export";
import { useToast } from "@/hooks/use-toast";

export interface CalculationsTabProps {
  calculatedBills: CalculatedApartmentData[];
  commonExpenses: CommonExpenses;
  tariffRates: TariffRates;
  currentMonthYear: string; // Added currentMonthYear
}

export function CalculationsTab({ calculatedBills, commonExpenses, tariffRates, currentMonthYear }: CalculationsTabProps) {
  const { toast } = useToast();

  const handleExportPDF = () => {
    if (calculatedBills.length > 0) {
      exportCalculationsToPDF(calculatedBills, commonExpenses, tariffRates, currentMonthYear); // Pass currentMonthYear
      toast({
        title: "Exportação Iniciada",
        description: "Seu relatório de cálculos está sendo gerado e o download começará em breve.",
        duration: 5000,
      });
    } else {
      toast({
        title: "Nenhum Dado para Exportar",
        description: "Não há cálculos para exportar para PDF.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div> {/* This div is to keep the Alert aligned left if button is present */}
          {calculatedBills.length === 0 && (
            <Alert className="border-primary/50 bg-primary/5 text-primary">
              <Info className="h-5 w-5 text-primary" />
              <AlertTitle className="font-semibold">Nenhum Cálculo Realizado</AlertTitle>
              <AlertDescription>
                Os resultados dos cálculos aparecerão aqui após você inserir os dados na aba "Entrada de Dados" e clicar em "Calcular Contas".
              </AlertDescription>
            </Alert>
          )}
        </div>
        {calculatedBills.length > 0 && (
          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="text-primary border-primary hover:bg-primary/10"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar para PDF
          </Button>
        )}
      </div>
      <ResultsTable calculatedData={calculatedBills} commonExpenses={commonExpenses} tariffRates={tariffRates} />
    </div>
  );
}

