import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Copy, Pencil, Trash2, FileText, Loader2, X } from "lucide-react";
import { useLabTemplates, type CreateLabTemplateData, type LabTemplate, type LabTemplateField } from "@/hooks/laboratory/useLabTemplates";
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

const TEMPLATE_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'blood', label: 'Blood Work' },
  { value: 'urine', label: 'Urine Analysis' },
  { value: 'genetic', label: 'Genetic' },
  { value: 'hormonal', label: 'Hormonal' },
  { value: 'imaging', label: 'Imaging' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'textarea', label: 'Text Area' },
];

export function LabTemplatesManager() {
  const { templates, loading, canManage, createTemplate, updateTemplate, duplicateTemplate, deleteTemplate } = useLabTemplates();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<LabTemplate | null>(null);
  const [templateToDuplicate, setTemplateToDuplicate] = useState<LabTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<{
    name: string;
    name_ar: string;
    template_type: string;
    category: string;
    is_active: boolean;
    fields: LabTemplateField[];
  }>({
    name: '',
    name_ar: '',
    template_type: 'standard',
    category: '',
    is_active: true,
    fields: [],
  });

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      name_ar: '',
      template_type: 'standard',
      category: '',
      is_active: true,
      fields: [],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (template: LabTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      name_ar: template.name_ar || '',
      template_type: template.template_type,
      category: template.category || '',
      is_active: template.is_active,
      fields: template.fields || [],
    });
    setDialogOpen(true);
  };

  const addField = () => {
    const newField: LabTemplateField = {
      id: `field_${Date.now()}`,
      name: '',
      type: 'text',
      required: false,
    };
    setFormData({ ...formData, fields: [...formData.fields, newField] });
  };

  const updateField = (index: number, updates: Partial<LabTemplateField>) => {
    const newFields = [...formData.fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFormData({ ...formData, fields: newFields });
  };

  const removeField = (index: number) => {
    setFormData({ ...formData, fields: formData.fields.filter((_, i) => i !== index) });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      const data: CreateLabTemplateData = {
        name: formData.name,
        name_ar: formData.name_ar || undefined,
        template_type: formData.template_type,
        category: formData.category || undefined,
        is_active: formData.is_active,
        fields: formData.fields as unknown as Json,
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Result Templates</CardTitle>
          {canManage && (
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates configured</p>
              {canManage && (
                <Button variant="link" onClick={openCreateDialog}>
                  Create your first template
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((template) => (
                <Card key={template.id} className="relative">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template.name}</h4>
                          {!template.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        {template.name_ar && (
                          <p className="text-sm text-muted-foreground" dir="rtl">{template.name_ar}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline">{template.template_type}</Badge>
                          <Badge variant="outline">{template.fields.length} fields</Badge>
                          {template.category && (
                            <Badge variant="outline">{template.category}</Badge>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex gap-1">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Complete Blood Count"
                />
              </div>

              <div className="space-y-2">
                <Label>Name (Arabic)</Label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="الاسم بالعربية"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
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
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Routine, Diagnostic"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Make this template available for use</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            {/* Fields Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button size="sm" variant="outline" onClick={addField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>

              {formData.fields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No fields defined. Add fields to capture result data.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.fields.map((field, index) => (
                    <Card key={field.id} className="p-3">
                      <div className="grid gap-3 sm:grid-cols-4 items-end">
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Field Name</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateField(index, { name: e.target.value })}
                            placeholder="e.g., Hemoglobin"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateField(index, { type: value as LabTemplateField['type'] })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(checked) => updateField(index, { required: checked })}
                            />
                            <span className="text-xs">Req</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeField(index)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {field.type === 'number' && (
                        <div className="grid gap-3 sm:grid-cols-2 mt-2">
                          <Input
                            placeholder="Unit (e.g., g/dL)"
                            value={field.unit || ''}
                            onChange={(e) => updateField(index, { unit: e.target.value })}
                          />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={saving || !formData.name.trim()}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Creating a copy of "{templateToDuplicate?.name}"
            </p>
            <div className="space-y-2">
              <Label>New Template Name</Label>
              <Input
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Enter name for the copy"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDuplicateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleDuplicate}
              disabled={saving || !duplicateName.trim()}
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Duplicate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
