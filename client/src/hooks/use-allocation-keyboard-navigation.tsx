import { useCallback, useRef, useEffect } from "react";

interface NavigationCell {
  rowIndex: number;
  colIndex: number;
  cellKey: string;
}

interface UseAllocationKeyboardNavigationProps {
  totalRows: number;
  totalCols: number;
  getCellKey: (rowIndex: number, colIndex: number) => string;
  onCellFocus?: (cellKey: string) => void;
  onCellBlur?: (cellKey: string) => void;
  onSaveAll?: () => void;
  disabled?: boolean;
}

export function useAllocationKeyboardNavigation({
  totalRows,
  totalCols,
  getCellKey,
  onCellFocus,
  onCellBlur,
  onSaveAll,
  disabled = false
}: UseAllocationKeyboardNavigationProps) {
  const currentCellRef = useRef<NavigationCell | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Focus a specific cell
  const focusCell = useCallback((rowIndex: number, colIndex: number) => {
    if (disabled || rowIndex < 0 || rowIndex >= totalRows || colIndex < 0 || colIndex >= totalCols) {
      return false;
    }

    const cellKey = getCellKey(rowIndex, colIndex);
    const cellElement = document.querySelector(`[data-cell="${cellKey}"]`) as HTMLInputElement;
    
    if (cellElement) {
      // Blur current cell if different
      if (currentCellRef.current && currentCellRef.current.cellKey !== cellKey) {
        onCellBlur?.(currentCellRef.current.cellKey);
      }

      // Focus new cell
      cellElement.focus();
      cellElement.select(); // Select all text for easy replacement
      
      currentCellRef.current = { rowIndex, colIndex, cellKey };
      onCellFocus?.(cellKey);
      
      // Scroll cell into view if needed
      cellElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
      
      return true;
    }
    
    return false;
  }, [disabled, totalRows, totalCols, getCellKey, onCellFocus, onCellBlur]);

  // Navigate to adjacent cell
  const navigateToCell = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!currentCellRef.current) return false;

    const { rowIndex, colIndex } = currentCellRef.current;
    let newRow = rowIndex;
    let newCol = colIndex;

    switch (direction) {
      case 'up':
        newRow = Math.max(0, rowIndex - 1);
        break;
      case 'down':
        newRow = Math.min(totalRows - 1, rowIndex + 1);
        break;
      case 'left':
        newCol = Math.max(0, colIndex - 1);
        break;
      case 'right':
        newCol = Math.min(totalCols - 1, colIndex + 1);
        break;
    }

    return focusCell(newRow, newCol);
  }, [focusCell, totalRows, totalCols]);

  // Navigate to next cell (Tab behavior)
  const navigateToNext = useCallback(() => {
    if (!currentCellRef.current) return false;

    const { rowIndex, colIndex } = currentCellRef.current;
    let newRow = rowIndex;
    let newCol = colIndex + 1;

    // Move to next row if at end of current row
    if (newCol >= totalCols) {
      newCol = 0;
      newRow = rowIndex + 1;
    }

    // Stop if at end of table
    if (newRow >= totalRows) {
      return false;
    }

    return focusCell(newRow, newCol);
  }, [focusCell, totalRows, totalCols]);

  // Navigate to previous cell (Shift+Tab behavior)
  const navigateToPrevious = useCallback(() => {
    if (!currentCellRef.current) return false;

    const { rowIndex, colIndex } = currentCellRef.current;
    let newRow = rowIndex;
    let newCol = colIndex - 1;

    // Move to previous row if at beginning of current row
    if (newCol < 0) {
      newCol = totalCols - 1;
      newRow = rowIndex - 1;
    }

    // Stop if at beginning of table
    if (newRow < 0) {
      return false;
    }

    return focusCell(newRow, newCol);
  }, [focusCell, totalRows, totalCols]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    if (disabled) return;

    // Update current cell reference
    currentCellRef.current = { rowIndex, colIndex, cellKey: getCellKey(rowIndex, colIndex) };

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        navigateToCell('up');
        break;
      
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        navigateToCell('down');
        break;
      
      case 'ArrowLeft':
        // Only navigate if cursor is at the beginning of input
        if ((e.target as HTMLInputElement).selectionStart === 0) {
          e.preventDefault();
          navigateToCell('left');
        }
        break;
      
      case 'ArrowRight':
        // Only navigate if cursor is at the end of input
        const input = e.target as HTMLInputElement;
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          navigateToCell('right');
        }
        break;
      
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          navigateToPrevious();
        } else {
          navigateToNext();
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        (e.target as HTMLInputElement).blur();
        currentCellRef.current = null;
        break;
      
      case 's':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onSaveAll?.();
        }
        break;
    }
  }, [disabled, getCellKey, navigateToCell, navigateToNext, navigateToPrevious, onSaveAll]);

  // Find and focus first cell
  const focusFirstCell = useCallback(() => {
    return focusCell(0, 0);
  }, [focusCell]);

  // Find and focus last cell
  const focusLastCell = useCallback(() => {
    return focusCell(totalRows - 1, totalCols - 1);
  }, [focusCell, totalRows, totalCols]);

  // Get current cell position
  const getCurrentCell = useCallback(() => {
    return currentCellRef.current;
  }, []);

  // Clear current cell reference
  const clearCurrentCell = useCallback(() => {
    currentCellRef.current = null;
  }, []);

  // Set up global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      // Ctrl/Cmd + Home: Focus first cell
      if ((e.ctrlKey || e.metaKey) && e.key === 'Home') {
        e.preventDefault();
        focusFirstCell();
      }
      
      // Ctrl/Cmd + End: Focus last cell
      if ((e.ctrlKey || e.metaKey) && e.key === 'End') {
        e.preventDefault();
        focusLastCell();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [disabled, focusFirstCell, focusLastCell]);

  return {
    handleKeyDown,
    focusCell,
    navigateToCell,
    navigateToNext,
    navigateToPrevious,
    focusFirstCell,
    focusLastCell,
    getCurrentCell,
    clearCurrentCell,
    tableRef
  };
}
