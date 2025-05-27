"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ApartmentData } from "@/lib/types";
import { Home, Thermometer, Droplets, DownloadCloud } from "lucide-react"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const apartmentSchema = z.object({
  id: z.string(),
  unitNumber: z.string().min(1, "Número da unidade é obrigatório."),
  area: z.number().positive("Metragem deve ser positiva."),
  previousReading: z.number().min(0, "Leitura não pode ser negativa."),
  currentReading: z.number().min(0, "Leitura não pode ser negativa."),
});

export const apartmentsListSchema = z.object({
  apartments: z.array(apartmentSchema).refine(
    (apartments) => apartments.every(ap => ap.currentReading >= ap.previousReading),
    {
      message: "Leitura atual deve ser maior ou igual à anterior para todas as unidades.",
    }
  ),
});

type ApartmentsFormData = z.infer<typeof apartmentsListSchema>;

interface ApartmentDataFormProps {
  defaultValues?: ApartmentData[];
  onSubmit: (data: ApartmentData[]) => void; 
  onApartmentChange: (apartments: ApartmentData[]) => void;
  canImportPreviousReadings: boolean;
  onImportPreviousReadings: () => void;
}

export function ApartmentDataForm({ defaultValues = [], onApartmentChange, canImportPreviousReadings, onImportPreviousReadings }: ApartmentDataFormProps) {
  const { toast } = useToast();
  const { control, handleSubmit, watch, formState: { errors }, reset } = useForm<ApartmentsFormData>({
    resolver: zodResolver(apartmentsListSchema),
    defaultValues: { apartments: defaultValues },
    mode: "onChange", 
  });

  const { fields } = useFieldArray({
    control,
    name: "apartments",
  });
  
  const watchedApartments = watch("apartments");
  
  const handleFormSubmit = (data: ApartmentsFormData) => {
    const invalidReadings = data.apartments.filter(ap => ap.currentReading < ap.previousReading);
    if (invalidReadings.length > 0) {
      toast({
        title: "Erro de Leitura",
        description: `A leitura atual não pode ser menor que a anterior. Verifique as unidades: ${invalidReadings.map(ap => ap.unitNumber).join(', ')}.`,
        variant: "destructive",
        duration: 5000,
      });
      return; 
    }
    onApartmentChange(data.apartments);
    toast({
      title: "Dados das Unidades Atualizados",
      description: "As informações das unidades foram salvas.",
    });
  };

  React.useEffect(() => {
    if (defaultValues && defaultValues.length > 0) {
        reset({ apartments: defaultValues });
    }
  }, [defaultValues, reset]);


  return (
    <Card className="shadow-lg mt-6">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">Dados das Unidades (Apartamentos)</CardTitle>
        <div className="flex justify-between items-center">
            <CardDescription>Insira os detalhes de cada unidade, incluindo leituras dos hidrômetros. A lista de apartamentos é fixa.</CardDescription>
            {canImportPreviousReadings && (
                <Button 
                    type="button"
                    variant="outline"
                    onClick={onImportPreviousReadings}
                    className="ml-4 text-sm border-primary text-primary hover:bg-primary/10"
                >
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Importar Leituras do Mês Anterior
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {fields.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Nenhuma unidade para exibir. Verifique as configurações.</p>
          )}
          {fields.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Unidade (AP)</TableHead>
                    <TableHead className="min-w-[150px]">Leitura Anterior (m³)</TableHead>
                    <TableHead className="min-w-[150px]">Leitura Atual (m³)</TableHead>
                    <TableHead className="min-w-[120px] text-right">
                        <div className="flex items-center justify-end">
                            <Droplets className="mr-1 h-4 w-4 text-muted-foreground" /> Consumo (m³)
                        </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="relative">
                           <Home className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Controller
                            name={`apartments.${index}.unitNumber`}
                            control={control}
                            render={({ field }) => <Input {...field} className="bg-secondary pl-8 text-foreground border-input focus:ring-accent" placeholder="Ex: 101" readOnly disabled />}
                          />
                        </div>
                        {errors.apartments?.[index]?.unitNumber && <p className="text-xs text-destructive mt-1">{errors.apartments[index]?.unitNumber?.message}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Thermometer className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Controller
                            name={`apartments.${index}.previousReading`}
                            control={control}
                            render={({ field }) => <Input type="number" step="0.001" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="bg-secondary pl-8 text-foreground border-input focus:ring-accent"/>}
                          />
                        </div>
                        {errors.apartments?.[index]?.previousReading && <p className="text-xs text-destructive mt-1">{errors.apartments[index]?.previousReading?.message}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <Thermometer className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Controller
                            name={`apartments.${index}.currentReading`}
                            control={control}
                            render={({ field }) => <Input type="number" step="0.001" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="bg-secondary pl-8 text-foreground border-input focus:ring-accent"/>}
                          />
                        </div>
                        {errors.apartments?.[index]?.currentReading && <p className="text-xs text-destructive mt-1">{errors.apartments[index]?.currentReading?.message}</p>}
                        {watchedApartments[index]?.currentReading < watchedApartments[index]?.previousReading && (
                            <p className="text-xs text-destructive mt-1">Leitura atual menor que anterior!</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {
                          (() => {
                            const prev = watchedApartments?.[index]?.previousReading;
                            const curr = watchedApartments?.[index]?.currentReading;
                            if (typeof prev === 'number' && typeof curr === 'number') {
                              if (curr >= prev) {
                                return (curr - prev).toFixed(0);
                              } else {
                                return <span className="text-destructive font-medium">Inválido</span>;
                              }
                            }
                            return '0'; 
                          })()
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
           <div className="flex justify-end items-center pt-4">
            {fields.length > 0 && (
              <Button 
                type="button"
                onClick={handleSubmit(handleFormSubmit)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Salvar Dados das Unidades
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
