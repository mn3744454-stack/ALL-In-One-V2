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
