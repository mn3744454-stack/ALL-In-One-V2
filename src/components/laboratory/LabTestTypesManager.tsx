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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Pin, Loader2 } from "lucide-react";
import { useLabTestTypes, type CreateLabTestTypeData, type LabTestType } from "@/hooks/laboratory/useLabTestTypes";
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

export function LabTestTypesManager() {
  const { testTypes, loading, canManage, createTestType, updateTestType, deleteTestType } = useLabTestTypes();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<LabTestType | null>(null);
  const [typeToDelete, setTypeToDelete] = useState<LabTestType | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<CreateLabTestTypeData>({
    name: '',
    name_ar: '',
    code: '',
    is_active: true,
    pin_as_tab: false,
  });

  const openCreateDialog = () => {
    setEditingType(null);
    setFormData({
      name: '',
      name_ar: '',
      code: '',
      is_active: true,
      pin_as_tab: false,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (type: LabTestType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      name_ar: type.name_ar || '',
      code: type.code || '',
      is_active: type.is_active,
      pin_as_tab: type.pin_as_tab,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      if (editingType) {
        await updateTestType(editingType.id, formData);
      } else {
        await createTestType(formData);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;
    
    setSaving(true);
    try {
      await deleteTestType(typeToDelete.id);
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (type: LabTestType) => {
    await updateTestType(type.id, { pin_as_tab: !type.pin_as_tab });
  };

  const toggleActive = async (type: LabTestType) => {
    await updateTestType(type.id, { is_active: !type.is_active });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
          <CardTitle className="text-lg">Test Types</CardTitle>
          {canManage && (
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Type
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {testTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No test types configured</p>
              {canManage && (
                <Button variant="link" onClick={openCreateDialog}>
                  Create your first test type
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Pinned</TableHead>
                  {canManage && <TableHead className="w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {testTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{type.name}</p>
                        {type.name_ar && (
                          <p className="text-sm text-muted-foreground">{type.name_ar}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {type.code && (
                        <Badge variant="outline" className="font-mono">
                          {type.code}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {canManage ? (
                        <Switch
                          checked={type.is_active}
                          onCheckedChange={() => toggleActive(type)}
                        />
                      ) : (
                        <Badge variant={type.is_active ? "default" : "secondary"}>
                          {type.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {canManage ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePin(type)}
                          className={type.pin_as_tab ? "text-primary" : "text-muted-foreground"}
                        >
                          <Pin className="h-4 w-4" />
                        </Button>
                      ) : (
                        type.pin_as_tab && <Pin className="h-4 w-4 mx-auto text-primary" />
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(type)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTypeToDelete(type);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Test Type' : 'New Test Type'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Blood Test, Urine Analysis"
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

            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., BT, UA"
                className="font-mono"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Show this type in selection lists</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Pin as Tab</Label>
                <p className="text-sm text-muted-foreground">Show as quick filter tab</p>
              </div>
              <Switch
                checked={formData.pin_as_tab}
                onCheckedChange={(checked) => setFormData({ ...formData, pin_as_tab: checked })}
              />
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
              {editingType ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{typeToDelete?.name}"? This action cannot be undone.
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
