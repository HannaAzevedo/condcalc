"use client";

import type { Control } from "react-hook-form";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { CommonExpenses } from "@/lib/types";
import { DollarSign } from "lucide-react";

const commonExpensesSchema = z.object({
  garbageFee: z.number().min(0, "Cannot be negative"),
  garbageFeePenalty: z.number().min(0, "Cannot be negative"),
  latePaymentAdjustment: z.number().min(0, "Cannot be negative"),
  waterPenalty: z.number().min(0, "Cannot be negative"),
  otherServicesFee: z.number().min(0, "Cannot be negative"),
});

type CommonExpensesFormData = z.infer<typeof commonExpensesSchema>;

interface CommonExpensesFormProps {
  defaultValues: CommonExpenses;
  onSubmit: (data: CommonExpenses) => void;
}

export function CommonExpensesForm({ defaultValues, onSubmit }: CommonExpensesFormProps) {
  const { control, handleSubmit, formState: { errors } } = useForm<CommonExpensesFormData>({
    resolver: zodResolver(commonExpensesSchema),
    defaultValues,
  });

  const fields = [
    { name: "garbageFee", label: "Taxa de Lixo", description: "Dividido igualmente entre unidades." },
    { name: "garbageFeePenalty", label: "Multa Taxa de Lixo", description: "Dividido igualmente." },
    { name: "latePaymentAdjustment", label: "Atualização Monetária", description: "Dividido igualmente." },
    { name: "waterPenalty", label: "Multa Água", description: "Dividido igualmente." },
    { name: "otherServicesFee", label: "Demais Serviços", description: "Dividido proporcionalmente pela metragem." },
  ] as const;


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">Despesas Comuns Mensais</CardTitle>
        <CardDescription>Insira os valores das despesas comuns do condomínio.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6"> {/* Replaced form with div */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map(field => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium text-foreground/80">
                  {field.label}
                </Label>
                 <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Controller
                    name={field.name}
                    control={control}
                    render={({ field: controllerField }) => (
                      <Input
                        id={field.name}
                        type="number"
                        step="0.01"
                        className="bg-secondary pl-10 text-foreground border-input focus:ring-accent"
                        {...controllerField}
                        value={controllerField.value || ''}
                        onChange={e => controllerField.onChange(parseFloat(e.target.value) || 0)}
                      />
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{field.description}</p>
                {errors[field.name] && <p className="text-sm text-destructive">{errors[field.name]?.message}</p>}
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Button 
              type="button"  // Changed from submit to button
              onClick={handleSubmit(onSubmit)} // Call onSubmit manually
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Salvar Despesas Comuns
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
