-- Phase 5.2 — Migration 1 (foundation only)
-- Adds enum value 'partial' to lab_request_decision and creates the
-- request-level recompute function. Also extends submission recompute to
-- recognize partial children. NO triggers attached, NO view changes — those
-- happen in Migration 2 after backfill.

-- 1. Extend enum (must commit alone before any function references the value)
ALTER TYPE public.lab_request_decision ADD VALUE IF NOT EXISTS 'partial';
