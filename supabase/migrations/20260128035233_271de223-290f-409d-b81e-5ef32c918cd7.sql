
-- Drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS on_order_status_change ON horse_orders;
DROP TRIGGER IF EXISTS on_order_delete ON horse_orders;
DROP TRIGGER IF EXISTS log_order_event_trigger ON horse_orders;
