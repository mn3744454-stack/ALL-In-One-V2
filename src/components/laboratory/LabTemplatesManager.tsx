import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, Copy, Pencil, Trash2, FileText, Loader2, X, Sparkles, 
  ChevronDown, ChevronUp, Search, GripVertical, AlertTriangle,
  Percent, DollarSign, Package
} from "lucide-react";
import { 
  useLabTemplates, 
  type CreateLabTemplateData, 
  type LabTemplate, 
  type LabTemplateField,
  type LabTemplateGroup,
  type TemplatePricing,
  type TemplateDiscount,
  type DiagnosticRule,
  type LabFieldType
} from "@/hooks/laboratory/useLabTemplates";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Json } from "@/integrations/supabase/types";
import { useI18n } from "@/i18n";

const TEMPLATE_TYPES = [
  { value: 'standard', label: 'Standard', label_ar: 'قياسي' },
  { value: 'blood', label: 'Blood Work', label_ar: 'تحليل الدم' },
  { value: 'urine', label: 'Urine Analysis', label_ar: 'تحليل البول' },
  { value: 'genetic', label: 'Genetic', label_ar: 'جيني' },
  { value: 'hormonal', label: 'Hormonal', label_ar: 'هرموني' },
  { value: 'imaging', label: 'Imaging', label_ar: 'تصوير' },
];

const FIELD_TYPES: { value: LabFieldType; label: string; label_ar: string }[] = [
  { value: 'text', label: 'Text', label_ar: 'نص' },
  { value: 'number', label: 'Number', label_ar: 'رقم' },
  { value: 'select', label: 'Select', label_ar: 'اختيار' },
  { value: 'multiselect', label: 'Multi Select', label_ar: 'اختيار متعدد' },
  { value: 'date', label: 'Date', label_ar: 'تاريخ' },
  { value: 'time', label: 'Time', label_ar: 'وقت' },
  { value: 'datetime', label: 'Date & Time', label_ar: 'تاريخ ووقت' },
  { value: 'yesno', label: 'Yes/No', label_ar: 'نعم/لا' },
  { value: 'range', label: 'Range', label_ar: 'نطاق' },
  { value: 'checkbox', label: 'Checkbox', label_ar: 'مربع اختيار' },
  { value: 'textarea', label: 'Text Area', label_ar: 'منطقة نص' },
  { value: 'file', label: 'File', label_ar: 'ملف' },
];

const INTERPRETATION_TYPES = [
  { value: 'normal', label: 'Normal', label_ar: 'طبيعي' },
  { value: 'abnormal', label: 'Abnormal', label_ar: 'غير طبيعي' },
  { value: 'critical', label: 'Critical', label_ar: 'حرج' },
  { value: 'warning', label: 'Warning', label_ar: 'تحذير' },
];

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage', label_ar: 'نسبة مئوية' },
  { value: 'fixed', label: 'Fixed Amount', label_ar: 'مبلغ ثابت' },
  { value: 'bulk', label: 'Bulk Discount', label_ar: 'خصم الكمية' },
];

interface FormData {
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  template_type: string;
  category: string;
  category_ar: string;
  is_active: boolean;
  fields: LabTemplateField[];
  groups: LabTemplateGroup[];
  normal_ranges: Record<string, { min?: number; max?: number }>;
  pricing: TemplatePricing;
  diagnostic_rules: DiagnosticRule[];
}

interface LabTemplatesManagerProps {
  onNavigateToTemplates?: () => void;
}

export function LabTemplatesManager({ onNavigateToTemplates }: LabTemplatesManagerProps) {
  const { t, language } = useI18n();
  const { templates, loading, canManage, existingCategories, createTemplate, updateTemplate, duplicateTemplate, deleteTemplate, seedDefaultTemplates } = useLabTemplates();
  const [seedingDefaults, setSeedingDefaults] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<LabTemplate | null>(null);
  const [templateToDuplicate, setTemplateToDuplicate] = useState<LabTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Collapsible sections state
  const [sectionsOpen, setSectionsOpen] = useState({
    description: false,
    groups: false,
    fields: true,
    normalRanges: false,
    pricing: false,
    diagnosticRules: false,
  });
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    template_type: 'standard',
    category: '',
    category_ar: '',
    is_active: true,
    fields: [],
    groups: [],
    normal_ranges: {},
    pricing: { base_price: undefined, currency: 'SAR', discounts_enabled: false, discounts: [] },
    diagnostic_rules: [],
  });

  // Options input for select/multiselect fields
  const [optionInputs, setOptionInputs] = useState<Record<string, string>>({});
  
  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        t.name.toLowerCase().includes(searchLower) ||
        (t.name_ar && t.name_ar.toLowerCase().includes(searchLower)) ||
        (t.category && t.category.toLowerCase().includes(searchLower)) ||
        (t.description && t.description.toLowerCase().includes(searchLower));
      
      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && t.is_active) ||
        (statusFilter === 'inactive' && !t.is_active);
      
      // Type filter
      const matchesType = typeFilter === 'all' || t.template_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [templates, searchQuery, statusFilter, typeFilter]);
  
  // Stats
  const stats = useMemo(() => ({
    total: templates.length,
    active: templates.filter(t => t.is_active).length,
    inactive: templates.filter(t => !t.is_active).length,
  }), [templates]);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      name_ar: '',
      description: '',
      description_ar: '',
      template_type: 'standard',
      category: '',
      category_ar: '',
      is_active: true,
      fields: [],
      groups: [],
      normal_ranges: {},
      pricing: { base_price: undefined, currency: 'SAR', discounts_enabled: false, discounts: [] },
      diagnostic_rules: [],
    });
    setSectionsOpen({ description: false, groups: false, fields: true, normalRanges: false, pricing: false, diagnosticRules: false });
    setDialogOpen(true);
  };

  const openEditDialog = (template: LabTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      name_ar: template.name_ar || '',
      description: template.description || '',
      description_ar: template.description_ar || '',
      template_type: template.template_type,
      category: template.category || '',
      category_ar: template.category_ar || '',
      is_active: template.is_active,
      fields: template.fields || [],
      groups: template.groups || [],
      normal_ranges: template.normal_ranges || {},
      pricing: template.pricing || { base_price: undefined, currency: 'SAR', discounts_enabled: false, discounts: [] },
      diagnostic_rules: template.diagnostic_rules || [],
    });
    setSectionsOpen({ description: true, groups: template.groups?.length > 0, fields: true, normalRanges: Object.keys(template.normal_ranges || {}).length > 0, pricing: true, diagnosticRules: template.diagnostic_rules?.length > 0 });
    setDialogOpen(true);
  };

  // ========== GROUP MANAGEMENT ==========
  const addGroup = () => {
    const newGroup: LabTemplateGroup = {
      id: `group_${Date.now()}`,
      name: '',
      name_ar: '',
      sort_order: formData.groups.length,
    };
    setFormData({ ...formData, groups: [...formData.groups, newGroup] });
  };

  const updateGroup = (index: number, updates: Partial<LabTemplateGroup>) => {
    const newGroups = [...formData.groups];
    newGroups[index] = { ...newGroups[index], ...updates };
    setFormData({ ...formData, groups: newGroups });
  };

  const removeGroup = (index: number) => {
    const groupId = formData.groups[index].id;
    // Unassign fields from this group
    const updatedFields = formData.fields.map(f => 
      f.group_id === groupId ? { ...f, group_id: undefined } : f
    );
    setFormData({ 
      ...formData, 
      groups: formData.groups.filter((_, i) => i !== index),
      fields: updatedFields
    });
  };

  const moveGroup = (index: number, direction: 'up' | 'down') => {
    const newGroups = [...formData.groups];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newGroups.length) return;
    [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]];
    newGroups.forEach((g, i) => g.sort_order = i);
    setFormData({ ...formData, groups: newGroups });
  };

  // ========== FIELD MANAGEMENT ==========
  const addField = () => {
    const newField: LabTemplateField = {
      id: `field_${Date.now()}`,
      name: '',
      name_ar: '',
      type: 'text',
      required: false,
      sort_order: formData.fields.length,
    };
    setFormData({ ...formData, fields: [...formData.fields, newField] });
  };

  const updateField = (index: number, updates: Partial<LabTemplateField>) => {
    const newFields = [...formData.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFormData({ ...formData, fields: newFields });
  };

  const removeField = (index: number) => {
    const fieldId = formData.fields[index].id;
    const { [fieldId]: _, ...remainingRanges } = formData.normal_ranges;
    setFormData({ 
      ...formData, 
      fields: formData.fields.filter((_, i) => i !== index),
      normal_ranges: remainingRanges
    });
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...formData.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    newFields.forEach((f, i) => f.sort_order = i);
    setFormData({ ...formData, fields: newFields });
  };

  const addFieldOption = (fieldId: string) => {
    const optionValue = optionInputs[fieldId]?.trim();
    if (!optionValue) return;
    
    const fieldIndex = formData.fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;
    
    const field = formData.fields[fieldIndex];
    const currentOptions = field.options || [];
    if (currentOptions.includes(optionValue)) return;
    
    updateField(fieldIndex, { options: [...currentOptions, optionValue] });
    setOptionInputs({ ...optionInputs, [fieldId]: '' });
  };

  const removeFieldOption = (fieldIndex: number, optionIndex: number) => {
    const field = formData.fields[fieldIndex];
    const newOptions = (field.options || []).filter((_, i) => i !== optionIndex);
    updateField(fieldIndex, { options: newOptions });
  };

  // ========== NORMAL RANGES ==========
  const updateNormalRange = (fieldId: string, key: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    const current = formData.normal_ranges[fieldId] || {};
    setFormData({
      ...formData,
      normal_ranges: {
        ...formData.normal_ranges,
        [fieldId]: { ...current, [key]: numValue }
      }
    });
  };

  // ========== PRICING/DISCOUNTS ==========
  const updatePricing = (updates: Partial<TemplatePricing>) => {
    setFormData({ ...formData, pricing: { ...formData.pricing, ...updates } });
  };

  const addDiscount = () => {
    const newDiscount: TemplateDiscount = {
      id: `discount_${Date.now()}`,
      name: '',
      name_ar: '',
      type: 'percentage',
      value: 0,
    };
    updatePricing({ discounts: [...(formData.pricing.discounts || []), newDiscount] });
  };

  const updateDiscount = (index: number, updates: Partial<TemplateDiscount>) => {
    const newDiscounts = [...(formData.pricing.discounts || [])];
    newDiscounts[index] = { ...newDiscounts[index], ...updates };
    updatePricing({ discounts: newDiscounts });
  };

  const removeDiscount = (index: number) => {
    updatePricing({ discounts: (formData.pricing.discounts || []).filter((_, i) => i !== index) });
  };

  const calculateFinalPrice = (discount?: TemplateDiscount) => {
    const base = formData.pricing.base_price || 0;
    if (!discount) return base;
    
    switch (discount.type) {
      case 'percentage':
        return Math.max(0, base * (1 - discount.value / 100));
      case 'fixed':
        return Math.max(0, base - discount.value);
      case 'bulk':
        return Math.max(0, base * (1 - discount.value / 100));
      default:
        return base;
    }
  };

  // ========== DIAGNOSTIC RULES ==========
  const addDiagnosticRule = () => {
    const newRule: DiagnosticRule = {
      id: `rule_${Date.now()}`,
      name: '',
      name_ar: '',
      condition: '',
      interpretation: 'normal',
      message: '',
      message_ar: '',
      is_active: true,
    };
    setFormData({ ...formData, diagnostic_rules: [...formData.diagnostic_rules, newRule] });
  };

  const updateDiagnosticRule = (index: number, updates: Partial<DiagnosticRule>) => {
    const newRules = [...formData.diagnostic_rules];
    newRules[index] = { ...newRules[index], ...updates };
    setFormData({ ...formData, diagnostic_rules: newRules });
  };

  const removeDiagnosticRule = (index: number) => {
    setFormData({ ...formData, diagnostic_rules: formData.diagnostic_rules.filter((_, i) => i !== index) });
  };

  const insertFieldIntoCondition = (ruleIndex: number, fieldName: string) => {
    const rule = formData.diagnostic_rules[ruleIndex];
    const newCondition = rule.condition + `{{${fieldName}}}`;
    updateDiagnosticRule(ruleIndex, { condition: newCondition });
  };

  // ========== SUBMIT ==========
  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    
    // Validation for select/multiselect
    const invalidSelectFields = formData.fields.filter(
      f => (f.type === 'select' || f.type === 'multiselect') && (!f.options || f.options.length === 0)
    );
    if (invalidSelectFields.length > 0) {
      return; // Don't submit - show validation error in UI
    }
    
    // Validate normal ranges
    for (const [fieldId, range] of Object.entries(formData.normal_ranges)) {
      if (range.min !== undefined && range.max !== undefined && range.min >= range.max) {
        return; // Don't submit - show validation error in UI
      }
    }
    
    // Validate discounts
    if (formData.pricing.discounts_enabled && formData.pricing.discounts) {
      for (const discount of formData.pricing.discounts) {
        if (discount.type === 'percentage' && (discount.value < 0 || discount.value > 100)) return;
        if (discount.type === 'fixed' && discount.value < 0) return;
        if (discount.type === 'bulk' && (!discount.min_quantity || discount.min_quantity < 1)) return;
      }
    }
    
    setSaving(true);
    try {
      const data: CreateLabTemplateData = {
        name: formData.name,
        name_ar: formData.name_ar || undefined,
        description: formData.description || undefined,
        description_ar: formData.description_ar || undefined,
        template_type: formData.template_type,
        category: formData.category || undefined,
        category_ar: formData.category_ar || undefined,
        is_active: formData.is_active,
        fields: formData.fields as unknown as Json,
        groups: formData.groups as unknown as Json,
        normal_ranges: formData.normal_ranges as unknown as Json,
        pricing: formData.pricing as unknown as Json,
        diagnostic_rules: formData.diagnostic_rules as unknown as Json,
      };

      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, data);
      } else {
        await createTemplate(data);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!templateToDuplicate || !duplicateName.trim()) return;
    
    setSaving(true);
    try {
      await duplicateTemplate(templateToDuplicate.id, duplicateName);
      setDuplicateDialogOpen(false);
      setTemplateToDuplicate(null);
      setDuplicateName('');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    
    setSaving(true);
    try {
      await deleteTemplate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } finally {
      setSaving(false);
    }
  };

  // Helper to get field count per group
  const getGroupFieldCount = (groupId: string) => 
    formData.fields.filter(f => f.group_id === groupId).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{t('laboratory.templates.title')}</CardTitle>
            {templates.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {stats.total} {t('laboratory.templates.templatesCount', { count: stats.total })} • {stats.active} {t('common.active')}
              </p>
            )}
          </div>
          {canManage && (
            <div className="flex gap-2 flex-wrap">
              {templates.length === 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={async () => {
                    setSeedingDefaults(true);
                    await seedDefaultTemplates();
                    setSeedingDefaults(false);
                  }}
                  disabled={seedingDefaults}
                >
                  {seedingDefaults ? (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 me-2" />
                  )}
                  {t('laboratory.templates.addDefaults')}
                </Button>
              )}
              <Button size="sm" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 me-2" />
                {t('laboratory.templates.addTemplate')}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Search & Filters */}
          {templates.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('laboratory.templates.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('laboratory.templates.allTypes')}</SelectItem>
                  {TEMPLATE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {language === 'ar' ? type.label_ar : type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">{templates.length === 0 ? t('laboratory.templates.noTemplates') : t('common.noResults')}</p>
              {templates.length === 0 && (
                <>
                  <p className="text-sm mb-4">{t('laboratory.templates.noTemplatesDesc')}</p>
                  {canManage && (
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button 
                        variant="default"
                        onClick={async () => {
                          setSeedingDefaults(true);
                          await seedDefaultTemplates();
                          setSeedingDefaults(false);
                        }}
                        disabled={seedingDefaults}
                      >
                        {seedingDefaults ? (
                          <Loader2 className="h-4 w-4 me-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 me-2" />
                        )}
                        {t('laboratory.templates.addDefaults')}
                      </Button>
                      <Button variant="outline" onClick={openCreateDialog}>
                        <Plus className="h-4 w-4 me-2" />
                        {t('laboratory.templates.createCustom')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredTemplates.map((template) => {
                const pricing = template.pricing;
                const hasPrice = typeof pricing?.base_price === 'number';
                
                return (
                <Card key={template.id} className="relative">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium truncate">{template.name}</h4>
                          <Badge variant="secondary" className="text-xs">v{template.version}</Badge>
                          {!template.is_active && (
                            <Badge variant="secondary">{t('common.inactive')}</Badge>
                          )}
                        </div>
                        {template.name_ar && (
                          <p className="text-sm text-muted-foreground truncate" dir="rtl">{template.name_ar}</p>
                        )}
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline">{TEMPLATE_TYPES.find(t => t.value === template.template_type)?.[language === 'ar' ? 'label_ar' : 'label'] || template.template_type}</Badge>
                          <Badge variant="outline">{template.fields.length} {t('laboratory.templates.fields')}</Badge>
                          {template.category && (
                            <Badge variant="outline">{template.category}</Badge>
                          )}
                          {template.groups?.length > 0 && (
                            <Badge variant="outline">{template.groups.length} {t('laboratory.templates.groups')}</Badge>
                          )}
                          {template.diagnostic_rules?.length > 0 && (
                            <Badge variant="outline">{template.diagnostic_rules.length} {t('laboratory.templates.rules')}</Badge>
                          )}
                          {hasPrice ? (
                            <Badge variant="default" className="bg-green-600">
                              {pricing.base_price} {pricing.currency || 'SAR'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">{t('laboratory.templates.noPrice')}</Badge>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-1 ms-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTemplateToDuplicate(template);
                              setDuplicateName(`${template.name} (Copy)`);
                              setDuplicateDialogOpen(true);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTemplateToDelete(template);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t('laboratory.templates.editTemplate') : t('laboratory.templates.newTemplate')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('laboratory.templates.name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Complete Blood Count"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('laboratory.templates.nameAr')}</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="الاسم بالعربية"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Description Section */}
            <Collapsible open={sectionsOpen.description} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, description: open })}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2">
                  <span className="text-sm font-medium">{t('laboratory.templates.description')}</span>
                  {sectionsOpen.description ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs">{t('laboratory.templates.descriptionEn')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Template description..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('laboratory.templates.descriptionAr')}</Label>
                  <Textarea
                    value={formData.description_ar}
                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                    placeholder="وصف القالب..."
                    dir="rtl"
                    rows={2}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Type & Category */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('laboratory.templates.type')}</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {language === 'ar' ? type.label_ar : type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('laboratory.templates.category')}</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Routine, Diagnostic"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>
            
            {formData.category && (
              <div className="space-y-2">
                <Label className="text-xs">{t('laboratory.templates.categoryAr')}</Label>
                <Input
                  value={formData.category_ar}
                  onChange={(e) => setFormData({ ...formData, category_ar: e.target.value })}
                  placeholder="الفئة بالعربية"
                  dir="rtl"
                />
              </div>
            )}

            {/* Active Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label>{t('common.active')}</Label>
                <p className="text-sm text-muted-foreground">{t('laboratory.templates.activeDesc')}</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            {/* Groups Section */}
            <Collapsible open={sectionsOpen.groups} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, groups: open })}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2 border-t pt-4">
                  <span className="text-sm font-medium">{t('laboratory.templates.groups')} ({formData.groups.length})</span>
                  {sectionsOpen.groups ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {formData.groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">{t('laboratory.templates.noGroups')}</p>
                ) : (
                  <div className="space-y-2">
                    {formData.groups.map((group, index) => (
                      <Card key={group.id} className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-0.5">
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveGroup(index, 'up')} disabled={index === 0}>
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveGroup(index, 'down')} disabled={index === formData.groups.length - 1}>
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex-1 grid gap-2 sm:grid-cols-2">
                            <Input
                              value={group.name}
                              onChange={(e) => updateGroup(index, { name: e.target.value })}
                              placeholder="Group name"
                            />
                            <Input
                              value={group.name_ar || ''}
                              onChange={(e) => updateGroup(index, { name_ar: e.target.value })}
                              placeholder="اسم المجموعة"
                              dir="rtl"
                            />
                          </div>
                          <Badge variant="secondary">{getGroupFieldCount(group.id)}</Badge>
                          <Button variant="ghost" size="icon" onClick={() => removeGroup(index)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={addGroup} className="w-full">
                  <Plus className="h-4 w-4 me-1" />
                  {t('laboratory.templates.addGroup')}
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Fields Section */}
            <Collapsible open={sectionsOpen.fields} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, fields: open })}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2 border-t pt-4">
                  <span className="text-sm font-medium">{t('laboratory.templates.fields')} ({formData.fields.length})</span>
                  {sectionsOpen.fields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {formData.fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t('laboratory.templates.noFields')}</p>
                ) : (
                  <div className="space-y-3">
                    {formData.fields.map((field, index) => {
                      const needsOptions = field.type === 'select' || field.type === 'multiselect';
                      const hasNoOptions = needsOptions && (!field.options || field.options.length === 0);
                      
                      return (
                      <Card key={field.id} className={`p-3 ${hasNoOptions ? 'border-destructive' : ''}`}>
                        <div className="space-y-3">
                          {/* Row 1: Reorder + Name + Type + Required + Delete */}
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-0.5">
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveField(index, 'up')} disabled={index === 0}>
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveField(index, 'down')} disabled={index === formData.fields.length - 1}>
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex-1 grid gap-2 sm:grid-cols-3">
                              <Input
                                value={field.name}
                                onChange={(e) => updateField(index, { name: e.target.value })}
                                placeholder={t('laboratory.templates.fieldName')}
                              />
                              <Input
                                value={field.name_ar || ''}
                                onChange={(e) => updateField(index, { name_ar: e.target.value })}
                                placeholder={t('laboratory.templates.fieldNameAr')}
                                dir="rtl"
                              />
                              <Select
                                value={field.type}
                                onValueChange={(value) => updateField(index, { type: value as LabFieldType })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {language === 'ar' ? type.label_ar : type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={field.required}
                                onCheckedChange={(checked) => updateField(index, { required: checked })}
                              />
                              <span className="text-xs">{t('common.required')}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeField(index)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          
                          {/* Row 2: Group assignment */}
                          {formData.groups.length > 0 && (
                            <div className="flex items-center gap-2 ps-8">
                              <Label className="text-xs whitespace-nowrap">{t('laboratory.templates.assignToGroup')}</Label>
                              <Select
                                value={field.group_id || 'none'}
                                onValueChange={(value) => updateField(index, { group_id: value === 'none' ? undefined : value })}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">{t('laboratory.templates.noGroup')}</SelectItem>
                                  {formData.groups.map((g) => (
                                    <SelectItem key={g.id} value={g.id}>
                                      {language === 'ar' && g.name_ar ? g.name_ar : g.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {/* Row 3: Type-specific inputs */}
                          {field.type === 'number' && (
                            <div className="grid gap-2 sm:grid-cols-2 ps-8">
                              <Input
                                placeholder={t('laboratory.templates.unit')}
                                value={field.unit || ''}
                                onChange={(e) => updateField(index, { unit: e.target.value })}
                              />
                              <Input
                                placeholder={t('laboratory.templates.unitAr')}
                                value={field.unit_ar || ''}
                                onChange={(e) => updateField(index, { unit_ar: e.target.value })}
                                dir="rtl"
                              />
                            </div>
                          )}
                          
                          {/* Options editor for select/multiselect */}
                          {needsOptions && (
                            <div className="ps-8 space-y-2">
                              {hasNoOptions && (
                                <div className="flex items-center gap-2 text-destructive text-xs">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t('laboratory.templates.optionsRequired')}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {(field.options || []).map((opt, optIndex) => (
                                  <Badge key={optIndex} variant="secondary" className="gap-1">
                                    {opt}
                                    <button onClick={() => removeFieldOption(index, optIndex)} className="hover:text-destructive">
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  placeholder={t('laboratory.templates.addOption')}
                                  value={optionInputs[field.id] || ''}
                                  onChange={(e) => setOptionInputs({ ...optionInputs, [field.id]: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFieldOption(field.id); } }}
                                  className="flex-1"
                                />
                                <Button size="sm" variant="outline" onClick={() => addFieldOption(field.id)}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* File type notice */}
                          {field.type === 'file' && (
                            <div className="ps-8 text-xs text-muted-foreground">
                              {t('laboratory.templates.fileNotSupported')}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                    })}
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={addField} className="w-full">
                  <Plus className="h-4 w-4 me-1" />
                  {t('laboratory.templates.addField')}
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* Normal Ranges Section */}
            {formData.fields.filter(f => f.type === 'number').length > 0 && (
              <Collapsible open={sectionsOpen.normalRanges} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, normalRanges: open })}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between px-2 border-t pt-4">
                    <span className="text-sm font-medium">{t('laboratory.templates.normalRanges')}</span>
                    {sectionsOpen.normalRanges ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {formData.fields.filter(f => f.type === 'number').map((field) => {
                    const range = formData.normal_ranges[field.id] || {};
                    const isInvalid = range.min !== undefined && range.max !== undefined && range.min >= range.max;
                    
                    return (
                      <div key={field.id} className={`flex items-center gap-2 ${isInvalid ? 'text-destructive' : ''}`}>
                        <span className="text-sm min-w-24 truncate">{language === 'ar' && field.name_ar ? field.name_ar : field.name}</span>
                        <Input
                          type="number"
                          placeholder={t('laboratory.templates.min')}
                          value={range.min ?? ''}
                          onChange={(e) => updateNormalRange(field.id, 'min', e.target.value)}
                          className="w-24"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder={t('laboratory.templates.max')}
                          value={range.max ?? ''}
                          onChange={(e) => updateNormalRange(field.id, 'max', e.target.value)}
                          className="w-24"
                        />
                        {field.unit && <span className="text-xs text-muted-foreground">{field.unit}</span>}
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Pricing Section */}
            <Collapsible open={sectionsOpen.pricing} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, pricing: open })}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2 border-t pt-4">
                  <span className="text-sm font-medium">{t('laboratory.templates.pricing')}</span>
                  {sectionsOpen.pricing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t('laboratory.templates.basePrice')}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.pricing.base_price ?? ''}
                      onChange={(e) => updatePricing({ base_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="e.g., 150.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('laboratory.templates.currency')}</Label>
                    <Select
                      value={formData.pricing.currency || 'SAR'}
                      onValueChange={(value) => updatePricing({ currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Discounts */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <Label>{t('laboratory.templates.enableDiscounts')}</Label>
                    <p className="text-xs text-muted-foreground">{t('laboratory.templates.enableDiscountsDesc')}</p>
                  </div>
                  <Switch
                    checked={formData.pricing.discounts_enabled || false}
                    onCheckedChange={(checked) => updatePricing({ discounts_enabled: checked })}
                  />
                </div>
                
                {formData.pricing.discounts_enabled && (
                  <div className="space-y-3">
                    {(formData.pricing.discounts || []).map((discount, index) => (
                      <Card key={discount.id} className="p-3">
                        <div className="space-y-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Input
                              value={discount.name}
                              onChange={(e) => updateDiscount(index, { name: e.target.value })}
                              placeholder={t('laboratory.templates.discountName')}
                            />
                            <Input
                              value={discount.name_ar || ''}
                              onChange={(e) => updateDiscount(index, { name_ar: e.target.value })}
                              placeholder={t('laboratory.templates.discountNameAr')}
                              dir="rtl"
                            />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Select
                              value={discount.type}
                              onValueChange={(value) => updateDiscount(index, { type: value as TemplateDiscount['type'] })}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DISCOUNT_TYPES.map((dt) => (
                                  <SelectItem key={dt.value} value={dt.value}>
                                    {language === 'ar' ? dt.label_ar : dt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1">
                              {discount.type === 'percentage' && <Percent className="h-4 w-4 text-muted-foreground" />}
                              {discount.type === 'fixed' && <DollarSign className="h-4 w-4 text-muted-foreground" />}
                              {discount.type === 'bulk' && <Package className="h-4 w-4 text-muted-foreground" />}
                              <Input
                                type="number"
                                min="0"
                                max={discount.type === 'percentage' ? 100 : undefined}
                                value={discount.value}
                                onChange={(e) => updateDiscount(index, { value: parseFloat(e.target.value) || 0 })}
                                className="w-20"
                              />
                            </div>
                            {discount.type === 'bulk' && (
                              <div className="flex items-center gap-1">
                                <Label className="text-xs">{t('laboratory.templates.minQty')}</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={discount.min_quantity || ''}
                                  onChange={(e) => updateDiscount(index, { min_quantity: parseInt(e.target.value) || undefined })}
                                  className="w-16"
                                />
                              </div>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => removeDiscount(index)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          {formData.pricing.base_price && (
                            <div className="text-xs text-muted-foreground">
                              {t('laboratory.templates.finalPrice')}: <span className="font-medium">{calculateFinalPrice(discount).toFixed(2)} {formData.pricing.currency || 'SAR'}</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                    <Button size="sm" variant="outline" onClick={addDiscount} className="w-full">
                      <Plus className="h-4 w-4 me-1" />
                      {t('laboratory.templates.addDiscount')}
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Diagnostic Rules Section */}
            <Collapsible open={sectionsOpen.diagnosticRules} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, diagnosticRules: open })}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between px-2 border-t pt-4">
                  <span className="text-sm font-medium">{t('laboratory.templates.diagnosticRules')} ({formData.diagnostic_rules.length})</span>
                  {sectionsOpen.diagnosticRules ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {formData.diagnostic_rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">{t('laboratory.templates.noRules')}</p>
                ) : (
                  <div className="space-y-3">
                    {formData.diagnostic_rules.map((rule, index) => (
                      <Card key={rule.id} className="p-3">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 grid gap-2 sm:grid-cols-2">
                              <Input
                                value={rule.name}
                                onChange={(e) => updateDiagnosticRule(index, { name: e.target.value })}
                                placeholder={t('laboratory.templates.ruleName')}
                              />
                              <Input
                                value={rule.name_ar || ''}
                                onChange={(e) => updateDiagnosticRule(index, { name_ar: e.target.value })}
                                placeholder={t('laboratory.templates.ruleNameAr')}
                                dir="rtl"
                              />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeDiagnosticRule(index)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label className="text-xs">{t('laboratory.templates.condition')}</Label>
                              <Select onValueChange={(fieldName) => insertFieldIntoCondition(index, fieldName)}>
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder={t('laboratory.templates.insertField')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {formData.fields.map((f) => (
                                    <SelectItem key={f.id} value={f.name}>
                                      {f.name} {f.unit && `(${f.unit})`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Textarea
                              value={rule.condition}
                              onChange={(e) => updateDiagnosticRule(index, { condition: e.target.value })}
                              placeholder="e.g., {{Hemoglobin}} < 12 && {{Gender}} === 'female'"
                              rows={2}
                            />
                          </div>
                          
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-xs">{t('laboratory.templates.interpretation')}</Label>
                              <Select
                                value={rule.interpretation}
                                onValueChange={(value) => updateDiagnosticRule(index, { interpretation: value as DiagnosticRule['interpretation'] })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {INTERPRETATION_TYPES.map((it) => (
                                    <SelectItem key={it.value} value={it.value}>
                                      {language === 'ar' ? it.label_ar : it.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={rule.is_active !== false}
                                onCheckedChange={(checked) => updateDiagnosticRule(index, { is_active: checked })}
                              />
                              <span className="text-xs">{t('common.active')}</span>
                            </div>
                          </div>
                          
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Textarea
                              value={rule.message || ''}
                              onChange={(e) => updateDiagnosticRule(index, { message: e.target.value })}
                              placeholder={t('laboratory.templates.messageEn')}
                              rows={2}
                            />
                            <Textarea
                              value={rule.message_ar || ''}
                              onChange={(e) => updateDiagnosticRule(index, { message_ar: e.target.value })}
                              placeholder={t('laboratory.templates.messageAr')}
                              dir="rtl"
                              rows={2}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={addDiagnosticRule} className="w-full">
                  <Plus className="h-4 w-4 me-1" />
                  {t('laboratory.templates.addRule')}
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={saving || !formData.name.trim()}
            >
              {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {editingTemplate ? t('common.update') : t('common.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('laboratory.templates.duplicateTemplate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('laboratory.templates.duplicateDesc', { name: templateToDuplicate?.name })}
            </p>
            <div className="space-y-2">
              <Label>{t('laboratory.templates.newName')}</Label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder={t('laboratory.templates.newNamePlaceholder')}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDuplicateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleDuplicate}
              disabled={saving || !duplicateName.trim()}
            >
              {saving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t('laboratory.templates.duplicate')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('laboratory.templates.deleteTemplate')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('laboratory.templates.deleteConfirm', { name: templateToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
