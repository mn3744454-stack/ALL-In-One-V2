import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Pencil } from "lucide-react";
import { useI18n } from "@/i18n";
import type { LabService, CreateLabServiceInput } from "@/hooks/laboratory/useLabServices";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  name_ar: z.string().optional(),
  code: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  sample_type: z.string().optional(),
  turnaround_hours: z.coerce.number().int().positive().nullable().optional(),
  price: z.coerce.number().nonnegative().nullable().optional(),
  currency: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: LabService | null;
  onSubmit: (data: CreateLabServiceInput & { id?: string }) => Promise<unknown>;
  isLoading?: boolean;
}

export function LabServiceFormDialog({ open, onOpenChange, service, onSubmit, isLoading }: Props) {
  const { t } = useI18n();
  const isEdit = !!service;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      name_ar: "",
      code: "",
      category: "",
      description: "",
      sample_type: "",
      turnaround_hours: null,
      price: null,
      currency: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        name_ar: service.name_ar || "",
        code: service.code || "",
        category: service.category || "",
        description: service.description || "",
        sample_type: service.sample_type || "",
        turnaround_hours: service.turnaround_hours,
        price: service.price,
        currency: service.currency || "",
        is_active: service.is_active,
      });
    } else {
      form.reset({
        name: "",
        name_ar: "",
        code: "",
        category: "",
        description: "",
        sample_type: "",
        turnaround_hours: null,
        price: null,
        currency: "",
        is_active: true,
      });
    }
  }, [service, open, form]);

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({
      ...(service ? { id: service.id } : {}),
      name: values.name,
      name_ar: values.name_ar,
      code: values.code,
      category: values.category,
      description: values.description,
      sample_type: values.sample_type,
      turnaround_hours: values.turnaround_hours ?? null,
      price: values.price ?? null,
      currency: values.currency,
      is_active: values.is_active,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("laboratory.catalog.editService") : t("laboratory.catalog.addService")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.name")} *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CBC Panel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.nameAr")}</FormLabel>
                    <FormControl>
                      <Input placeholder="الاسم بالعربية" dir="rtl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.code")}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CBC" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.category")}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Hematology" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.description")}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t("laboratory.catalog.descPlaceholder")} className="min-h-[80px] resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sample_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.sampleType")}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Blood, Urine" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="turnaround_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.turnaround")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 24"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.price")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.currency")}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SAR" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">{t("common.status")}</FormLabel>
                    <p className="text-xs text-muted-foreground">{t("laboratory.catalog.activeDesc")}</p>
                  </div>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="gold" className="flex-1" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isEdit ? (
                  <Pencil className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {isEdit ? t("common.save") : t("common.create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
