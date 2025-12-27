import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

export interface CustomFinancialCategory {
  id: string;
  tenant_id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  category_type: 'income' | 'expense';
  parent_id: string | null;
  account_code: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomCategoryData {
  name: string;
  name_ar?: string;
  description?: string;
  category_type: 'income' | 'expense';
  parent_id?: string | null;
  account_code?: string;
}

export function useCustomFinancialCategories() {
  const { activeTenant } = useTenant();
  const [categories, setCategories] = useState<CustomFinancialCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!activeTenant?.tenant?.id) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('custom_financial_categories')
        .select('*')
        .eq('tenant_id', activeTenant.tenant.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setCategories((data as CustomFinancialCategory[]) || []);
    } catch (error) {
      console.error('Error fetching custom categories:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTenant]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (categoryData: CreateCustomCategoryData) => {
    if (!activeTenant?.tenant?.id) return null;

    try {
      const { data, error } = await supabase
        .from('custom_financial_categories')
        .insert({
          ...categoryData,
          tenant_id: activeTenant.tenant.id,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchCategories();
      return data;
    } catch (error) {
      console.error('Error creating custom category:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, updates: Partial<CreateCustomCategoryData>) => {
    try {
      const { error } = await supabase
        .from('custom_financial_categories')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchCategories();
    } catch (error) {
      console.error('Error updating custom category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_financial_categories')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      await fetchCategories();
    } catch (error) {
      console.error('Error deleting custom category:', error);
      throw error;
    }
  };

  const getIncomeCategories = useCallback(() => {
    return categories.filter(c => c.category_type === 'income');
  }, [categories]);

  const getExpenseCategories = useCallback(() => {
    return categories.filter(c => c.category_type === 'expense');
  }, [categories]);

  const getMainCategories = useCallback((type: 'income' | 'expense') => {
    return categories.filter(c => c.category_type === type && !c.parent_id);
  }, [categories]);

  const getSubCategories = useCallback((parentId: string) => {
    return categories.filter(c => c.parent_id === parentId);
  }, [categories]);

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    getIncomeCategories,
    getExpenseCategories,
    getMainCategories,
    getSubCategories,
    refresh: fetchCategories,
  };
}