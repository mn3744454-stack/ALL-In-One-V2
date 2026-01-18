import { useState, useCallback, useEffect } from 'react';
import type { ViewMode, GridColumns } from '@/components/ui/ViewSwitcher';

interface ViewPreference {
  viewMode: ViewMode;
  gridColumns: GridColumns;
}

const DEFAULT_PREFERENCE: ViewPreference = {
  viewMode: 'grid',
  gridColumns: 3,
};

function getStorageKey(pageKey: string): string {
  return `khail_view_pref_${pageKey}`;
}

function loadPreference(pageKey: string): ViewPreference {
  try {
    const stored = localStorage.getItem(getStorageKey(pageKey));
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        viewMode: parsed.viewMode || DEFAULT_PREFERENCE.viewMode,
        gridColumns: parsed.gridColumns || DEFAULT_PREFERENCE.gridColumns,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PREFERENCE;
}

function savePreference(pageKey: string, preference: ViewPreference): void {
  try {
    localStorage.setItem(getStorageKey(pageKey), JSON.stringify(preference));
  } catch {
    // Ignore storage errors
  }
}

export function useViewPreference(pageKey: string) {
  const [preference, setPreference] = useState<ViewPreference>(() => 
    loadPreference(pageKey)
  );

  // Sync on mount in case localStorage changed
  useEffect(() => {
    setPreference(loadPreference(pageKey));
  }, [pageKey]);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    setPreference((prev) => {
      const newPref = { ...prev, viewMode };
      savePreference(pageKey, newPref);
      return newPref;
    });
  }, [pageKey]);

  const setGridColumns = useCallback((gridColumns: GridColumns) => {
    setPreference((prev) => {
      const newPref = { ...prev, gridColumns };
      savePreference(pageKey, newPref);
      return newPref;
    });
  }, [pageKey]);

  return {
    viewMode: preference.viewMode,
    gridColumns: preference.gridColumns,
    setViewMode,
    setGridColumns,
  };
}
