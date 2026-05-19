/**
 * Admission checks computation logic — single source of truth.
 * Recomputed on creation, update, and any relevant mutation.
 */

export interface AdmissionCheckResult {
  status: 'pass' | 'warning' | 'overridable' | 'blocking';
  message: string;
  overridden_by?: string;
  overridden_at?: string;
}

export type AdmissionChecks = Record<string, AdmissionCheckResult>;

export interface EmergencyContactPhoneShape {
  number?: string | null;
  label?: string;
  is_whatsapp?: boolean;
  is_primary?: boolean;
}

export interface EmergencyContactShape {
  id?: string;
  name?: string | null;
  name_ar?: string | null;
  relationship?: string | null;
  phones?: EmergencyContactPhoneShape[];
}

export interface AdmissionCheckInput {
  horse_id?: string | null;
  branch_id?: string | null;
  client_id?: string | null;
  unit_id?: string | null;
  emergency_contact?: string | null;
  emergency_contacts?: EmergencyContactShape[] | null;
  daily_rate?: number | null;
  monthly_rate?: number | null;
  balance_cleared?: boolean;
}

function hasUsableEmergencyContact(input: AdmissionCheckInput): boolean {
  const arr = Array.isArray(input.emergency_contacts) ? input.emergency_contacts : [];
  const fromJsonb = arr.some(
    (c) =>
      Array.isArray(c?.phones) &&
      c.phones!.some(
        (p) => typeof p?.number === 'string' && (p.number as string).trim().length > 0
      )
  );
  if (fromJsonb) return true;
  // Legacy fallback for compatibility during transition.
  return !!(input.emergency_contact && input.emergency_contact.trim().length > 0);
}

export function computeAdmissionChecks(input: AdmissionCheckInput): AdmissionChecks {
  const checks: AdmissionChecks = {};

  // Blocking checks
  checks.horse_exists = input.horse_id
    ? { status: 'pass', message: 'Horse verified' }
    : { status: 'blocking', message: 'Horse is required' };

  checks.branch_selected = input.branch_id
    ? { status: 'pass', message: 'Branch selected' }
    : { status: 'blocking', message: 'Branch is required' };

  // Warning checks
  checks.client_assigned = input.client_id
    ? { status: 'pass', message: 'Client assigned' }
    : { status: 'warning', message: 'No client/payer assigned' };

  checks.housing_assigned = input.unit_id
    ? { status: 'pass', message: 'Housing unit assigned' }
    : { status: 'warning', message: 'No housing unit assigned' };

  checks.emergency_contact = hasUsableEmergencyContact(input)
    ? { status: 'pass', message: 'Emergency contact provided' }
    : { status: 'warning', message: 'No emergency contact' };

  checks.rate_configured = (input.daily_rate || input.monthly_rate)
    ? { status: 'pass', message: 'Rate configured' }
    : { status: 'warning', message: 'No rate configured' };

  return checks;
}

export function hasBlockingChecks(checks: AdmissionChecks): boolean {
  return Object.values(checks).some(c => c.status === 'blocking');
}

export function getWarningCount(checks: AdmissionChecks): number {
  return Object.values(checks).filter(c => c.status === 'warning').length;
}
