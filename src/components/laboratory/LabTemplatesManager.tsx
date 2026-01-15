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
  ChevronDown, ChevronUp, Search, AlertTriangle,
  Percent, DollarSign, Package, Eye
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

// Unified height class for input-like controls (Task B)
const inputHeightClass = "h-10";

// Styled select trigger class for visual distinction with unified height
const selectTriggerClass = `${inputHeightClass} bg-white dark:bg-muted/40 border-border hover:bg-muted/60 focus:ring-2 focus:ring-primary/20`;

// Styled input class for clear visibility with unified height
const inputClass = `${inputHeightClass} bg-white dark:bg-muted/40 border-border`;

// Section wrapper class for collapsible sections - compact (Task A)
const sectionWrapperClass = "border border-border/60 rounded-lg bg-card/50";

// Compact collapsible trigger style (Task A)
const collapsibleTriggerClass = "w-full flex items-center justify-between py-2.5 px-3 hover:bg-muted/30 rounded-lg transition-colors";

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
  const { t, lang } = useI18n();
  const isRTL = lang === 'ar';
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<LabTemplate | null>(null);
  const [templateToDuplicate, setTemplateToDuplicate] = useState<LabTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [saving, setSaving] = useState(false);
  
  // In-editor delete confirmations
  const [fieldToDelete, setFieldToDelete] = useState<number | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
  const [discountToDelete, setDiscountToDelete] = useState<number | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);
  
// Collapsible sections state - start all collapsed for new templates (Task G)
  const [sectionsOpen, setSectionsOpen] = useState({
    description: false,
    groups: false,
    fields: false,
    normalRanges: false,
    pricing: false,
    diagnosticRules: false,
  });
  
  // Per-field collapse state
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());
  
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
  
  // Track if reordering is in progress
  const [isReordering, setIsReordering] = useState(false);
  
  // Toggle field expansion
  const toggleFieldExpanded = (fieldId: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  };
  
  // Auto-collapse all except current field during reorder
  const handleReorderStart = (currentFieldId: string) => {
    setIsReordering(true);
    setExpandedFields(new Set([currentFieldId]));
  };
  
  const handleReorderEnd = () => {
    setIsReordering(false);
  };
  
  // Filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        t.name.toLowerCase().includes(searchLower) ||
        (t.name_ar && t.name_ar.toLowerCase().includes(searchLower)) ||
        (t.category && t.category.toLowerCase().includes(searchLower)) ||
        (t.description && t.description.toLowerCase().includes(searchLower));
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && t.is_active) ||
        (statusFilter === 'inactive' && !t.is_active);
      
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
    // Task G: Start all sections collapsed for new template
    setExpandedFields(new Set());
    setSectionsOpen({ description: false, groups: false, fields: false, normalRanges: false, pricing: false, diagnosticRules: false });
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
    // If more than 5 fields, collapse all except first
    const fields = template.fields || [];
    if (fields.length > 5) {
      setExpandedFields(new Set(fields.length > 0 ? [fields[0].id] : []));
    } else {
      setExpandedFields(new Set(fields.map(f => f.id)));
    }
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

  const confirmRemoveGroup = () => {
    if (groupToDelete === null) return;
    const groupId = formData.groups[groupToDelete].id;
    const updatedFields = formData.fields.map(f => 
      f.group_id === groupId ? { ...f, group_id: undefined } : f
    );
    setFormData({ 
      ...formData, 
      groups: formData.groups.filter((_, i) => i !== groupToDelete),
      fields: updatedFields
    });
    setGroupToDelete(null);
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
    // Auto-expand new field
    setExpandedFields(prev => new Set([...prev, newField.id]));
  };

  const updateField = (index: number, updates: Partial<LabTemplateField>) => {
    const newFields = [...formData.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFormData({ ...formData, fields: newFields });
  };

  const confirmRemoveField = () => {
    if (fieldToDelete === null) return;
    const fieldId = formData.fields[fieldToDelete].id;
    const { [fieldId]: _, ...remainingRanges } = formData.normal_ranges;
    setFormData({ 
      ...formData, 
      fields: formData.fields.filter((_, i) => i !== fieldToDelete),
      normal_ranges: remainingRanges
    });
    setExpandedFields(prev => {
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
    setFieldToDelete(null);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...formData.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    
    // Auto-collapse during reorder
    const currentFieldId = newFields[index].id;
    handleReorderStart(currentFieldId);
    
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    newFields.forEach((f, i) => f.sort_order = i);
    setFormData({ ...formData, fields: newFields });
    
    // End reorder after a short delay
    setTimeout(handleReorderEnd, 300);
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

  const confirmRemoveDiscount = () => {
    if (discountToDelete === null) return;
    updatePricing({ discounts: (formData.pricing.discounts || []).filter((_, i) => i !== discountToDelete) });
    setDiscountToDelete(null);
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

  const confirmRemoveRule = () => {
    if (ruleToDelete === null) return;
    setFormData({ ...formData, diagnostic_rules: formData.diagnostic_rules.filter((_, i) => i !== ruleToDelete) });
    setRuleToDelete(null);
  };

  const insertFieldIntoCondition = (ruleIndex: number, fieldName: string) => {
    const rule = formData.diagnostic_rules[ruleIndex];
    const newCondition = rule.condition + `{{${fieldName}}}`;
    updateDiagnosticRule(ruleIndex, { condition: newCondition });
  };

  // ========== SUBMIT ==========
  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    
    const invalidSelectFields = formData.fields.filter(
      f => (f.type === 'select' || f.type === 'multiselect') && (!f.options || f.options.length === 0)
    );
    if (invalidSelectFields.length > 0) {
      return;
    }
    
    for (const [fieldId, range] of Object.entries(formData.normal_ranges)) {
      if (range.min !== undefined && range.max !== undefined && range.min >= range.max) {
        return;
      }
    }
    
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

  const getGroupFieldCount = (groupId: string) => 
    formData.fields.filter(f => f.group_id === groupId).length;

  if (loading) {
    return (
      <Card className="rounded-2xl">
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
      <Card className="rounded-2xl w-full max-w-full overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-6 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <div className="flex-1">
            <CardTitle className="text-lg">{t('laboratory.templates.title')}</CardTitle>
            {/* KPI Stats Widgets */}
            {templates.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">
                  {stats.total} {t('laboratory.templates.totalTemplates')}
                </Badge>
                <Badge variant="default" className="px-3 py-1 text-xs font-medium bg-green-600">
                  {stats.active} {t('laboratory.templates.activeTemplates')}
                </Badge>
                {stats.inactive > 0 && (
                  <Badge variant="outline" className="px-3 py-1 text-xs font-medium">
                    {stats.inactive} {t('laboratory.templates.inactiveTemplates')}
                  </Badge>
                )}
              </div>
            )}
          </div>
          {canManage && (
            <div className={`flex gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
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
        <CardContent className="px-4 sm:px-6">
          {/* Search & Filters */}
          {templates.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Task B: Unified height for search and filter controls */}
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('laboratory.templates.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`ps-9 ${inputClass}`}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className={`w-full sm:w-32 ${selectTriggerClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className={`w-full sm:w-36 ${selectTriggerClass}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('laboratory.templates.allTypes')}</SelectItem>
                  {TEMPLATE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {isRTL ? type.label_ar : type.label}
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
                <Card key={template.id} className="relative rounded-2xl w-full max-w-full overflow-hidden">
                  <CardContent className="pt-4">
                    {/* Task E: Improved card layout with preview action and better mobile wrapping */}
                    <div className={`flex flex-col gap-3 ${isRTL ? 'items-end' : 'items-start'}`}>
                      {/* Actions row - moved to top for mobile visibility */}
                      {canManage && (
                        <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse self-start' : 'self-end'}`}>
                          {/* Preview button - Task E */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              openEditDialog(template);
                              setPreviewOpen(true);
                            }}
                            title={t('laboratory.templates.preview')}
                          >
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
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
                      {/* Template info - allow name to wrap */}
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium break-words">{template.name}</h4>
                          <Badge variant="secondary" className="text-xs shrink-0">v{template.version}</Badge>
                          {!template.is_active && (
                            <Badge variant="secondary" className="shrink-0">{t('common.inactive')}</Badge>
                          )}
                        </div>
                        {template.name_ar && (
                          <p className="text-sm text-muted-foreground break-words" dir="rtl">{template.name_ar}</p>
                        )}
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline">{TEMPLATE_TYPES.find(t => t.value === template.template_type)?.[isRTL ? 'label_ar' : 'label'] || template.template_type}</Badge>
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
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog - Task C & D: Sticky header + subtle scrollbar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent 
          className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl p-0 flex flex-col" 
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Task C: Sticky header with solid background, proper z-index, close button included */}
          <div className={`sticky top-0 z-20 bg-background border-b px-6 py-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center justify-between gap-3 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
              <DialogTitle className="text-lg">
                {editingTemplate ? t('laboratory.templates.editTemplate') : t('laboratory.templates.newTemplate')}
              </DialogTitle>
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* Active toggle in header */}
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm font-medium">{t('laboratory.templates.activeInHeader')}</span>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                {/* Preview button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPreviewOpen(true)}
                  className="gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  {t('laboratory.templates.preview')}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
          <div className="space-y-5">
            {/* Basic Info - Bilingual labels */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('laboratory.templates.nameEnRequired')}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('laboratory.templates.placeholderTemplateName')}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('laboratory.templates.nameAr')}</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder={t('laboratory.templates.placeholderTemplateNameAr')}
                  dir="rtl"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Description Section */}
            <Collapsible open={sectionsOpen.description} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, description: open })}>
              <div className={sectionWrapperClass}>
                <CollapsibleTrigger asChild>
                  <button type="button" className={collapsibleTriggerClass}>
                    <span className="text-sm font-medium">{t('laboratory.templates.description')}</span>
                    {sectionsOpen.description ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 px-3 pb-3">
                  <div className="space-y-2">
                    <Label className="text-xs">{t('laboratory.templates.descriptionEn')}</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('laboratory.templates.placeholderDescription')}
                      rows={2}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">{t('laboratory.templates.descriptionAr')}</Label>
                    <Textarea
                      value={formData.description_ar}
                      onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                      placeholder={t('laboratory.templates.placeholderDescriptionAr')}
                      dir="rtl"
                      rows={2}
                      className={inputClass}
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Type & Category */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('laboratory.templates.type')}</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {isRTL ? type.label_ar : type.label}
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
                  className={inputClass}
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
                  className={inputClass}
                />
              </div>
            )}

            {/* Groups Section */}
            <Collapsible open={sectionsOpen.groups} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, groups: open })}>
              <div className={sectionWrapperClass}>
                <CollapsibleTrigger asChild>
                  <button type="button" className={collapsibleTriggerClass}>
                    <span className="text-sm font-medium">{t('laboratory.templates.groups')} ({formData.groups.length})</span>
                    {sectionsOpen.groups ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 px-3 pb-3">
                  {formData.groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">{t('laboratory.templates.noGroups')}</p>
                  ) : (
                    <div className="space-y-2">
                      {formData.groups.map((group, index) => (
                        <Card key={group.id} className="p-3 rounded-xl bg-white dark:bg-muted/20">
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
                                placeholder={t('laboratory.templates.groupNameEn')}
                                className={inputClass}
                              />
                              <Input
                                value={group.name_ar || ''}
                                onChange={(e) => updateGroup(index, { name_ar: e.target.value })}
                                placeholder={t('laboratory.templates.groupNameAr')}
                                dir="rtl"
                                className={inputClass}
                              />
                            </div>
                            <Badge variant="secondary">{getGroupFieldCount(group.id)}</Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setGroupToDelete(index)}
                              className="h-8 w-8 rounded-md border border-border/50 hover:border-destructive/50 hover:bg-destructive/10"
                            >
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
              </div>
            </Collapsible>

            {/* Fields Section with per-item collapse */}
            <Collapsible open={sectionsOpen.fields} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, fields: open })}>
              <div className={sectionWrapperClass}>
                <CollapsibleTrigger asChild>
                  <button type="button" className={collapsibleTriggerClass}>
                    <span className="text-sm font-medium">{t('laboratory.templates.fields')} ({formData.fields.length})</span>
                    {sectionsOpen.fields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 px-3 pb-3">
                  {formData.fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('laboratory.templates.noFields')}</p>
                  ) : (
                    <div className="space-y-2">
                      {formData.fields.map((field, index) => {
                        const isExpanded = expandedFields.has(field.id);
                        const needsOptions = field.type === 'select' || field.type === 'multiselect';
                        const hasNoOptions = needsOptions && (!field.options || field.options.length === 0);
                        const fieldType = FIELD_TYPES.find(ft => ft.value === field.type);
                        const assignedGroup = formData.groups.find(g => g.id === field.group_id);
                        const normalRange = formData.normal_ranges[field.id] || {};
                        const isRangeInvalid = normalRange.min !== undefined && normalRange.max !== undefined && normalRange.min >= normalRange.max;
                        
                        return (
                        <Card key={field.id} className={`p-3 rounded-xl bg-white dark:bg-muted/20 ${hasNoOptions ? 'border-destructive' : ''}`}>
                          {/* Collapsed Summary */}
                          <div 
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => toggleFieldExpanded(field.id)}
                          >
                            <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveField(index, 'up')} disabled={index === 0}>
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveField(index, 'down')} disabled={index === formData.fields.length - 1}>
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate">{field.name || t('laboratory.templates.fieldName')}</span>
                                {field.name_ar && (
                                  <span className="text-sm text-muted-foreground truncate" dir="rtl">({field.name_ar})</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {isRTL ? fieldType?.label_ar : fieldType?.label}
                                </Badge>
                                <Badge variant={field.required ? "default" : "secondary"} className="text-xs">
                                  {field.required ? t('laboratory.templates.requiredBadge') : t('laboratory.templates.optionalBadge')}
                                </Badge>
                                {assignedGroup ? (
                                  <Badge variant="outline" className="text-xs">
                                    {isRTL && assignedGroup.name_ar ? assignedGroup.name_ar : assignedGroup.name}
                                  </Badge>
                                ) : formData.groups.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">{t('laboratory.templates.noGroupBadge')}</Badge>
                                )}
                              </div>
                            </div>
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setFieldToDelete(index)}
                                className="h-8 w-8 rounded-md border border-border/50 hover:border-destructive/50 hover:bg-destructive/10"
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => toggleFieldExpanded(field.id)}
                                className="h-8 w-8 rounded-md border border-border/50 hover:bg-muted"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t space-y-3">
                              {/* Row A: Field Names EN/AR */}
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">{t('laboratory.templates.fieldNameEn')}</Label>
                                  <Input
                                    value={field.name}
                                    onChange={(e) => updateField(index, { name: e.target.value })}
                                    placeholder={t('laboratory.templates.placeholderFieldName')}
                                    className={inputClass}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">{t('laboratory.templates.fieldNameAr')}</Label>
                                  <Input
                                    value={field.name_ar || ''}
                                    onChange={(e) => updateField(index, { name_ar: e.target.value })}
                                    placeholder={t('laboratory.templates.placeholderFieldNameAr')}
                                    dir="rtl"
                                    className={inputClass}
                                  />
                                </div>
                              </div>
                              
                              {/* Row B: Type + Required + Group */}
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">{t('laboratory.templates.fieldType')}</Label>
                                  <Select
                                    value={field.type}
                                    onValueChange={(value) => updateField(index, { type: value as LabFieldType })}
                                  >
                                    <SelectTrigger className={selectTriggerClass}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FIELD_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                          {isRTL ? type.label_ar : type.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                  <Switch
                                    checked={field.required}
                                    onCheckedChange={(checked) => updateField(index, { required: checked })}
                                  />
                                  <span className="text-xs">{t('laboratory.templates.required')}</span>
                                </div>
                                {formData.groups.length > 0 && (
                                  <div className="space-y-1">
                                    <Label className="text-xs">{t('laboratory.templates.assignToGroup')}</Label>
                                    <Select
                                      value={field.group_id || 'none'}
                                      onValueChange={(value) => updateField(index, { group_id: value === 'none' ? undefined : value })}
                                    >
                                      <SelectTrigger className={selectTriggerClass}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">{t('laboratory.templates.noGroup')}</SelectItem>
                                        {formData.groups.map((g) => (
                                          <SelectItem key={g.id} value={g.id}>
                                            {isRTL && g.name_ar ? g.name_ar : g.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                              
                              {/* Row C: Type-specific inputs for number fields - includes normal ranges */}
                              {field.type === 'number' && (
                                <div className="space-y-3">
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <Input
                                      placeholder={t('laboratory.templates.unit')}
                                      value={field.unit || ''}
                                      onChange={(e) => updateField(index, { unit: e.target.value })}
                                      className={inputClass}
                                    />
                                    <Input
                                      placeholder={t('laboratory.templates.unitAr')}
                                      value={field.unit_ar || ''}
                                      onChange={(e) => updateField(index, { unit_ar: e.target.value })}
                                      dir="rtl"
                                      className={inputClass}
                                    />
                                  </div>
                                  {/* Normal Range - now inside the field card */}
                                  <div className={`p-3 rounded-lg bg-muted/30 border border-border/50 ${isRangeInvalid ? 'border-destructive' : ''}`}>
                                    <Label className="text-xs font-medium mb-2 block">{t('laboratory.templates.normalRanges')}</Label>
                                    <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">{t('laboratory.templates.min')}</span>
                                        <Input
                                          type="number"
                                          placeholder="0"
                                          value={normalRange.min ?? ''}
                                          onChange={(e) => updateNormalRange(field.id, 'min', e.target.value)}
                                          className={`w-24 ${inputClass}`}
                                        />
                                      </div>
                                      <span className="text-muted-foreground">-</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">{t('laboratory.templates.max')}</span>
                                        <Input
                                          type="number"
                                          placeholder="100"
                                          value={normalRange.max ?? ''}
                                          onChange={(e) => updateNormalRange(field.id, 'max', e.target.value)}
                                          className={`w-24 ${inputClass}`}
                                        />
                                      </div>
                                      {field.unit && <span className="text-xs text-muted-foreground ms-2">{field.unit}</span>}
                                    </div>
                                    {isRangeInvalid && (
                                      <p className="text-xs text-destructive mt-1">{t('laboratory.templates.invalidRange')}</p>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {/* Options editor for select/multiselect */}
                              {needsOptions && (
                                <div className="space-y-2">
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
                                      className={`flex-1 ${inputClass}`}
                                    />
                                    <Button size="sm" variant="outline" onClick={() => addFieldOption(field.id)}>
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                              
                              {/* File type notice */}
                              {field.type === 'file' && (
                                <div className="text-xs text-muted-foreground">
                                  {t('laboratory.templates.fileNotSupported')}
                                </div>
                              )}
                            </div>
                          )}
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
              </div>
            </Collapsible>

            {/* Pricing Section */}
            <Collapsible open={sectionsOpen.pricing} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, pricing: open })}>
              <div className={sectionWrapperClass}>
                <CollapsibleTrigger asChild>
                  <button type="button" className={collapsibleTriggerClass}>
                    <span className="text-sm font-medium">{t('laboratory.templates.pricing')}</span>
                    {sectionsOpen.pricing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 px-3 pb-3">
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
                      <SelectTrigger className={selectTriggerClass}>
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
                      <Card key={discount.id} className="p-3 rounded-xl">
                        <div className="space-y-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">{t('laboratory.templates.discountNameEn')}</Label>
                              <Input
                                value={discount.name}
                                onChange={(e) => updateDiscount(index, { name: e.target.value })}
                                placeholder={t('laboratory.templates.placeholderDiscountName')}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t('laboratory.templates.discountNameAr')}</Label>
                              <Input
                                value={discount.name_ar || ''}
                                onChange={(e) => updateDiscount(index, { name_ar: e.target.value })}
                                placeholder={t('laboratory.templates.placeholderDiscountNameAr')}
                                dir="rtl"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Select
                              value={discount.type}
                              onValueChange={(value) => updateDiscount(index, { type: value as TemplateDiscount['type'] })}
                            >
                              <SelectTrigger className={`w-36 ${selectTriggerClass}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DISCOUNT_TYPES.map((dt) => (
                                  <SelectItem key={dt.value} value={dt.value}>
                                    {isRTL ? dt.label_ar : dt.label}
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
                            <Button variant="ghost" size="icon" onClick={() => setDiscountToDelete(index)}>
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
              </div>
            </Collapsible>

            {/* Diagnostic Rules Section - Task A: Match style with other sections */}
            <Collapsible open={sectionsOpen.diagnosticRules} onOpenChange={(open) => setSectionsOpen({ ...sectionsOpen, diagnosticRules: open })}>
              <div className={sectionWrapperClass}>
                <CollapsibleTrigger asChild>
                  <button type="button" className={collapsibleTriggerClass}>
                    <span className="text-sm font-medium">{t('laboratory.templates.diagnosticRules')} ({formData.diagnostic_rules.length})</span>
                    {sectionsOpen.diagnosticRules ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 px-3 pb-3">
                {formData.diagnostic_rules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">{t('laboratory.templates.noRules')}</p>
                ) : (
                  <div className="space-y-3">
                    {formData.diagnostic_rules.map((rule, index) => (
                      <Card key={rule.id} className="p-3 rounded-xl">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-xs">{t('laboratory.templates.ruleNameEn')}</Label>
                                <Input
                                  value={rule.name}
                                  onChange={(e) => updateDiagnosticRule(index, { name: e.target.value })}
                                  placeholder={t('laboratory.templates.placeholderRuleName')}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t('laboratory.templates.ruleNameAr')}</Label>
                                <Input
                                  value={rule.name_ar || ''}
                                  onChange={(e) => updateDiagnosticRule(index, { name_ar: e.target.value })}
                                  placeholder={t('laboratory.templates.placeholderRuleNameAr')}
                                  dir="rtl"
                                />
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setRuleToDelete(index)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Label className="text-xs">{t('laboratory.templates.condition')}</Label>
                              <Select onValueChange={(fieldName) => insertFieldIntoCondition(index, fieldName)}>
                                <SelectTrigger className={`w-40 ${selectTriggerClass}`}>
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
                                <SelectTrigger className={selectTriggerClass}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {INTERPRETATION_TYPES.map((it) => (
                                    <SelectItem key={it.value} value={it.value}>
                                      {isRTL ? it.label_ar : it.label}
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
                            <div className="space-y-1">
                              <Label className="text-xs">{t('laboratory.templates.messageEn')}</Label>
                              <Textarea
                                value={rule.message || ''}
                                onChange={(e) => updateDiagnosticRule(index, { message: e.target.value })}
                                placeholder={t('laboratory.templates.messagePlaceholder')}
                                rows={2}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">{t('laboratory.templates.messageAr')}</Label>
                              <Textarea
                                value={rule.message_ar || ''}
                                onChange={(e) => updateDiagnosticRule(index, { message_ar: e.target.value })}
                                placeholder={t('laboratory.templates.messageArPlaceholder')}
                                dir="rtl"
                                rows={2}
                              />
                            </div>
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
              </div>
            </Collapsible>
          </div>
          </div>

          {/* Footer - outside scroll area for sticky positioning */}
          <div className={`flex gap-3 px-6 py-4 border-t bg-background ${isRTL ? 'flex-row-reverse' : ''}`}>
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('laboratory.templates.preview')}</DialogTitle>
            <p className="text-sm text-muted-foreground">{t('laboratory.templates.previewDesc')}</p>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Template Name */}
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{formData.name || t('laboratory.templates.newTemplate')}</h3>
              {formData.name_ar && <p className="text-muted-foreground" dir="rtl">{formData.name_ar}</p>}
            </div>
            
            {/* Description */}
            {(formData.description || formData.description_ar) && (
              <div className="space-y-1">
                {formData.description && <p className="text-sm">{formData.description}</p>}
                {formData.description_ar && <p className="text-sm text-muted-foreground" dir="rtl">{formData.description_ar}</p>}
              </div>
            )}
            
            {/* Type & Category */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {TEMPLATE_TYPES.find(t => t.value === formData.template_type)?.[isRTL ? 'label_ar' : 'label']}
              </Badge>
              {formData.category && <Badge variant="outline">{formData.category}</Badge>}
              <Badge variant={formData.is_active ? "default" : "secondary"}>
                {formData.is_active ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
            
            {/* Groups Summary */}
            {formData.groups.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">{t('laboratory.templates.groups')} ({formData.groups.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {formData.groups.map(g => (
                    <Badge key={g.id} variant="secondary">
                      {isRTL && g.name_ar ? g.name_ar : g.name} ({getGroupFieldCount(g.id)})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Fields Summary */}
            {formData.fields.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">{t('laboratory.templates.fields')} ({formData.fields.length})</h4>
                <div className="grid gap-1">
                  {formData.fields.map(f => {
                    const fieldType = FIELD_TYPES.find(ft => ft.value === f.type);
                    return (
                      <div key={f.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{isRTL && f.name_ar ? f.name_ar : f.name}</span>
                        <Badge variant="outline" className="text-xs">{isRTL ? fieldType?.label_ar : fieldType?.label}</Badge>
                        {f.required && <Badge variant="default" className="text-xs">{t('laboratory.templates.requiredBadge')}</Badge>}
                        {f.unit && <span className="text-muted-foreground text-xs">({f.unit})</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Pricing Summary */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{t('laboratory.templates.pricing')}</h4>
              {formData.pricing.base_price ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">
                    {formData.pricing.base_price} {formData.pricing.currency || 'SAR'}
                  </Badge>
                  {formData.pricing.discounts_enabled && formData.pricing.discounts?.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      + {formData.pricing.discounts.length} {t('laboratory.templates.discounts')}
                    </span>
                  )}
                </div>
              ) : (
                <Badge variant="destructive">{t('laboratory.templates.noPrice')}</Badge>
              )}
            </div>
            
            {/* Diagnostic Rules Summary */}
            {formData.diagnostic_rules.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">{t('laboratory.templates.diagnosticRules')} ({formData.diagnostic_rules.length})</h4>
                <div className="grid gap-1">
                  {formData.diagnostic_rules.map(r => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <span>{isRTL && r.name_ar ? r.name_ar : r.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {INTERPRETATION_TYPES.find(it => it.value === r.interpretation)?.[isRTL ? 'label_ar' : 'label']}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              {t('common.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="rounded-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{t('laboratory.templates.duplicateTemplate')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('laboratory.templates.duplicateDesc')} "{templateToDuplicate?.name}"
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
          <div className={`flex gap-3 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
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

      {/* Delete Template Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('laboratory.templates.deleteTemplate')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('laboratory.templates.deleteConfirm')} "{templateToDelete?.name}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Field Confirmation */}
      <AlertDialog open={fieldToDelete !== null} onOpenChange={(open) => !open && setFieldToDelete(null)}>
        <AlertDialogContent className="rounded-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('laboratory.templates.confirmDeleteFieldTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('laboratory.templates.confirmDeleteFieldDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{t('laboratory.templates.confirmCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveField} className="bg-destructive text-destructive-foreground">
              {t('laboratory.templates.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Group Confirmation */}
      <AlertDialog open={groupToDelete !== null} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <AlertDialogContent className="rounded-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('laboratory.templates.confirmDeleteGroupTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('laboratory.templates.confirmDeleteGroupDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{t('laboratory.templates.confirmCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveGroup} className="bg-destructive text-destructive-foreground">
              {t('laboratory.templates.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Discount Confirmation */}
      <AlertDialog open={discountToDelete !== null} onOpenChange={(open) => !open && setDiscountToDelete(null)}>
        <AlertDialogContent className="rounded-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('laboratory.templates.confirmDeleteDiscountTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('laboratory.templates.confirmDeleteDiscountDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{t('laboratory.templates.confirmCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveDiscount} className="bg-destructive text-destructive-foreground">
              {t('laboratory.templates.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Rule Confirmation */}
      <AlertDialog open={ruleToDelete !== null} onOpenChange={(open) => !open && setRuleToDelete(null)}>
        <AlertDialogContent className="rounded-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('laboratory.templates.confirmDeleteRuleTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('laboratory.templates.confirmDeleteRuleDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{t('laboratory.templates.confirmCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveRule} className="bg-destructive text-destructive-foreground">
              {t('laboratory.templates.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
