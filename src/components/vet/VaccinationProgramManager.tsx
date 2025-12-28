import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useVaccinationPrograms, type CreateProgramData } from "@/hooks/vet/useVaccinationPrograms";
import { Plus, Pencil, Trash2, Syringe, Loader2, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Mock vaccination programs for demo
const mockPrograms = [
  { 
    id: "prog-1", 
    name: "Tetanus", 
    name_ar: "الكزاز", 
    is_active: true, 
    default_interval_days: 365, 
    age_min_days: 90,
    notes: "Essential core vaccine for all horses",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  { 
    id: "prog-2", 
    name: "Influenza", 
    name_ar: "الانفلونزا", 
    is_active: true, 
    default_interval_days: 180, 
    age_min_days: 120,
    notes: "Required for competition horses",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  { 
    id: "prog-3", 
    name: "Rabies", 
    name_ar: "داء الكلب", 
    is_active: true, 
    default_interval_days: 365, 
    age_min_days: 90,
    notes: "Recommended in endemic areas",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  { 
    id: "prog-4", 
    name: "West Nile Virus", 
    name_ar: "فيروس غرب النيل", 
    is_active: false, 
    default_interval_days: 365,
    age_min_days: 90,
    notes: "Seasonal vaccination program",
    tenant_id: "t1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function VaccinationProgramManager() {
  const { programs, loading, canManage, createProgram, updateProgram, deleteProgram } = useVaccinationPrograms();
  
  // Use mock data when no real programs exist
  const displayPrograms = programs.length > 0 ? programs : mockPrograms;
  const isUsingMockData = programs.length === 0 && !loading;
  const [showDialog, setShowDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateProgramData>({
    name: '',
    name_ar: '',
    is_active: true,
    default_interval_days: undefined,
    age_min_days: undefined,
    notes: '',
  });

  const handleOpenCreate = () => {
    setEditingProgram(null);
    setFormData({
      name: '',
      name_ar: '',
      is_active: true,
      default_interval_days: undefined,
      age_min_days: undefined,
      notes: '',
    });
    setShowDialog(true);
  };

  const handleOpenEdit = (program: typeof programs[0]) => {
    setEditingProgram(program.id);
    setFormData({
      name: program.name,
      name_ar: program.name_ar || '',
      is_active: program.is_active,
      default_interval_days: program.default_interval_days || undefined,
      age_min_days: program.age_min_days || undefined,
      notes: program.notes || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setSubmitting(true);
    try {
      if (editingProgram) {
        await updateProgram(editingProgram, formData);
      } else {
        await createProgram(formData);
      }
      setShowDialog(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this vaccination program?")) {
      await deleteProgram(id);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isUsingMockData && (
        <Alert className="bg-amber-50 border-amber-200">
          <Lightbulb className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            هذه برامج تطعيم تجريبية للعرض. قم بإنشاء أول برنامج للبدء!
            <span className="block text-xs mt-1 opacity-75">These are demo vaccination programs. Create your first program to get started!</span>
          </AlertDescription>
        </Alert>
      )}

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Vaccine
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayPrograms.map((program) => (
            <Card key={program.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-navy">{program.name}</h4>
                      <Badge variant={program.is_active ? "default" : "secondary"}>
                        {program.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {program.name_ar && (
                      <p className="text-sm text-muted-foreground" dir="rtl">{program.name_ar}</p>
                    )}
                    {program.default_interval_days && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Repeat every {program.default_interval_days} days
                      </p>
                    )}
                    {program.age_min_days && (
                      <p className="text-xs text-muted-foreground">
                        Min age: {program.age_min_days} days
                      </p>
                    )}
                  </div>
                  {canManage && !isUsingMockData && (
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(program)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(program.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? "Edit Vaccination Program" : "New Vaccination Program"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Tetanus, Influenza"
              />
            </div>

            <div className="space-y-2">
              <Label>Name (Arabic)</Label>
              <Input
                value={formData.name_ar || ''}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                placeholder="الاسم بالعربية"
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interval (days)</Label>
                <Input
                  type="number"
                  value={formData.default_interval_days || ''}
                  onChange={(e) => setFormData({ ...formData, default_interval_days: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g., 365"
                />
              </div>
              <div className="space-y-2">
                <Label>Min Age (days)</Label>
                <Input
                  type="number"
                  value={formData.age_min_days || ''}
                  onChange={(e) => setFormData({ ...formData, age_min_days: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g., 90"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting || !formData.name}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingProgram ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
