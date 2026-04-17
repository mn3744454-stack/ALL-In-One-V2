-- Phase 7 — Fix Security Definer View warning on vw_lab_result_progress
ALTER VIEW public.vw_lab_result_progress SET (security_invoker = true);