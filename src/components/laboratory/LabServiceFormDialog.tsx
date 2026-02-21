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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, FileText, X, ChevronUp, ChevronDown, Search } from "lucide-react";
import { useI18n } from "@/i18n";
import { toast } from "sonner";
import { useLabTemplates } from "@/hooks/laboratory/useLabTemplates";
import { useLabServiceTemplates, type UpsertServiceTemplateInput } from "@/hooks/laboratory/useLabServiceTemplates";
import { usePermissions } from "@/hooks/usePermissions";
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
  pricing_mode: z.string().default("sum_templates"),
  override_price: z.coerce.number().nonnegative().nullable().optional(),
  discount_type: z.string().nullable().optional(),
  discount_value: z.coerce.number().nonnegative().nullable().optional(),
});

type FormValues = z.infer<typeof schema>;

interface LinkedTemplate {
  template_id: string;
  sort_order: number;
  is_required: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: LabService | null;
  onSubmit: (data: CreateLabServiceInput & { id?: string }) => Promise<unknown>;
  isLoading?: boolean;
  lockedTemplateId?: string;
}

export function LabServiceFormDialog({ open, onOpenChange, service, onSubmit, isLoading, lockedTemplateId }: Props) {
  const { t } = useI18n();
  const isEdit = !!service;
  const { activeTemplates, loading: templatesLoading } = useLabTemplates();
  const { mappings, syncTemplates, isSyncing } = useLabServiceTemplates(service?.id);
  const { isOwner, hasPermission } = usePermissions();
  const canManage = isOwner || hasPermission("laboratory.manage");

  const [linkedTemplates, setLinkedTemplates] = useState<LinkedTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "", name_ar: "", code: "", category: "", description: "",
      sample_type: "", turnaround_hours: null, price: null, currency: "",
      is_active: true, pricing_mode: "sum_templates",
      override_price: null, discount_type: null, discount_value: null,
    },
  });

  // Initialize form on open
  useEffect(() => {
    if (!open) return;
    setTemplateSearch("");
    if (service) {
      form.reset({
        name: service.name, name_ar: service.name_ar || "",
        code: service.code || "", category: service.category || "",
        description: service.description || "", sample_type: service.sample_type || "",
        turnaround_hours: service.turnaround_hours, price: service.price,
        currency: service.currency || "", is_active: service.is_active,
        pricing_mode: service.pricing_mode || "sum_templates",
        override_price: service.override_price,
        discount_type: service.discount_type, discount_value: service.discount_value,
      });
    } else {
      form.reset({
        name: "", name_ar: "", code: "", category: "", description: "",
        sample_type: "", turnaround_hours: null, price: null, currency: "",
        is_active: true, pricing_mode: "sum_templates",
        override_price: null, discount_type: null, discount_value: null,
      });
    }
  }, [service, open, form]);

  // Sync linked templates from DB when editing
  useEffect(() => {
    if (isEdit && mappings.length > 0) {
      setLinkedTemplates(mappings.map((m) => ({
        template_id: m.template_id, sort_order: m.sort_order, is_required: m.is_required,
      })));
    } else if (!isEdit) {
      if (lockedTemplateId) {
        setLinkedTemplates([{ template_id: lockedTemplateId, sort_order: 0, is_required: true }]);
      } else {
        setLinkedTemplates([]);
      }
    }
  }, [isEdit, mappings, lockedTemplateId, open]);

  // Prefill name from locked template
  useEffect(() => {
    if (!isEdit && lockedTemplateId && open) {
      const tmpl = activeTemplates.find((t) => t.id === lockedTemplateId);
      if (tmpl && !form.getValues("name")) {
        form.setValue("name", tmpl.name);
        if (tmpl.name_ar) form.setValue("name_ar", tmpl.name_ar);
        if (tmpl.category) form.setValue("category", tmpl.category);
      }
    }
  }, [lockedTemplateId, activeTemplates, isEdit, open, form]);

  const addTemplate = (templateId: string) => {
    setLinkedTemplates((prev) => {
      if (prev.some((lt) => lt.template_id === templateId)) return prev;
      return [...prev, { template_id: templateId, sort_order: prev.length, is_required: true }];
    });
  };

  const removeTemplate = (templateId: string) => {
    if (templateId === lockedTemplateId) return;
    setLinkedTemplates((prev) => prev.filter((lt) => lt.template_id !== templateId));
  };

  const toggleTemplate = (templateId: string) => {
    if (templateId === lockedTemplateId) return;
    setLinkedTemplates((prev) => {
      const exists = prev.find((lt) => lt.template_id === templateId);
      if (exists) return prev.filter((lt) => lt.template_id !== templateId);
      return [...prev, { template_id: templateId, sort_order: prev.length, is_required: true }];
    });
  };

  const moveTemplate = (idx: number, dir: "up" | "down") => {
    setLinkedTemplates((prev) => {
      const arr = [...prev];
      const target = dir === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((lt, i) => ({ ...lt, sort_order: i }));
    });
  };

  const toggleRequired = (idx: number) => {
    setLinkedTemplates((prev) =>
      prev.map((lt, i) => (i === idx ? { ...lt, is_required: !lt.is_required } : lt))
    );
  };

  const handleSubmit = async (values: FormValues) => {
    const result = await onSubmit({
      ...(service ? { id: service.id } : {}),
      name: values.name, name_ar: values.name_ar, code: values.code,
      category: values.category, description: values.description,
      sample_type: values.sample_type,
      turnaround_hours: values.turnaround_hours ?? null,
      price: values.price ?? null, currency: values.currency,
      is_active: values.is_active, pricing_mode: values.pricing_mode,
      override_price: values.override_price ?? null,
      discount_type: values.discount_type || null,
      discount_value: values.discount_value ?? null,
    });

    const serviceId = service?.id || (result as any)?.id;
    if (serviceId && canManage && linkedTemplates.length >= 0) {
      const entries: UpsertServiceTemplateInput[] = linkedTemplates.map((lt, idx) => ({
        service_id: serviceId, template_id: lt.template_id,
        sort_order: idx, is_required: lt.is_required,
      }));
      try {
        await syncTemplates({ entries, target_service_id: serviceId });
      } catch (e) {
        console.error("Failed to sync service templates:", e);
        toast.error(t("laboratory.catalog.templateSyncFailed") || "Failed to link templates to service");
      }
    }
    onOpenChange(false);
  };

  const pricingMode = form.watch("pricing_mode");

  // Filter available templates
  const availableTemplates = activeTemplates
    .filter((at) => !linkedTemplates.some((lt) => lt.template_id === at.id))
    .filter((at) => {
      if (!templateSearch.trim()) return true;
      const q = templateSearch.toLowerCase();
      return at.name.toLowerCase().includes(q) || (at.name_ar && at.name_ar.includes(q));
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("laboratory.catalog.editService") : t("laboratory.catalog.addService")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Basic fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("common.name")} *</FormLabel>
                  <FormControl><Input placeholder="e.g., CBC Panel" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name_ar" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("laboratory.catalog.nameAr")}</FormLabel>
                  <FormControl><Input placeholder="الاسم بالعربية" dir="rtl" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("laboratory.catalog.code")}</FormLabel>
                  <FormControl><Input placeholder="e.g., CBC" className="font-mono" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("laboratory.catalog.category")}</FormLabel>
                  <FormControl><Input placeholder="e.g., Hematology" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("common.description")}</FormLabel>
                <FormControl><Textarea placeholder={t("laboratory.catalog.descPlaceholder")} className="min-h-[80px] resize-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="sample_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("laboratory.catalog.sampleType")}</FormLabel>
                  <FormControl><Input placeholder="e.g., Blood, Urine" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="turnaround_hours" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("laboratory.catalog.turnaround")}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 24" {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Phase 13: Pricing Mode */}
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">{t("laboratory.catalog.pricing")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="pricing_mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.pricingMode")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="sum_templates">{t("laboratory.catalog.sumTemplates")}</SelectItem>
                        <SelectItem value="override">{t("laboratory.catalog.overridePrice")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {pricingMode === "override" ? (
                  <FormField control={form.control} name="override_price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("laboratory.catalog.overridePrice")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ) : (
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("laboratory.catalog.price")}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.currency")}</FormLabel>
                    <FormControl><Input placeholder="e.g., SAR" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="discount_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.discountType")}</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? null : v)}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t("laboratory.catalog.discountNone")}</SelectItem>
                        <SelectItem value="percentage">{t("laboratory.catalog.discountPercentage")}</SelectItem>
                        <SelectItem value="fixed">{t("laboratory.catalog.discountFixed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="discount_value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("laboratory.catalog.discountValue")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0" {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Phase 10: Linked Templates — Mobile-first */}
            {canManage && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    {t("laboratory.catalog.linkedTemplates")}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {linkedTemplates.length} {t("common.selected")}
                  </Badge>
                </div>

                {templatesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* Selected templates — touch-friendly rows */}
                    {linkedTemplates.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {linkedTemplates.map((lt, idx) => {
                          const tmpl = activeTemplates.find((at) => at.id === lt.template_id);
                          if (!tmpl) return null;
                          const isLocked = lt.template_id === lockedTemplateId;
                          return (
                            <div key={lt.template_id}
                              className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm min-h-[44px]"
                            >
                              <span className="flex-1 min-w-0 truncate font-medium">{tmpl.name}</span>
                              <label className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 min-h-[44px] cursor-pointer select-none">
                                <Checkbox checked={lt.is_required} onCheckedChange={() => toggleRequired(idx)} className="h-4 w-4" />
                                {t("laboratory.catalog.required")}
                              </label>
                              <div className="flex flex-col shrink-0">
                                <Button type="button" variant="ghost" size="icon" className="h-[22px] w-8"
                                  disabled={idx === 0} onClick={() => moveTemplate(idx, "up")}>
                                  <ChevronUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="h-[22px] w-8"
                                  disabled={idx === linkedTemplates.length - 1} onClick={() => moveTemplate(idx, "down")}>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              {!isLocked && (
                                <Button type="button" variant="ghost" size="icon"
                                  className="h-8 w-8 text-destructive shrink-0"
                                  onClick={() => removeTemplate(lt.template_id)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Search + Available templates with explicit Add button */}
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={t("laboratory.catalog.searchTemplates")}
                        value={templateSearch}
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        className="ps-9 h-10"
                      />
                    </div>
                    <ScrollArea className="h-[180px] sm:h-[160px] rounded-md border">
                      <div className="p-2 space-y-1">
                        {availableTemplates.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            {t("laboratory.catalog.noAvailableTemplates")}
                          </p>
                        ) : (
                          availableTemplates.map((template) => (
                            <div key={template.id}
                              className="flex items-center gap-2 p-2 rounded-md text-sm min-h-[44px]"
                            >
                              <span className="flex-1 min-w-0 truncate">{template.name}</span>
                              {template.name_ar && (
                                <span className="text-xs text-muted-foreground truncate max-w-[80px] shrink-0" dir="rtl">
                                  {template.name_ar}
                                </span>
                              )}
                              <Button type="button" variant="outline" size="sm"
                                className="h-8 px-2 shrink-0"
                                onClick={() => addTemplate(template.id)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>
            )}

            {/* Active toggle */}
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm">{t("common.status")}</FormLabel>
                  <p className="text-xs text-muted-foreground">{t("laboratory.catalog.activeDesc")}</p>
                </div>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )} />

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="gold" className="flex-1" disabled={isLoading || isSyncing}>
                {(isLoading || isSyncing) ? (
                  <Loader2 className="w-4 h-4 me-2 animate-spin" />
                ) : isEdit ? (
                  <Pencil className="w-4 h-4 me-2" />
                ) : (
                  <Plus className="w-4 h-4 me-2" />
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
