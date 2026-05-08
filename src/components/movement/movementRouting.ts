import type { HorseMovement } from "@/hooks/movement/useHorseMovements";

/**
 * A "local arrival" is an incoming movement that lands inside this tenant
 * (not a connected partner) and represents an arrival or return — eligible
 * for the single-tap Confirm Arrival flow (dispatch → complete).
 */
export function isLocalArrival(m: Pick<HorseMovement, 'movement_type' | 'movement_subtype' | 'destination_type'>): boolean {
  if (m.movement_type !== 'in') return false;
  if (m.destination_type === 'connected') return false;
  return (
    m.movement_subtype === 'arrival' ||
    m.movement_subtype === 'return_from_temporary_out' ||
    m.movement_subtype === 'unspecified'
  );
}

export function isLocalArrivalActionable(m: HorseMovement): boolean {
  return (
    isLocalArrival(m) &&
    (m.movement_status === 'scheduled' || m.movement_status === 'dispatched')
  );
}

/**
 * An "internal transfer" is a transfer movement whose destination is another
 * internal branch/location of the same tenant. Eligible for the single-tap
 * Confirm Internal Transfer flow (dispatch → complete) without requiring a
 * destination unit at confirmation time.
 */
export function isInternalTransfer(m: Pick<HorseMovement, 'movement_type' | 'movement_subtype' | 'destination_type'>): boolean {
  if (m.movement_type !== 'transfer') return false;
  if (m.destination_type === 'connected') return false;
  return (
    m.movement_subtype === 'internal_transfer' ||
    m.movement_subtype === 'unspecified'
  );
}

export function isInternalTransferActionable(m: HorseMovement): boolean {
  return (
    isInternalTransfer(m) &&
    (m.movement_status === 'scheduled' || m.movement_status === 'dispatched')
  );
}
