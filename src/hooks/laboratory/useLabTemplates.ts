import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface LabTemplateField {
  id: string;
  name: string;
  name_ar?: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  unit?: string;
  options?: string[];
  required?: boolean;
  group_id?: string;
}

export interface LabTemplateGroup {
  id: string;
  name: string;
  name_ar?: string;
  sort_order: number;
}

export interface LabTemplate {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  template_type: string;
  category: string | null;
  version: number;
  is_active: boolean;
  fields: LabTemplateField[];
  groups: LabTemplateGroup[];
  normal_ranges: Record<string, { min?: number; max?: number; values?: string[] }>;
  diagnostic_rules: Record<string, unknown>;
  pricing: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateLabTemplateData {
  name: string;
  name_ar?: string;
  template_type?: string;
  category?: string;
  is_active?: boolean;
  fields?: Json;
  groups?: Json;
  normal_ranges?: Json;
  diagnostic_rules?: Json;
  pricing?: Json;
}

export function useLabTemplates() {
  const [templates, setTemplates] = useState<LabTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeTenant, activeRole } = useTenant();

  const canManage = activeRole === "owner" || activeRole === "manager";

  const fetchTemplates = useCallback(async () => {
    if (!activeTenant?.tenant.id) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lab_templates")
        .select("*")
        .eq("tenant_id", activeTenant.tenant.id)
        .order("name", { ascending: true });

      if (error) throw error;
      
      // Transform the data to ensure proper typing
      const typedData = (data || []).map(t => ({
        ...t,
        fields: (t.fields as unknown as LabTemplateField[]) || [],
        groups: (t.groups as unknown as LabTemplateGroup[]) || [],
        normal_ranges: (t.normal_ranges as Record<string, { min?: number; max?: number; values?: string[] }>) || {},
        diagnostic_rules: (t.diagnostic_rules as Record<string, unknown>) || {},
        pricing: (t.pricing as Record<string, unknown>) || {},
      }));
      
      setTemplates(typedData);
    } catch (error) {
      console.error("Error fetching lab templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [activeTenant?.tenant.id]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (data: CreateLabTemplateData) => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return null;
    }

    try {
      const { data: template, error } = await supabase
        .from("lab_templates")
        .insert({
          tenant_id: activeTenant.tenant.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Template created successfully");
      fetchTemplates();
      return template;
    } catch (error: unknown) {
      console.error("Error creating template:", error);
      const message = error instanceof Error ? error.message : "Failed to create template";
      toast.error(message);
      return null;
    }
  };

  const updateTemplate = async (id: string, updates: Partial<CreateLabTemplateData>) => {
    try {
      const { data, error } = await supabase
        .from("lab_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Template updated successfully");
      fetchTemplates();
      return data;
    } catch (error: unknown) {
      console.error("Error updating template:", error);
      const message = error instanceof Error ? error.message : "Failed to update template";
      toast.error(message);
      return null;
    }
  };

  const duplicateTemplate = async (id: string, newName: string) => {
    const template = templates.find(t => t.id === id);
    if (!template) {
      toast.error("Template not found");
      return null;
    }

    return createTemplate({
      name: newName,
      name_ar: template.name_ar || undefined,
      template_type: template.template_type,
      category: template.category || undefined,
      fields: template.fields as unknown as Json,
      groups: template.groups as unknown as Json,
      normal_ranges: template.normal_ranges as unknown as Json,
      diagnostic_rules: template.diagnostic_rules as unknown as Json,
      pricing: template.pricing as unknown as Json,
    });
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("lab_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Template deleted successfully");
      fetchTemplates();
      return true;
    } catch (error: unknown) {
      console.error("Error deleting template:", error);
      const message = error instanceof Error ? error.message : "Failed to delete template";
      toast.error(message);
      return false;
    }
  };

  const activeTemplates = templates.filter(t => t.is_active);

  const seedDefaultTemplates = async () => {
    if (!activeTenant?.tenant.id) {
      toast.error("No active organization");
      return false;
    }

    const defaultTemplates: CreateLabTemplateData[] = [
      {
        name: "Complete Blood Count (CBC)",
        name_ar: "تحليل الدم الشامل",
        template_type: "blood",
        category: "Routine",
        is_active: true,
        fields: [
          { id: "hemoglobin", name: "Hemoglobin", name_ar: "الهيموجلوبين", type: "number", unit: "g/dL", required: true },
          { id: "wbc", name: "WBC Count", name_ar: "كريات الدم البيضاء", type: "number", unit: "K/µL", required: true },
          { id: "rbc", name: "RBC Count", name_ar: "كريات الدم الحمراء", type: "number", unit: "M/µL", required: true },
          { id: "platelets", name: "Platelets", name_ar: "الصفائح الدموية", type: "number", unit: "K/µL", required: true },
          { id: "hematocrit", name: "Hematocrit", name_ar: "الهيماتوكريت", type: "number", unit: "%", required: false },
        ] as unknown as Json,
        normal_ranges: {
          hemoglobin: { min: 11, max: 19 },
          wbc: { min: 5.5, max: 12.5 },
          rbc: { min: 6.8, max: 13 },
          platelets: { min: 100, max: 350 },
          hematocrit: { min: 32, max: 53 },
        } as unknown as Json,
      },
      {
        name: "Basic Urine Analysis",
        name_ar: "تحليل البول الأساسي",
        template_type: "urine",
        category: "Routine",
        is_active: true,
        fields: [
          { id: "ph", name: "pH Level", name_ar: "درجة الحموضة", type: "number", required: true },
          { id: "specific_gravity", name: "Specific Gravity", name_ar: "الكثافة النوعية", type: "number", required: true },
          { id: "protein", name: "Protein", name_ar: "البروتين", type: "select", options: ["Negative", "Trace", "+", "++", "+++"], required: true },
          { id: "glucose", name: "Glucose", name_ar: "الجلوكوز", type: "select", options: ["Negative", "Trace", "+", "++", "+++"], required: false },
          { id: "blood", name: "Blood", name_ar: "الدم", type: "select", options: ["Negative", "Trace", "+", "++", "+++"], required: false },
        ] as unknown as Json,
        normal_ranges: {
          ph: { min: 7.5, max: 8.5 },
          specific_gravity: { min: 1.020, max: 1.050 },
        } as unknown as Json,
      },
      {
        name: "Equine Hormonal Panel",
        name_ar: "تحليل الهرمونات",
        template_type: "hormonal",
        category: "Diagnostic",
        is_active: true,
        fields: [
          { id: "testosterone", name: "Testosterone", name_ar: "التستوستيرون", type: "number", unit: "ng/dL", required: true },
          { id: "cortisol", name: "Cortisol", name_ar: "الكورتيزول", type: "number", unit: "µg/dL", required: true },
          { id: "progesterone", name: "Progesterone", name_ar: "البروجسترون", type: "number", unit: "ng/mL", required: false },
          { id: "estradiol", name: "Estradiol", name_ar: "الإستراديول", type: "number", unit: "pg/mL", required: false },
        ] as unknown as Json,
        normal_ranges: {
          testosterone: { min: 0.1, max: 2.0 },
          cortisol: { min: 2, max: 8 },
          progesterone: { min: 0, max: 15 },
        } as unknown as Json,
      },
    ];

    try {
      for (const templateData of defaultTemplates) {
        await supabase
          .from("lab_templates")
          .insert({
            tenant_id: activeTenant.tenant.id,
            ...templateData,
          });
      }

      toast.success("Default templates created successfully");
      fetchTemplates();
      return true;
    } catch (error: unknown) {
      console.error("Error seeding templates:", error);
      const message = error instanceof Error ? error.message : "Failed to create default templates";
      toast.error(message);
      return false;
    }
  };

  return {
    templates,
    activeTemplates,
    loading,
    canManage,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
    seedDefaultTemplates,
    refresh: fetchTemplates,
  };
}
