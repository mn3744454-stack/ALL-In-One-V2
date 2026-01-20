import { Helmet } from 'react-helmet-async';
import { useState, useMemo } from 'react';
import { useI18n } from '@/i18n';
import { useTenant } from '@/contexts/TenantContext';
import { useSalaryPayments, SalaryPayment } from '@/hooks/hr/useSalaryPayments';
import { useEmployees } from '@/hooks/hr';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { MobilePageHeader } from '@/components/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import { 
  Plus, 
  Wallet, 
  Calendar, 
  FileText,
  TrendingUp,
  Search,
  Loader2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PayrollFilters {
  employeeId: string;
  period: string;
  search: string;
}

interface PaymentFormData {
  employee_id: string;
  amount: string;
  currency: string;
  payment_period: string;
  notes: string;
  create_expense: boolean;
}

const initialFormData: PaymentFormData = {
  employee_id: '',
  amount: '',
  currency: 'SAR',
  payment_period: '',
  notes: '',
  create_expense: false,
};

export default function DashboardHRPayroll() {
  const { t, dir, lang } = useI18n();
  const { activeRole } = useTenant();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>(initialFormData);
  const [filters, setFilters] = useState<PayrollFilters>({
    employeeId: '',
    period: '',
    search: '',
  });
  
  const { payments, isLoading, createPayment, isCreating } = useSalaryPayments();
  const { employees } = useEmployees();
  
  const canManage = activeRole === 'owner' || activeRole === 'manager';
  const dateLocale: Locale = lang === 'ar' ? arLocale : enUS;
  
  // Internal employees for salary payments
  const internalEmployees = useMemo(() => 
    employees.filter(e => e.employment_kind === 'internal' && e.is_active),
    [employees]
  );

  // Get unique periods from payments
  const periods = useMemo(() => {
    const uniquePeriods = new Set<string>();
    payments.forEach(p => {
      if (p.payment_period) uniquePeriods.add(p.payment_period);
    });
    return Array.from(uniquePeriods).sort().reverse();
  }, [payments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      if (filters.employeeId && payment.employee_id !== filters.employeeId) return false;
      if (filters.period && payment.payment_period !== filters.period) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const employeeName = payment.employee?.full_name?.toLowerCase() || '';
        if (!employeeName.includes(searchLower)) return false;
      }
      return true;
    });
  }, [payments, filters]);

  // Calculate totals
  const totals = useMemo(() => {
    const sum = filteredPayments.reduce((acc, p) => acc + p.amount, 0);
    return {
      total: sum,
      count: filteredPayments.length,
    };
  }, [filteredPayments]);

  const formatCurrency = (amount: number, currency: string = 'SAR') => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!formData.employee_id || !formData.amount) return;
    
    await createPayment({
      employee_id: formData.employee_id,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      payment_period: formData.payment_period || undefined,
      notes: formData.notes || undefined,
      create_expense: formData.create_expense,
    });
    
    setFormData(initialFormData);
    setShowAddDialog(false);
  };

  return (
    <>
      <Helmet>
        <title>{t('hr.payroll.title')} | Khail</title>
      </Helmet>

      <div className="min-h-screen bg-background flex" dir={dir}>
        <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <MobilePageHeader 
            title={t('hr.payroll.title')} 
            backTo="/dashboard/hr"
          />

          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between p-6 border-b border-border bg-card">
            <div>
              <h1 className="text-xl font-semibold">{t('hr.payroll.title')}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t('hr.payroll.description')}
              </p>
            </div>
            {canManage && (
              <Button
                onClick={() => setShowAddDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('hr.payroll.addPayment')}
              </Button>
            )}
          </header>

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('hr.payroll.totalPaid')}</p>
                      <p className="text-lg font-semibold">{formatCurrency(totals.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <FileText className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('hr.payroll.paymentsCount')}</p>
                      <p className="text-lg font-semibold">{totals.count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2 lg:col-span-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <TrendingUp className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('hr.payroll.averagePerEmployee')}</p>
                      <p className="text-lg font-semibold">
                        {employees.length > 0 
                          ? formatCurrency(totals.total / employees.filter(e => e.is_active && e.employment_kind === 'internal').length || 0)
                          : formatCurrency(0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('hr.payroll.searchEmployee')}
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="ps-10"
                    />
                  </div>
                  
                  <Select
                    value={filters.employeeId}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, employeeId: value === 'all' ? '' : value }))}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder={t('hr.payroll.filterByEmployee')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      {employees.filter(e => e.employment_kind === 'internal').map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.period}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, period: value === 'all' ? '' : value }))}
                  >
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder={t('hr.payroll.filterByPeriod')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all')}</SelectItem>
                      {periods.map((period) => (
                        <SelectItem key={period} value={period}>
                          {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Payments List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('hr.payroll.recentPayments')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    ))}
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('hr.payroll.noPayments')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPayments.map((payment) => (
                      <PaymentRow 
                        key={payment.id} 
                        payment={payment} 
                        formatCurrency={formatCurrency}
                        dateLocale={dateLocale}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mobile FAB */}
            {canManage && (
              <Button
                onClick={() => setShowAddDialog(true)}
                className="lg:hidden fixed bottom-20 end-4 h-14 w-14 rounded-full shadow-lg z-50"
                size="icon"
              >
                <Plus className="h-6 w-6" />
              </Button>
            )}
          </div>
        </main>
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('hr.payroll.addPayment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('hr.employees.name')} *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, employee_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('hr.payroll.selectEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  {internalEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('finance.expenses.amount')} *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('finance.common.currency')}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
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

            <div className="space-y-2">
              <Label>{t('hr.payroll.period')}</Label>
              <Input
                value={formData.payment_period}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_period: e.target.value }))}
                placeholder={t('hr.payroll.periodPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('common.notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('common.notesPlaceholder')}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <Label className="font-medium">{t('hr.payroll.createExpense')}</Label>
                <p className="text-xs text-muted-foreground">{t('hr.payroll.createExpenseDesc')}</p>
              </div>
              <Switch
                checked={formData.create_expense}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, create_expense: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.employee_id || !formData.amount || isCreating}
            >
              {isCreating && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PaymentRowProps {
  payment: SalaryPayment;
  formatCurrency: (amount: number, currency?: string) => string;
  dateLocale: Locale;
  t: (key: string) => string;
}

function PaymentRow({ payment, formatCurrency, dateLocale, t }: PaymentRowProps) {
  const initials = payment.employee?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      {/* Avatar */}
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {payment.employee?.full_name || t('common.unknown')}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(payment.paid_at), 'PPP', { locale: dateLocale })}</span>
          {payment.payment_period && (
            <>
              <span>•</span>
              <span>{payment.payment_period}</span>
            </>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-end">
        <p className="font-semibold text-success">
          {formatCurrency(payment.amount, payment.currency)}
        </p>
        {payment.finance_expense_id && (
          <Badge variant="outline" className="text-xs">
            {t('hr.payroll.linkedToExpense')}
          </Badge>
        )}
      </div>
    </div>
  );
}
