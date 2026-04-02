import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Pencil } from "lucide-react";
import { TenantService, CreateServiceInput } from "@/hooks/useServices";
import { useI18n } from "@/i18n";

const serviceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  service_type: z.string().optional(),
  service_kind: z.string().optional(),
  unit_price: z.coerce.number().nullable().optional(),
  price_display: z.string().optional(),
  is_active: z.boolean().default(true),
  is_public: z.boolean().default(true),
  is_taxable: z.boolean().default(true),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormDialogProps {
  service?: TenantService;
  onSubmit: (data: CreateServiceInput) => Promise<void>;
  isLoading?: boolean;
  trigger?: React.ReactNode;
  /** Pre-set service_kind for domain-specific creation (e.g. 'breeding') */
  defaultServiceKind?: string;
}

export const ServiceFormDialog = ({
  service,
  onSubmit,
  isLoading = false,
  trigger,
  defaultServiceKind,
}: ServiceFormDialogProps) => {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const isEdit = !!service;
  const effectiveKind = service?.service_kind || defaultServiceKind || "service";

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name || "",
      name_ar: service?.name_ar || "",
      description: service?.description || "",
      service_type: service?.service_type || "",
      service_kind: effectiveKind,
      unit_price: service?.unit_price ?? null,
      price_display: service?.price_display || "",
      is_active: service?.is_active ?? true,
      is_public: service?.is_public ?? true,
      is_taxable: service?.is_taxable ?? true,
    },
  });

  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        name_ar: service.name_ar || "",
        description: service.description || "",
        service_type: service.service_type || "",
        service_kind: service.service_kind || effectiveKind,
        unit_price: service.unit_price ?? null,
        price_display: service.price_display || "",
        is_active: service.is_active,
        is_public: service.is_public,
        is_taxable: service.is_taxable ?? true,
      });
    }
  }, [service, form, effectiveKind]);

  const handleSubmit = async (values: ServiceFormValues) => {
    await onSubmit({
      name: values.name,
      name_ar: values.name_ar,
      description: values.description,
      service_type: values.service_type,
      service_kind: values.service_kind || effectiveKind,
      unit_price: values.unit_price ?? null,
      price_display: values.price_display,
      is_active: values.is_active,
      is_public: values.is_public,
      is_taxable: values.is_taxable,
    });
    setOpen(false);
    if (!isEdit) {
      form.reset();
    }
  };

  const showKindSelector = !defaultServiceKind;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="gold" className="gap-2">
            <Plus className="w-4 h-4" />
            {t("services.form.addService")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-navy">
            {isEdit ? t("services.form.editTitle") : t("services.form.addTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t("services.form.editDesc")
              : t("services.form.addDesc")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Name EN */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("services.form.name")} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t("services.form.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name AR */}
            <FormField
              control={form.control}
              name="name_ar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("services.form.nameAr")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("services.form.nameArPlaceholder")} dir="rtl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("services.form.descPlaceholder")}
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Kind selector - only when not domain-locked */}
            {showKindSelector && (
              <FormField
                control={form.control}
                name="service_kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("services.form.serviceKind")}</FormLabel>
                    <Select value={field.value || "service"} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="service">{t("services.kinds.general")}</SelectItem>
                        <SelectItem value="boarding">{t("services.kinds.boarding")}</SelectItem>
                        <SelectItem value="breeding">{t("services.kinds.breeding")}</SelectItem>
                        <SelectItem value="vet">{t("services.kinds.vet")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="service_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("services.form.category")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("services.form.categoryPlaceholder")} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("services.form.categoryDesc")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unit Price */}
            <FormField
              control={form.control}
              name="unit_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("services.form.unitPrice")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={field.value ?? ""}
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("services.form.unitPriceDesc")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price_display"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("services.form.priceDisplay")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("services.form.priceDisplayPlaceholder")} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("services.form.priceDisplayDesc")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">{t("common.active")}</FormLabel>
                      <FormDescription className="text-xs">
                        {t("services.form.activeDesc")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_public"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">{t("services.public")}</FormLabel>
                      <FormDescription className="text-xs">
                        {t("services.form.publicDesc")}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                variant="gold"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEdit ? t("common.saving") : t("common.creating")}
                  </>
                ) : (
                  <>
                    {isEdit ? <Pencil className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {isEdit ? t("common.save") : t("services.form.addService")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
