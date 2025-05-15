"use client";

import type { MonthlyRecord } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription }  from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, CalendarDays, Droplets, DollarSign } from "lucide-react";

interface HistoryTableProps {
  historyRecords: MonthlyRecord[];
  onViewRecord: (monthId: string) => void;
  onDeleteRecord: (monthId: string) => void; // Placeholder for future delete functionality
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export function HistoryTable({ historyRecords, onViewRecord, onDeleteRecord }: HistoryTableProps) {
  if (!historyRecords || historyRecords.length === 0) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-primary">Histórico Mensal</CardTitle>
           <CardDescription>Nenhum histórico encontrado. Os registros aparecerão aqui após salvar os cálculos.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Sem histórico.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary flex items-center">
            <CalendarDays className="mr-3 h-7 w-7 text-primary/80" />
            Histórico Mensal
        </CardTitle>
        <CardDescription>Acompanhamento dos gastos e consumos mensais do condomínio.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[600px] w-full overflow-x-auto">
          <Table>
            <TableCaption className="mt-2">Histórico de registros mensais.</TableCaption>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-foreground">Mês/Ano</TableHead>
                <TableHead className="text-right font-semibold text-foreground"><Droplets className="inline mr-1 h-4 w-4" />Consumo Total (m³)</TableHead>
                <TableHead className="text-right font-semibold text-foreground"><DollarSign className="inline mr-1 h-4 w-4" />Conta Total (R$)</TableHead>
                <TableHead className="text-right font-semibold text-foreground"><DollarSign className="inline mr-1 h-4 w-4" />Média/Unidade (R$)</TableHead>
                <TableHead className="text-center font-semibold text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyRecords.map((record) => (
                <TableRow key={record.id} className="hover:bg-secondary/30">
                  <TableCell className="font-medium">{record.monthYear}</TableCell>
                  <TableCell className="text-right">{record.totalCondoConsumption.toFixed(3)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(record.totalCondoBill)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(record.averageBillPerUnit)}</TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => onViewRecord(record.id)} className="text-primary border-primary hover:bg-primary/10">
                      <Eye className="mr-1 h-4 w-4" /> Ver
                    </Button>
                    {/* Delete functionality can be added later if needed 
                    <Button variant="ghost" size="sm" onClick={() => onDeleteRecord(record.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="mr-1 h-4 w-4" /> Deletar
                    </Button>
                    */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}