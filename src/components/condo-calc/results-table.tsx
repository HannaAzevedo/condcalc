
"use client";

import type { CalculatedApartmentData, CommonExpenses, TariffRates } from "@/lib/types"; 
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
  TableFooter,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Droplets, Home, PieChart, Users } from "lucide-react"; 
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCondoDataManager } from "@/hooks/use-condo-data-manager"; 

interface ResultsTableProps {
  calculatedData: CalculatedApartmentData[];
  commonExpenses: CommonExpenses; 
  tariffRates: TariffRates;
}

const formatCurrency = (value: number | undefined | null): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'R$ 0,00'; 
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function ResultsTable({ calculatedData, commonExpenses, tariffRates }: ResultsTableProps) {
  // const { tariffRates } = useCondoDataManager(); // tariffRates is now passed as a prop

  if (!calculatedData || calculatedData.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary">Resultados dos Cálculos</CardTitle>
          <CardDescription>Nenhum dado calculado para exibir. Por favor, insira os dados e clique em "Calcular Contas" na aba "Entrada de Dados".</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Sem resultados.</p>
        </CardContent>
      </Card>
    );
  }

  const totalConsumption = calculatedData.reduce((sum, ap) => sum + ap.consumption, 0);
  const totalWaterCost = calculatedData.reduce((sum, ap) => sum + ap.waterCost, 0);
  const totalExcessTierCost = calculatedData.reduce((sum, ap) => sum + ap.excessTierCostTotal, 0); 
  const totalEqualShareCommonExpenses = calculatedData.reduce((sum, ap) => sum + ap.equalShareCommonExpenses, 0);
  const totalProportionalServiceFee = calculatedData.reduce((sum, ap) => sum + ap.proportionalServiceFee, 0);
  const totalOverallBill = calculatedData.reduce((sum, ap) => sum + ap.totalBill, 0);
  const totalMinimumFixedCostShare = calculatedData.reduce((sum, ap) => sum + ap.minimumFixedCostShare, 0);
  
  const fixedTierFromConfig = tariffRates.tiers.find(t => t.isFixedValue);
  const fixedTierNameFromConfig = fixedTierFromConfig?.name || "Faixa Mínima";
  const firstExceedingTierFromConfig = tariffRates.tiers.find(t => !t.isFixedValue);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary flex items-center">
          <PieChart className="mr-3 h-7 w-7 text-primary/80" />
          Resultados dos Cálculos
        </CardTitle>
        <CardDescription>Detalhes das contas de água calculadas para cada unidade.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[600px] w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-foreground"><Home className="inline mr-1 h-4 w-4" />Unidade</TableHead>
                <TableHead className="text-right font-semibold text-foreground"><Droplets className="inline mr-1 h-4 w-4" />Consumo (m³)</TableHead>
                <TableHead className="text-right font-semibold text-foreground"><Users className="inline mr-1 h-4 w-4" />Rateio Mínimo Fixo (R$)</TableHead>
                <TableHead className="text-right font-semibold text-foreground"><DollarSign className="inline mr-1 h-4 w-4" />Taxas Comuns (Rateio Fixo)</TableHead>
                <TableHead className="text-right font-semibold text-foreground"><DollarSign className="inline mr-1 h-4 w-4" />Custo Água/Esgoto (Total)</TableHead>
                <TableHead className="text-right font-semibold text-foreground"><DollarSign className="inline mr-1 h-4 w-4" />Custo Faixas Excedentes (R$)</TableHead>
                <TableHead className="text-right font-semibold text-foreground"><DollarSign className="inline mr-1 h-4 w-4" />Serviços (Rateio Proporcional)</TableHead>
                <TableHead className="text-right font-bold text-accent"><DollarSign className="inline mr-1 h-4 w-4" />Total a Pagar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculatedData.map((ap) => (
                <TableRow key={ap.id} className="hover:bg-secondary/30">
                  <TableCell className="font-medium">{ap.unitNumber}</TableCell>
                  <TableCell className="text-right">{ap.consumption.toFixed(3)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(ap.minimumFixedCostShare)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(ap.equalShareCommonExpenses)}</TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help underline decoration-dashed decoration-muted-foreground/50">
                            {formatCurrency(ap.waterCost)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-popover text-popover-foreground border shadow-md p-3 rounded-lg text-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-base mb-1">Detalhamento Custo Água/Esgoto:</p>
                            <div className="flex justify-between">
                              <span>{fixedTierNameFromConfig} (Rateio):</span>
                              <span>{formatCurrency(ap.minimumFixedCostShare)}</span>
                            </div>
                            {ap.excessTierCostTotal > 0 && firstExceedingTierFromConfig && (
                              <div className="flex justify-between">
                                <span>{firstExceedingTierFromConfig.name}:</span>
                                <span>{formatCurrency(ap.excessTierCostTotal)}</span>
                              </div>
                            )}
                             <div className="flex justify-between font-semibold pt-1 border-t mt-1">
                                <span>Subtotal (Água/Esgoto):</span>
                                <span>{formatCurrency(ap.waterCost)}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(ap.excessTierCostTotal)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(ap.proportionalServiceFee)}</TableCell>
                  <TableCell className="text-right font-semibold text-accent">{formatCurrency(ap.totalBill)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-semibold bg-muted/80 text-sm">
                <TableCell>TOTAIS</TableCell>
                <TableCell className="text-right">{totalConsumption.toFixed(3)} m³</TableCell>
                <TableCell className="text-right">{formatCurrency(totalMinimumFixedCostShare)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalEqualShareCommonExpenses)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalWaterCost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalExcessTierCost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalProportionalServiceFee)}</TableCell>
                <TableCell className="text-right text-accent">{formatCurrency(totalOverallBill)}</TableCell>
              </TableRow>
            </TableFooter>
            <TableCaption className="mt-4 text-sm text-muted-foreground space-y-1"/>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
