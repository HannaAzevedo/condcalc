
"use client";

import { HistoryTable } from "./history-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BookOpenText, FileDown } from "lucide-react";
import type { MonthlyRecord } from "@/lib/types";
import { exportHistoryToPDF } from "@/lib/pdf-export";
import { useToast } from "@/hooks/use-toast";

export interface HistoryTabProps {
  history: MonthlyRecord[];
  loadMonthFromHistory: (monthId: string) => void;
}

export function HistoryTab({ history, loadMonthFromHistory }: HistoryTabProps) {
  const { toast } = useToast();

  const handleDeleteRecord = (monthId: string) => {
    console.warn("Delete functionality not yet implemented for record:", monthId);
    toast({ title: "Info", description: "Funcionalidade de deletar ainda não implementada."});
  };

  const handleExportPDF = () => {
    if (history.length > 0) {
      exportHistoryToPDF(history);
      toast({
        title: "Exportação Iniciada",
        description: "Seu relatório de histórico está sendo gerado e o download começará em breve.",
        duration: 5000,
      });
    } else {
       toast({
        title: "Nenhum Dado para Exportar",
        description: "Não há histórico para exportar para PDF.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
       <div className="flex justify-between items-center">
        <div>
          {history.length === 0 && (
            <Alert className="border-primary/50 bg-primary/5 text-primary">
              <BookOpenText className="h-5 w-5 text-primary" />
              <AlertTitle className="font-semibold">Histórico Vazio</AlertTitle>
              <AlertDescription>
                Nenhum dado histórico foi salvo ainda. Após calcular e salvar os dados de um mês na aba "Entrada de Dados", eles aparecerão aqui.
              </AlertDescription>
            </Alert>
          )}
        </div>
        {history.length > 0 && (
          <Button
            onClick={handleExportPDF}
            variant="outline"
            className="text-primary border-primary hover:bg-primary/10"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar Histórico para PDF
          </Button>
        )}
      </div>
      <HistoryTable 
        historyRecords={history} 
        onViewRecord={loadMonthFromHistory}
        onDeleteRecord={handleDeleteRecord}
      />
    </div>
  );
}

