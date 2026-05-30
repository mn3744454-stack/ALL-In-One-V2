import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Truck } from "lucide-react";
import { useI18n } from "@/i18n";
import { BilingualName } from "@/components/ui/BilingualName";
import { useSuppliers, type Supplier, type CreateSupplierData } from "@/hooks/inventory";

const EMPTY: CreateSupplierData = {
  name: "",
  name_ar: "",
  contact_name: "",
  phone: "",
  email: "",
  tax_number: "",
  notes: "",
};

function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier?: Supplier | null;
}) {
  const { t } = useI18n();
  const { createSupplier, updateSupplier, isCreating, isUpdating } = useSuppliers();
  const [form, setForm] = useState<CreateSupplierData>(EMPTY);

  useEffect(() => {
    if (open) {
      setForm(
        supplier
          ? {
              name: supplier.name,
              name_ar: supplier.name_ar ?? "",
              contact_name: supplier.contact_name ?? "",
              phone: supplier.phone ?? "",
              email: supplier.email ?? "",
              tax_number: supplier.tax_number ?? "",
              notes: supplier.notes ?? "",
            }
          : EMPTY,
      );
    }
  }, [open, supplier]);

  const save = async () => {
    if (supplier) await updateSupplier({ id: supplier.id, ...form });
    else await createSupplier(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {supplier ? t("inventory.suppliers.editTitle") : t("inventory.suppliers.addTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("inventory.fields.name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.fields.nameAr")}</Label>
              <Input
                dir="rtl"
                value={form.name_ar ?? ""}
                onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("inventory.suppliers.contactName")}</Label>
              <Input
                value={form.contact_name ?? ""}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.suppliers.phone")}</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("inventory.suppliers.email")}</Label>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("inventory.suppliers.taxNumber")}</Label>
              <Input
                value={form.tax_number ?? ""}
                onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={save} disabled={!form.name.trim() || isCreating || isUpdating}>
            {supplier ? t("common.save") : t("common.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SuppliersList() {
  const { t } = useI18n();
  const { suppliers, isLoading, canManage } = useSuppliers();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 me-1" />
            {t("inventory.suppliers.add")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t("common.loading")}</p>
      ) : suppliers.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Truck className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>{t("inventory.suppliers.empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("inventory.fields.name")}</TableHead>
                  <TableHead>{t("inventory.suppliers.contactName")}</TableHead>
                  <TableHead>{t("inventory.suppliers.phone")}</TableHead>
                  <TableHead className="text-end">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <BilingualName name={s.name} nameAr={s.name_ar} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.contact_name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.phone || "—"}</TableCell>
                    <TableCell className="text-end">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(s);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <SupplierFormDialog open={open} onOpenChange={setOpen} supplier={editing} />
    </div>
  );
}
