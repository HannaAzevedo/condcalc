
"use client";

import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { TariffRates, TariffTier } from "@/lib/types";
import { DollarSign, Trash2, PlusCircle, Layers, Percent, Tag, Divide } from "lucide-react"; 

const formTariffTierSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nome da faixa é obrigatório."),
  volume: z.number().min(0, "Volume da faixa não pode ser negativo."),
  waterCostForTier: z.number().min(0, "Custo de água não pode ser negativo."),
  isFixedValue: z.boolean(),
  ratePerM3Water: z.optional(z.number().min(0, "Taxa por m³ não pode ser negativa.")),
});

const formTariffRatesSchema = z.object({
  tiers: z.array(formTariffTierSchema),
  sewerRatePercentage: z.number().min(0, "Percentual de esgoto deve ser entre 0 e 100.").max(100, "Percentual não pode ser maior que 100."),
});

type TariffRatesFormData = z.infer<typeof formTariffRatesSchema>;

interface TariffRatesFormProps {
  defaultValues: TariffRates; 
  onSubmit: (data: TariffRates) => void; 
}

export function TariffRatesForm({ defaultValues, onSubmit }: TariffRatesFormProps) {
  const { control, handleSubmit, formState: { errors }, watch, setValue, getValues, reset } = useForm<TariffRatesFormData>({
    resolver: zodResolver(formTariffRatesSchema),
    defaultValues: { // Initial default values
      sewerRatePercentage: defaultValues.sewerRatePercentage,
      tiers: defaultValues.tiers.map(tier => ({
        id: tier.id,
        name: tier.name,
        volume: tier.volume,
        waterCostForTier: tier.waterCostForTier,
        isFixedValue: tier.isFixedValue,
        ratePerM3Water: tier.ratePerM3Water,
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tiers",
  });

  const watchedTiers = watch("tiers");
  const watchedSewerRatePercentage = watch("sewerRatePercentage");

  // Effect to reset the form if the defaultValues prop changes (e.g., loading from history)
  React.useEffect(() => {
    reset({
      sewerRatePercentage: defaultValues.sewerRatePercentage,
      tiers: defaultValues.tiers.map(tier => ({
        id: tier.id,
        name: tier.name,
        volume: tier.volume,
        waterCostForTier: tier.waterCostForTier, 
        isFixedValue: tier.isFixedValue,
        ratePerM3Water: tier.ratePerM3Water,
      })),
    });
  }, [defaultValues, reset]);


  // Effect to recalculate waterCostForTier for exceeding tiers when volume or ratePerM3Water changes
  React.useEffect(() => {
    watchedTiers.forEach((tier, index) => {
      if (!tier.isFixedValue && typeof tier.ratePerM3Water === 'number' && typeof tier.volume === 'number' && tier.volume >= 0) {
        const newWaterCost = tier.volume * tier.ratePerM3Water;
        const newWaterCostRounded = parseFloat(newWaterCost.toFixed(2));
        
        const currentWaterCostInForm = getValues(`tiers.${index}.waterCostForTier`);
        if (newWaterCostRounded !== currentWaterCostInForm) {
          setValue(`tiers.${index}.waterCostForTier`, newWaterCostRounded, { shouldDirty: true, shouldValidate: true });
        }
      }
    });
  }, [watchedTiers, setValue, getValues]);


  const handleFormSubmit = (formData: TariffRatesFormData) => {
    const ratesToSubmit: TariffRates = {
      sewerRatePercentage: formData.sewerRatePercentage,
      tiers: formData.tiers.map(formTier => ({
        id: formTier.id,
        name: formTier.name,
        volume: formTier.volume,
        // Ensure waterCostForTier is correctly calculated for exceeding tiers before submission
        waterCostForTier: (!formTier.isFixedValue && typeof formTier.ratePerM3Water === 'number' && typeof formTier.volume === 'number' && formTier.volume >=0) 
                            ? parseFloat((formTier.volume * formTier.ratePerM3Water).toFixed(2)) 
                            : formTier.waterCostForTier,
        isFixedValue: formTier.isFixedValue,
        ratePerM3Water: formTier.ratePerM3Water,
      })),
    };
    onSubmit(ratesToSubmit);
  };
  
  const defaultFirstExceedingTierRate = 1.56;

  return (
    <Card className="shadow-lg mt-6">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">Tarifas de Consumo (Estrutura da Fatura)</CardTitle>
        <CardDescription>
          Configure a faixa mínima (custo fixo de água e esgoto) e as faixas excedentes.
          O custo de esgoto é calculado automaticamente com base no percentual definido sobre o custo da água para todas as faixas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="sewerRatePercentage" className="text-sm font-medium text-foreground/80">
              Percentual da Taxa de Esgoto (%)
            </Label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Controller
                name="sewerRatePercentage"
                control={control}
                render={({ field }) => (
                  <Input
                    id="sewerRatePercentage"
                    type="number"
                    step="1"
                    className="bg-secondary pl-9 text-foreground border-input focus:ring-accent"
                    {...field}
                    value={field.value ?? ''} // Ensure value is not undefined/null for input
                    onChange={e => {
                      const value = parseFloat(e.target.value);
                      field.onChange(isNaN(value) ? 0 : value); // Store as number, default to 0 if NaN
                    }}
                    placeholder="Ex: 80"
                  />
                )}
              />
            </div>
            {errors.sewerRatePercentage && <p className="text-sm text-destructive">{errors.sewerRatePercentage?.message}</p>}
          </div>

          {fields.map((item, index) => {
            const currentWaterCostForTier = watchedTiers[index]?.waterCostForTier ?? 0;
            const sewerRate = (watchedSewerRatePercentage ?? 0) / 100;
            const sewerCostForTierDisplay = currentWaterCostForTier * sewerRate;
            const totalCostForTierDisplay = currentWaterCostForTier + sewerCostForTierDisplay;
            const isFixed = watchedTiers[index]?.isFixedValue;
            const tierVolume = watchedTiers[index]?.volume;
            const unitExcessRateDisplay = (tierVolume && tierVolume > 0 && !isFixed) ? (totalCostForTierDisplay / tierVolume).toFixed(2) : '0.00';


            return (
              <div key={item.id} className="space-y-3 p-4 border border-border rounded-md shadow-sm bg-card/50 relative">
                <Label className="text-md font-semibold text-primary/80">
                   {isFixed ? `${watchedTiers[index]?.name || 'Mínimo (0-X m³)'}` : `Faixa Excedente ${fields.filter(f => !f.isFixedValue).indexOf(item) + 1}: ${watchedTiers[index]?.name || `Ex: Faixa ${index +1}`}`}
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1">
                    <Label htmlFor={`tiers.${index}.name`} className="text-xs">Nome da Faixa</Label>
                    <Controller
                      name={`tiers.${index}.name`}
                      control={control}
                      render={({ field }) => <Input {...field} className="bg-secondary text-foreground border-input focus:ring-accent" placeholder={isFixed ? "Mínimo (0-40m³)" : `Ex: Acima de 40m³`} />}
                    />
                    {errors.tiers?.[index]?.name && <p className="text-sm text-destructive">{errors.tiers[index]?.name?.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`tiers.${index}.volume`} className="text-xs">Volume da Faixa (m³)</Label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Controller
                        name={`tiers.${index}.volume`}
                        control={control}
                        render={({ field }) => (
                          <Input type="number" step="1" {...field} value={field.value ?? ''}
                            onChange={e => {
                                const value = parseInt(e.target.value, 10);
                                field.onChange(isNaN(value) ? 0 : value); // Default to 0 if NaN
                            }}
                            className="bg-secondary pl-9 text-foreground border-input focus:ring-accent" placeholder={isFixed ? "40" : "Ex: 10"} />
                        )}
                      />
                    </div>
                    {errors.tiers?.[index]?.volume && <p className="text-sm text-destructive">{errors.tiers[index]?.volume?.message}</p>}
                  </div>

                  {!isFixed && (
                    <div className="space-y-1">
                      <Label htmlFor={`tiers.${index}.ratePerM3Water`} className="text-xs">Valor Água por m³ (R$)</Label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Controller
                          name={`tiers.${index}.ratePerM3Water`}
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              value={field.value ?? ''}
                              onChange={e => {
                                const value = parseFloat(e.target.value);
                                field.onChange(isNaN(value) ? 0 : value); // Default to 0 if NaN
                              }}
                              className="bg-secondary pl-9 text-foreground border-input focus:ring-accent"
                              placeholder="Ex: 1.56"
                            />
                          )}
                        />
                      </div>
                      {errors.tiers?.[index]?.ratePerM3Water && <p className="text-sm text-destructive">{errors.tiers[index]?.ratePerM3Water?.message}</p>}
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor={`tiers.${index}.waterCostForTier`} className="text-xs">Custo Água da Faixa (R$)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Controller
                        name={`tiers.${index}.waterCostForTier`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => {
                                if (isFixed) { 
                                 const value = parseFloat(e.target.value);
                                 field.onChange(isNaN(value) ? 0 : value);
                                }
                            }}
                            readOnly={!isFixed} 
                            className={`${isFixed ? 'bg-secondary' : 'bg-muted/50 cursor-not-allowed'} pl-9 text-foreground border-input focus:ring-accent`}
                            placeholder={isFixed ? "Ex: 408.96" : "Calculado"}
                          />
                        )}
                      />
                    </div>
                    {errors.tiers?.[index]?.waterCostForTier && <p className="text-sm text-destructive">{errors.tiers[index]?.waterCostForTier?.message}</p>}
                    {!isFixed && <p className="text-xs text-muted-foreground">(Volume x Valor/m³)</p>}
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor={`sewerCostDisplay.${index}`} className="text-xs">Custo Esgoto da Faixa (R$)</Label>
                    <div className="relative">
                       <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input 
                        id={`sewerCostDisplay.${index}`}
                        type="text" 
                        value={sewerCostForTierDisplay.toFixed(2)} 
                        readOnly 
                        className="bg-muted/50 pl-9 text-foreground border-input cursor-not-allowed" 
                       />
                    </div>
                    <p className="text-xs text-muted-foreground">({watchedSewerRatePercentage || 0}% de Custo Água)</p>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`totalCostDisplay.${index}`} className="text-xs">Custo Total da Faixa (R$)</Label>
                    <div className="relative">
                       <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input 
                        id={`totalCostDisplay.${index}`}
                        type="text" 
                        value={totalCostForTierDisplay.toFixed(2)} 
                        readOnly 
                        className="bg-muted/50 pl-9 text-foreground border-input cursor-not-allowed" 
                       />
                    </div>
                     <p className="text-xs text-muted-foreground">(Água + Esgoto)</p>
                  </div>
                   {!isFixed && (
                    <div className="space-y-1">
                        <Label htmlFor={`unitExcessRateDisplay.${index}`} className="text-xs">Valor Unit. Exced. Total (R$/m³)</Label>
                        <div className="relative">
                        <Divide className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id={`unitExcessRateDisplay.${index}`}
                            type="text"
                            value={unitExcessRateDisplay}
                            readOnly
                            className="bg-muted/50 pl-9 text-foreground border-input cursor-not-allowed"
                        />
                        </div>
                        <p className="text-xs text-muted-foreground">(Custo Total Faixa / Volume Faixa)</p>
                    </div>
                    )}
                </div>
                {/* Allow removal only for non-fixed tiers and if there's more than one tier overall */}
                {fields.length > 1 && !isFixed && ( 
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="absolute top-2 right-2 text-destructive hover:bg-destructive/10 p-1 h-auto">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const newTierVolume = 0; 
              const newTierRate = defaultFirstExceedingTierRate; 
              const newWaterCost = newTierVolume * newTierRate; 
              append({ 
                id: crypto.randomUUID(), 
                name: "", 
                volume: newTierVolume, 
                ratePerM3Water: newTierRate, 
                waterCostForTier: parseFloat(newWaterCost.toFixed(2)), 
                isFixedValue: false 
              })
            }}
            className="text-primary border-primary hover:bg-primary/10 flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" /> Adicionar Faixa Excedente
          </Button>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Salvar Tarifas
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
