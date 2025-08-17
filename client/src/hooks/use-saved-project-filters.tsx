import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

export interface ProjectFilter {
  id: string;
  name: string;
  searchTerm: string;
  statusFilter: string;
  typeFilter: string;
  streamFilter: string;
  priorityFilter: string;
  directorFilter: string;
  changeLeadFilter: string;
  businessLeadFilter: string;
  ogsmCharterFilter: string;
  createdAt: string;
}

const SAVED_PROJECT_FILTERS_KEY = 'resourceflow-saved-project-filters';
const LAST_PROJECT_FILTER_KEY = 'resourceflow-last-project-filter';

export function useSavedProjectFilters() {
  const [savedFilters, setSavedFilters] = useState<ProjectFilter[]>([]);
  const [currentFilter, setCurrentFilter] = useState<Partial<ProjectFilter>>({
    searchTerm: '',
    statusFilter: 'all',
    typeFilter: 'all',
    streamFilter: 'all',
    priorityFilter: 'all',
    directorFilter: 'all',
    changeLeadFilter: 'all',
    businessLeadFilter: 'all',
    ogsmCharterFilter: 'all',
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
      const saved = localStorage.getItem(SAVED_PROJECT_FILTERS_KEY);
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }

      // Load last used filter
      const lastFilter = localStorage.getItem(LAST_PROJECT_FILTER_KEY);
      if (lastFilter) {
        setCurrentFilter(JSON.parse(lastFilter));
      }
    } catch (error) {
      console.error('Failed to load saved project filters:', error);
    }
  }, []);

  // Save current filter to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(LAST_PROJECT_FILTER_KEY, JSON.stringify(currentFilter));
    } catch (error) {
      console.error('Failed to save current project filter:', error);
    }
  }, [currentFilter]);

  const saveFilter = useCallback((name: string) => {
    const newFilter: ProjectFilter = {
      id: Date.now().toString(),
      name,
      searchTerm: currentFilter.searchTerm || '',
      statusFilter: currentFilter.statusFilter || 'all',
      typeFilter: currentFilter.typeFilter || 'all',
      streamFilter: currentFilter.streamFilter || 'all',
      priorityFilter: currentFilter.priorityFilter || 'all',
      directorFilter: currentFilter.directorFilter || 'all',
      changeLeadFilter: currentFilter.changeLeadFilter || 'all',
      businessLeadFilter: currentFilter.businessLeadFilter || 'all',
      ogsmCharterFilter: currentFilter.ogsmCharterFilter || 'all',
      createdAt: new Date().toISOString(),
    };

    const updatedFilters = [...savedFilters, newFilter];
    setSavedFilters(updatedFilters);
    
    try {
      localStorage.setItem(SAVED_PROJECT_FILTERS_KEY, JSON.stringify(updatedFilters));
    } catch (error) {
      console.error('Failed to save project filter:', error);
    }

    return newFilter;
  }, [currentFilter, savedFilters]);

  const loadFilter = useCallback((filter: ProjectFilter) => {
    setCurrentFilter({
      searchTerm: filter.searchTerm,
      statusFilter: filter.statusFilter,
      typeFilter: filter.typeFilter,
      streamFilter: filter.streamFilter,
      priorityFilter: filter.priorityFilter,
      directorFilter: filter.directorFilter,
      changeLeadFilter: filter.changeLeadFilter,
      businessLeadFilter: filter.businessLeadFilter,
      ogsmCharterFilter: filter.ogsmCharterFilter,
    });
  }, []);

  const deleteFilter = useCallback((filterId: string) => {
    const updatedFilters = savedFilters.filter(f => f.id !== filterId);
    setSavedFilters(updatedFilters);
    
    try {
      localStorage.setItem(SAVED_PROJECT_FILTERS_KEY, JSON.stringify(updatedFilters));
    } catch (error) {
      console.error('Failed to delete project filter:', error);
    }
  }, [savedFilters]);

  const clearAllFilters = useCallback(() => {
    setCurrentFilter({
      searchTerm: '',
      statusFilter: 'all',
      typeFilter: 'all',
      streamFilter: 'all',
      priorityFilter: 'all',
      directorFilter: 'all',
      changeLeadFilter: 'all',
      businessLeadFilter: 'all',
      ogsmCharterFilter: 'all',
    });
  }, []);

  const updateFilter = useCallback((updates: Partial<ProjectFilter>) => {
    setCurrentFilter(prev => ({ ...prev, ...updates }));
  }, []);

  const hasActiveFilters = useCallback(() => {
    return (
      (currentFilter.searchTerm && currentFilter.searchTerm.trim() !== '') ||
      currentFilter.statusFilter !== 'all' ||
      currentFilter.typeFilter !== 'all' ||
      currentFilter.streamFilter !== 'all' ||
      currentFilter.priorityFilter !== 'all' ||
      currentFilter.directorFilter !== 'all' ||
      currentFilter.changeLeadFilter !== 'all' ||
      currentFilter.businessLeadFilter !== 'all' ||
      currentFilter.ogsmCharterFilter !== 'all'
    );
  }, [currentFilter]);

  const refreshSavedFilters = useCallback(() => {
    try {
      const saved = localStorage.getItem(SAVED_PROJECT_FILTERS_KEY);
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to refresh saved project filters:', error);
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
