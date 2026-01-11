import { tGlobal } from "./I18nContext";

/**
 * Helper functions for translating status, severity, scope, and other common labels.
 * These prevent hardcoded English strings in UI components.
 */

/**
 * Translate a status value
 * @example tStatus("draft") => "Draft" / "مسودة"
 */
export function tStatus(status: string): string {
  return tGlobal(`status.${status}`);
}

/**
 * Translate a severity/priority value
 * @example tSeverity("low") => "Low" / "منخفض"
 */
export function tSeverity(severity: string): string {
  return tGlobal(`severity.${severity}`);
}

/**
 * Translate a scope/service mode value
 * @example tScope("external") => "External" / "خارجي"
 */
export function tScope(scope: string): string {
  return tGlobal(`scope.${scope}`);
}

/**
 * Translate a category value
 * @example tCategory("treatment") => "Treatment" / "علاج"
 */
export function tCategory(category: string): string {
  return tGlobal(`category.${category}`);
}

/**
 * Translate a navigation label
 * @example tNav("settings") => "Settings" / "الإعدادات"
 */
export function tNav(key: string): string {
  return tGlobal(`nav.${key}`);
}
