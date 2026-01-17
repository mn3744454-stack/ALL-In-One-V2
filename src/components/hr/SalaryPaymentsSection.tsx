import { useState } from 'react';
import { useI18n } from '@/i18n';
import { useSalaryPayments } from '@/hooks/hr/useSalaryPayments';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DollarSign, Plus, Calendar, FileText, Link } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SalaryPaymentsSectionProps {
  employeeId: string;
  employeeName: string;
  isInternal: boolean;
}

export function SalaryPaymentsSection({ 
  employeeId, 
  employeeName,
  isInternal 
}: SalaryPaymentsSectionProps) {
  const { t, dir } = useI18n();
  const { activeTenant } = useTenant();
  const { payments, isLoading, createPayment, isCreating } = useSalaryPayments();
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Filter payments for this employee
  const employeePayments = payments.filter(p => p.employee_id === employeeId);

  // Check if user can add payments (owner/manager)
  const canManage = activeTenant?.role === 'owner' || activeTenant?.role === 'manager';

  const [formData, setFormData] = useState({
    amount: '',
    currency: 'SAR',
    paid_at: new Date().toISOString().split('T')[0],
    payment_period: '',
    notes: '',
    create_expense: true,
  });

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) return;

    await createPayment({
      employee_id: employeeId,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      paid_at: formData.paid_at,
      payment_period: formData.payment_period || undefined,
      notes: formData.notes || undefined,
      create_expense: formData.create_expense,
    });

    setShowAddDialog(false);
    setFormData({
      amount: '',
      currency: 'SAR',
      paid_at: new Date().toISOString().split('T')[0],
      payment_period: '',
      notes: '',
      create_expense: true,
    });
  };

  // Only show for internal employees
  if (!isInternal) {
    return null;
  }

  return (
    <>
      <Card className="mt-4">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              {t('hr.salaryPayments')}
            </div>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddDialog(true)}
                className="h-7 gap-1"
              >
                <Plus className="h-3 w-3" />
                {t('hr.addPayment')}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t('common.loading')}
            </div>
          ) : employeePayments.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t('hr.noPayments')}
            </div>
          ) : (
            <div className="space-y-2">
              {employeePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {payment.amount.toLocaleString()} {payment.currency}
                      </span>
                      {payment.payment_period && (
                        <Badge variant="outline" className="text-xs">
                          {payment.payment_period}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(payment.paid_at), 'PPP')}
                      {payment.finance_expense_id && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5">
                          <Link className="h-2.5 w-2.5" />
                          {t('hr.linkedToExpense')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {t('hr.addPayment')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Amount */}
            <div className="grid gap-2">
              <Label>{t('hr.amount')}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="flex-1"
                  dir="ltr"
                />
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label>{t('hr.paidAt')}</Label>
              <Input
                type="date"
                value={formData.paid_at}
                onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
                dir="ltr"
              />
            </div>

            {/* Payment Period */}
            <div className="grid gap-2">
              <Label>{t('hr.paymentPeriod')}</Label>
              <Input
                value={formData.payment_period}
                onChange={(e) => setFormData({ ...formData, payment_period: e.target.value })}
                placeholder={t('hr.paymentPeriodPlaceholder')}
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label>{t('hr.notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('hr.notesPlaceholder')}
                rows={2}
              />
            </div>

            {/* Create Expense Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label>{t('hr.createExpenseRecord')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('hr.createExpenseDesc')}
                </p>
              </div>
              <Switch
                checked={formData.create_expense}
                onCheckedChange={(checked) => setFormData({ ...formData, create_expense: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.amount || parseFloat(formData.amount) <= 0 || isCreating}
            >
              {isCreating ? t('common.loading') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
