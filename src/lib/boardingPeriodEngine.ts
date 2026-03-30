import { getDaysInMonth, startOfMonth, endOfMonth, addMonths, differenceInDays, format } from 'date-fns';

/**
 * A single decomposed billing segment within a boarding stay.
 * Each segment represents a contiguous date range within one calendar month.
 */
export interface BoardingBillingSegment {
  /** First charged day (inclusive), ISO date string */
  periodStart: string;
  /** Last charged day (inclusive), ISO date string */
  periodEnd: string;
  /** Number of charged days in this segment */
  chargedDays: number;
  /** Total days in the calendar month this segment belongs to */
  monthDays: number;
  /** Daily rate for this segment = monthlyRate / monthDays */
  dailyRate: number;
  /** Segment amount = dailyRate × chargedDays */
  amount: number;
  /** The monthly rate used for this segment (for traceability / Phase 3 multi-rate) */
  monthlyRate: number;
  /** Whether this segment covers a full calendar month */
  isFullMonth: boolean;
}

/**
 * Decomposes a boarding stay date range into calendar-month-based billing segments.
 *
 * Logic:
 * 1. Split the range [billingStart, billingEnd] at calendar month boundaries.
 * 2. For each resulting segment, compute the charge using the actual number of days
 *    in that calendar month:
 *      dailyRate = monthlyRate / daysInMonth
 *      amount    = dailyRate × chargedDays
 * 3. A full calendar month always equals exactly monthlyRate.
 *
 * The `monthlyRate` parameter is accepted per call. The architecture intentionally
 * keeps this as a pure-function input so that Phase 3 (rate transitions) can feed
 * different rates per segment externally.
 *
 * @param billingStart - Start of billing period (inclusive), ISO date string or Date
 * @param billingEnd   - End of billing period (inclusive), ISO date string or Date
 * @param monthlyRate  - Monthly rate to use for all segments in this call
 * @returns Ordered array of billing segments
 */
export function decomposeStay(
  billingStart: string | Date,
  billingEnd: string | Date,
  monthlyRate: number,
): BoardingBillingSegment[] {
  const start = typeof billingStart === 'string' ? new Date(billingStart) : billingStart;
  const end = typeof billingEnd === 'string' ? new Date(billingEnd) : billingEnd;

  // Guard: invalid range
  if (end < start || monthlyRate <= 0) return [];

  const segments: BoardingBillingSegment[] = [];
  let cursor = new Date(start);

  while (cursor <= end) {
    const monthEnd = endOfMonth(cursor);
    const segStart = new Date(cursor);
    // Segment ends at the earlier of: end-of-month or billing end
    const segEnd = monthEnd <= end ? monthEnd : new Date(end);

    const monthDays = getDaysInMonth(cursor);
    const chargedDays = differenceInDays(segEnd, segStart) + 1;

    // Full-month check: segment covers the entire calendar month
    // Compare by date only (ignoring time) since endOfMonth returns 23:59:59.999
    const monthStart = startOfMonth(cursor);
    const isFullMonth =
      format(segStart, 'yyyy-MM-dd') === format(monthStart, 'yyyy-MM-dd') &&
      chargedDays === monthDays;

    // For a full month, amount = exactly monthlyRate (avoids floating-point drift)
    const dailyRate = monthlyRate / monthDays;
    const amount = isFullMonth
      ? monthlyRate
      : Math.round(dailyRate * chargedDays * 100) / 100;

    segments.push({
      periodStart: format(segStart, 'yyyy-MM-dd'),
      periodEnd: format(segEnd, 'yyyy-MM-dd'),
      chargedDays,
      monthDays,
      dailyRate: Math.round(dailyRate * 10000) / 10000, // 4 decimal precision
      amount,
      monthlyRate,
      isFullMonth,
    });

    // Advance cursor to first day of the next month
    cursor = addMonths(startOfMonth(cursor), 1);
  }

  return segments;
}

/**
 * Sum the total amount across all segments.
 */
export function sumSegments(segments: BoardingBillingSegment[]): number {
  return Math.round(segments.reduce((sum, s) => sum + s.amount, 0) * 100) / 100;
}

/**
 * Compute the total accrued boarding cost using the decomposition engine.
 * Replaces the old flat-/30 logic from boardingUtils.
 */
export function computeAccruedCostDecomposed(
  admittedAt: string,
  checkedOutAt: string | null | undefined,
  dailyRate: number | null,
  monthlyRate: number | null,
  billingCycle?: string,
): number {
  const start = new Date(admittedAt);
  const end = checkedOutAt ? new Date(checkedOutAt) : new Date();

  if (end < start) return 0;

  // Daily billing cycle: simple days × daily rate
  if (billingCycle === 'daily' && dailyRate) {
    const days = differenceInDays(end, start);
    return days > 0 ? dailyRate * days : 0;
  }

  // Monthly billing: use the decomposition engine
  if (monthlyRate && monthlyRate > 0) {
    const segments = decomposeStay(admittedAt, checkedOutAt || format(new Date(), 'yyyy-MM-dd'), monthlyRate);
    return sumSegments(segments);
  }

  // Fallback to daily rate if no monthly rate
  if (dailyRate) {
    const days = differenceInDays(end, start);
    return days > 0 ? dailyRate * days : 0;
  }

  return 0;
}
