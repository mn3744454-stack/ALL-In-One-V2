/**
 * useNotificationDeepLink — Phase 2 corrective pass.
 *
 * Generic, reusable open-on-arrival handler for notification deep-links.
 * Replaces the ad-hoc `useEffect + searchParams.get(...)` blocks that each
 * destination list (movements, admissions, lab requests, partners) had
 * grown independently.
 *
 * Behavior contract:
 *   1. Watches a single URL param (e.g. `movementId`) and the loaded list.
 *   2. While the list is still loading, waits silently — never fires false
 *      "not found" toasts during initial fetch.
 *   3. Once the list resolves:
 *        - if the entity is present → invokes `onFound(entity)` and strips
 *          all related deep-link params from the URL.
 *        - if the entity is absent → shows a localized toast explaining the
 *          target is no longer in this view, then strips the params so
 *          back-navigation doesn't re-trigger the miss.
 *   4. Each `(paramId, value)` pair is handled exactly once per arrival —
 *      `useRef` guards against React StrictMode double-invocation and
 *      avoids a toast loop if the underlying list refetches.
 *
 * This fixes the silent-miss issue called out in the Phase 2 audit without
 * adding a heavyweight routing layer or changing the Phase 1 interaction
 * model.
 */

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

interface Options<T> {
  /** Query-string key carrying the entity id (e.g. "movementId"). */
  paramKey: string;
  /** Whether the source list is still fetching. */
  isLoading: boolean;
  /** The resolved list of entities to search within. */
  items: T[];
  /** Pluck the id off an entity. */
  getId: (item: T) => string;
  /** Called when the target entity is present in the list. */
  onFound: (item: T) => void;
  /**
   * Extra param keys to strip alongside `paramKey` once the deep-link is
   * consumed (e.g. "entityType", "entityId", "open"). Defaults to the
   * generic Phase-1 trio.
   */
  extraParamsToClear?: string[];
}

const DEFAULT_EXTRAS = ["entityType", "entityId", "open"];

export function useNotificationDeepLink<T>({
  paramKey,
  isLoading,
  items,
  getId,
  onFound,
  extraParamsToClear = DEFAULT_EXTRAS,
}: Options<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useI18n();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const targetId = searchParams.get(paramKey);
    if (!targetId) {
      // Reset guard if the URL no longer carries the param so a future
      // arrival of the same id will be re-evaluated.
      handledRef.current = null;
      return;
    }
    if (isLoading) return;
    // De-dupe: ignore a value we've already handled (StrictMode / refetches).
    const cacheKey = `${paramKey}:${targetId}`;
    if (handledRef.current === cacheKey) return;

    const found = items.find((item) => getId(item) === targetId);
    if (found) {
      onFound(found);
    } else {
      // Surfaced miss instead of silently swallowing the deep-link.
      toast.info(t("notifications.notFound"));
    }

    handledRef.current = cacheKey;
    const next = new URLSearchParams(searchParams);
    next.delete(paramKey);
    for (const k of extraParamsToClear) next.delete(k);
    setSearchParams(next, { replace: true });
  }, [
    searchParams,
    isLoading,
    items,
    paramKey,
    getId,
    onFound,
    extraParamsToClear,
    setSearchParams,
    t,
  ]);
}
