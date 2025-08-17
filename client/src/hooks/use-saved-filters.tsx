import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

export interface ResourceFilter {
  id: string;
  name: string;
  searchTerm: string;
  departmentFilter: string;
  roleFilter: string;
  statusFilter: string;
  capacityFilter: string;
  skillFilter: string;
  createdAt: string;
}

const SAVED_FILTERS_KEY = 'resourceflow-saved-filters';
const LAST_FILTER_KEY = 'resourceflow-last-filter';

export function useSavedFilters() {
  const [savedFilters, setSavedFilters] = useState<ResourceFilter[]>([]);
  const [currentFilter, setCurrentFilter] = useState<Partial<ResourceFilter>>({
    searchTerm: '',
    departmentFilter: 'all',
    roleFilter: 'all',
    statusFilter: 'all',
    capacityFilter: 'all',
    skillFilter: '',
  });

  // Use debounced search term for performance (200ms delay)
  const debouncedSearchTerm = useDebounce(currentFilter.searchTerm || '', 200);

  // Create a filter object with debounced search term for actual filtering
  const effectiveFilter = useMemo(() => {
    const filter = {
      ...currentFilter,
      searchTerm: debouncedSearchTerm,
    };

    return filter;
  }, [currentFilter, debouncedSearchTerm]);

  // Load saved filters from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_FILTERS_KEY);
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }

      // Load last used filter
      const lastFilter = localStorage.getItem(LAST_FILTER_KEY);
      if (lastFilter) {
        setCurrentFilter(JSON.parse(lastFilter));
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
  }, []);

  // Save current filter to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LAST_FILTER_KEY, JSON.stringify(currentFilter));
    } catch (error) {
      console.error('Failed to save current filter:', error);
    }
  }, [currentFilter]);

  const saveFilter = useCallback((name: string) => {
    const newFilter: ResourceFilter = {
      id: Date.now().toString(),
      name,
      searchTerm: currentFilter.searchTerm || '',
      departmentFilter: currentFilter.departmentFilter || 'all',
      roleFilter: currentFilter.roleFilter || 'all',
      statusFilter: currentFilter.statusFilter || 'all',
      capacityFilter: currentFilter.capacityFilter || 'all',
      skillFilter: currentFilter.skillFilter || 'all',
      createdAt: new Date().toISOString(),
    };

    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);
    
    try {
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters));
    } catch (error) {
      console.error('Failed to save filter:', error);
    }

    return newFilter;
  }, [currentFilter, savedFilters]);

  const loadFilter = useCallback((filter: ResourceFilter) => {
    setCurrentFilter({
      searchTerm: filter.searchTerm,
      departmentFilter: filter.departmentFilter,
      roleFilter: filter.roleFilter,
      statusFilter: filter.statusFilter,
      capacityFilter: filter.capacityFilter,
      skillFilter: filter.skillFilter,
    });
  }, []);

  const deleteFilter = useCallback((filterId: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updatedFilters);
    
    try {
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updatedFilters));
    } catch (error) {
      console.error('Failed to delete filter:', error);
    }
  }, [savedFilters]);

  const clearAllFilters = useCallback(() => {
    setCurrentFilter({
      searchTerm: '',
      departmentFilter: 'all',
      roleFilter: 'all',
      statusFilter: 'all',
      capacityFilter: 'all',
      skillFilter: '',
    });
  }, []);

  const updateFilter = useCallback((updates: Partial<ResourceFilter>) => {
    setCurrentFilter(prev => ({ ...prev, ...updates }));
  }, []);

  const hasActiveFilters = useCallback(() => {
    return (
      (currentFilter.searchTerm && currentFilter.searchTerm.trim() !== '') ||
      currentFilter.departmentFilter !== 'all' ||
      currentFilter.roleFilter !== 'all' ||
      currentFilter.statusFilter !== 'all' ||
      currentFilter.capacityFilter !== 'all' ||
      (currentFilter.skillFilter !== '' && currentFilter.skillFilter !== 'all')
    );
  }, [currentFilter]);

  const refreshSavedFilters = useCallback(() => {
    try {
      const saved = localStorage.getItem(SAVED_FILTERS_KEY);
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to refresh saved filters:', error);
    }
  }, []);

  return {
    savedFilters,
    currentFilter,
    effectiveFilter, // Filter with debounced search term for actual filtering
    saveFilter,
    loadFilter,
    deleteFilter,
    clearAllFilters,
    updateFilter,
    hasActiveFilters,
    refreshSavedFilters,
  };
}
