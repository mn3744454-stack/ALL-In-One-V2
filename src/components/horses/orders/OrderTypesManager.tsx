import { useState } from "react";
import { useHorseOrderTypes, HorseOrderType, CreateOrderTypeData } from "@/hooks/useHorseOrderTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Settings, Plus, Pencil, Trash2, GripVertical, Pin, PinOff } from "lucide-react";

interface OrderTypesManagerProps {
  trigger?: React.ReactNode;
}

export function OrderTypesManager({ trigger }: OrderTypesManagerProps) {
  const isMobile = useIsMobile();
  const { orderTypes, loading, canManage, createOrderType, updateOrderType, deleteOrderType } = useHorseOrderTypes();
  
  const [open, setOpen] = useState(false);
  const [editingType, setEditingType] = useState<HorseOrderType | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [pinAsTab, setPinAsTab] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const resetForm = () => {
    setName("");
    setNameAr("");
    setCategory("");
    setIsActive(true);
    setPinAsTab(false);
    setSortOrder(0);
    setEditingType(null);
  };

  const openEditForm = (type: HorseOrderType) => {
    setEditingType(type);
    setName(type.name);
    setNameAr(type.name_ar || "");
    setCategory(type.category || "");
    setIsActive(type.is_active);
    setPinAsTab(type.pin_as_tab);
    setSortOrder(type.sort_order);
    setFormOpen(true);
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    const data: CreateOrderTypeData = {
      name,
      name_ar: nameAr || null,
      category: category || null,
      is_active: isActive,
      pin_as_tab: pinAsTab,
      sort_order: sortOrder,
    };

    if (editingType) {
      await updateOrderType(editingType.id, data);
    } else {
      await createOrderType(data);
    }
    
    setFormOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteOrderType(deleteId);
      setDeleteId(null);
    }
  };

  const togglePin = async (type: HorseOrderType) => {
    await updateOrderType(type.id, { pin_as_tab: !type.pin_as_tab });
  };

  const toggleActive = async (type: HorseOrderType) => {
    await updateOrderType(type.id, { is_active: !type.is_active });
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Settings className="w-4 h-4" />
      Manage Order Types
    </Button>
  );

  const content = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define the types of orders/services your organization handles.
        </p>
        {canManage && (
          <Button size="sm" onClick={openCreateForm} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Type
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orderTypes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No order types defined yet. Add your first one!
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="w-20">Pin</TableHead>
                <TableHead className="w-20">Active</TableHead>
                {canManage && <TableHead className="w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>
                    <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{type.name}</p>
                      {type.name_ar && (
                        <p className="text-sm text-muted-foreground" dir="rtl">
                          {type.name_ar}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {type.category ? (
                      <Badge variant="outline">{type.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => togglePin(type)}
                        className={type.pin_as_tab ? "text-gold" : "text-muted-foreground"}
                      >
                        {type.pin_as_tab ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                      </Button>
                    ) : (
                      type.pin_as_tab ? <Pin className="w-4 h-4 text-gold" /> : null
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <Switch
                        checked={type.is_active}
                        onCheckedChange={() => toggleActive(type)}
                      />
                    ) : (
                      <Badge variant={type.is_active ? "default" : "secondary"}>
                        {type.is_active ? "Active" : "Inactive"}
                      </Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(type)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(type.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Order Type" : "Add Order Type"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name (English)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Veterinary Checkup"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameAr">Name (Arabic)</Label>
              <Input
                id="nameAr"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="e.g., فحص بيطري"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., veterinary, training, grooming"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pinAsTab">Pin as Tab</Label>
              <Switch
                id="pinAsTab"
                checked={pinAsTab}
                onCheckedChange={setPinAsTab}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>
              {editingType ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order Type?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Orders using this type will remain but the type reference will be broken.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Manage Order Types</SheetTitle>
          </SheetHeader>
          <div className="mt-4">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Order Types</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
