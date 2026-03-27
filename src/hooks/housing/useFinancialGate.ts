import { useMemo } from 'react';
import { useAdmissionFinancials } from './useAdmissionFinancials';
import { usePermissions } from '@/hooks/usePermissions';

export interface FinancialGateResult {
  /** Data is still loading */
  isLoading: boolean;
  /** No outstanding balance — proceed freely */
  canProceed: boolean;
  /** Outstanding balance exists but user has override permission */
  needsOverride: boolean;
  /** Outstanding balance exists and user has NO override permission (staff) */
  isBlocked: boolean;
  /** Admission-scoped outstanding balance */
  admissionBalance: number;
  /** Client-level ledger balance */
  clientBalance: number;
  /** Combined outstanding (max of both signals) */
  outstandingAmount: number;
  /** Whether user has the override permission */
  hasOverridePermission: boolean;
  /** Accrued boarding value not yet invoiced */
  unbilledValue: number;
  /** Whether there is significant unbilled accrual */
  hasUnbilled: boolean;
}

const OVERRIDE_PERMISSION = 'boarding.checkout.override_balance';

/**
 * Financial gate hook for checkout and dispatch flows.
 * Determines whether to allow, warn+override, or block based on
 * outstanding balances and user permissions.
 */
export function useFinancialGate(
  admissionId: string | null,
  clientId: string | null
): FinancialGateResult {
  const { data: fin, isLoading: finLoading } = useAdmissionFinancials(admissionId, clientId);
  const { hasPermission, isOwner, loading: permLoading } = usePermissions();

  return useMemo(() => {
    const isLoading = finLoading || permLoading;

    if (isLoading || !fin) {
      return {
        isLoading,
        canProceed: false,
        needsOverride: false,
        isBlocked: false,
        admissionBalance: 0,
        clientBalance: 0,
        outstandingAmount: 0,
        hasOverridePermission: false,
        unbilledValue: 0,
        hasUnbilled: false,
      };
    }

    const admissionBalance = Math.max(fin.admissionBalance, 0);
    const clientBalance = Math.max(fin.clientLedgerBalance, 0);
    const outstandingAmount = Math.max(admissionBalance, clientBalance);
    const hasOutstanding = outstandingAmount > 0;
    const hasOverridePerm = isOwner || hasPermission(OVERRIDE_PERMISSION);

    return {
      isLoading: false,
      canProceed: !hasOutstanding,
      needsOverride: hasOutstanding && hasOverridePerm,
      isBlocked: hasOutstanding && !hasOverridePerm,
      admissionBalance,
      clientBalance,
      outstandingAmount,
      hasOverridePermission: hasOverridePerm,
    };
  }, [fin, finLoading, permLoading, hasPermission, isOwner]);
}
