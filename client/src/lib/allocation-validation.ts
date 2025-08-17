export interface ValidationError {
  type: 'min' | 'max' | 'invalid' | 'capacity' | 'decimal' | 'negative';
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationOptions {
  min?: number;
  max?: number;
  allowDecimals?: boolean;
  decimalPlaces?: number;
  weeklyCapacity?: number;
  currentWeekTotal?: number;
  resourceName?: string;
}

/**
 * Validates allocation hour values with comprehensive checks
 */
export function validateAllocationHours(
  value: number | string,
  options: ValidationOptions = {}
): ValidationError | null {
  const {
    min = 0,
    max = 40,
    allowDecimals = true,
    decimalPlaces = 1,
    weeklyCapacity,
    currentWeekTotal,
    resourceName
  } = options;

  // Convert to number if string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Check for invalid number
  if (isNaN(numValue)) {
    return {
      type: 'invalid',
      message: 'Please enter a valid number',
      severity: 'error'
    };
  }

  // Check for negative values
  if (numValue < 0) {
    return {
      type: 'negative',
      message: 'Hours cannot be negative',
      severity: 'error'
    };
  }

  // Check minimum value
  if (numValue < min) {
    return {
      type: 'min',
      message: `Value must be at least ${min}`,
      severity: 'error'
    };
  }

  // Check maximum value
  if (numValue > max) {
    return {
      type: 'max',
      message: `Value cannot exceed ${max} hours`,
      severity: 'error'
    };
  }

  // Check decimal places if decimals are not allowed or exceed limit
  if (!allowDecimals && numValue % 1 !== 0) {
    return {
      type: 'decimal',
      message: 'Only whole numbers are allowed',
      severity: 'error'
    };
  }

  if (allowDecimals && decimalPlaces !== undefined) {
    const decimalPart = numValue.toString().split('.')[1];
    if (decimalPart && decimalPart.length > decimalPlaces) {
      return {
        type: 'decimal',
        message: `Maximum ${decimalPlaces} decimal place${decimalPlaces === 1 ? '' : 's'} allowed`,
        severity: 'error'
      };
    }
  }

  // Check weekly capacity if provided
  if (weeklyCapacity !== undefined && currentWeekTotal !== undefined) {
    const projectedTotal = currentWeekTotal + numValue;
    if (projectedTotal > weeklyCapacity) {
      const resourceText = resourceName ? ` for ${resourceName}` : '';
      const overAmount = projectedTotal - weeklyCapacity;
      return {
        type: 'capacity',
        message: `This would exceed weekly capacity${resourceText} by ${overAmount.toFixed(1)}h (${projectedTotal.toFixed(1)}h / ${weeklyCapacity}h)`,
        severity: 'warning'
      };
    }
  }

  return null;
}

/**
 * Validates a batch of allocation changes
 */
export function validateAllocationBatch(
  changes: Array<{ value: number; options: ValidationOptions }>,
  globalOptions: ValidationOptions = {}
): Array<ValidationError | null> {
  return changes.map(({ value, options }) => 
    validateAllocationHours(value, { ...globalOptions, ...options })
  );
}

/**
 * Formats allocation hours for display
 */
export function formatAllocationHours(
  value: number,
  options: { showUnit?: boolean; decimalPlaces?: number } = {}
): string {
  const { showUnit = true, decimalPlaces = 1 } = options;
  
  if (value === 0) {
    return showUnit ? '0h' : '0';
  }
  
  const formatted = value.toFixed(decimalPlaces).replace(/\.?0+$/, '');
  return showUnit ? `${formatted}h` : formatted;
}

/**
 * Parses allocation hours from user input
 */
export function parseAllocationHours(input: string): number {
  // Remove 'h' suffix if present
  const cleaned = input.replace(/h$/i, '').trim();
  
  // Handle empty input
  if (cleaned === '') {
    return 0;
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Checks if a value is within acceptable range for allocation
 */
export function isValidAllocationRange(value: number, min = 0, max = 40): boolean {
  return !isNaN(value) && value >= min && value <= max;
}

/**
 * Gets capacity utilization percentage
 */
export function getCapacityUtilization(
  allocated: number,
  capacity: number
): { percentage: number; status: 'low' | 'normal' | 'high' | 'over' } {
  if (capacity <= 0) {
    return { percentage: 0, status: 'low' };
  }
  
  const percentage = (allocated / capacity) * 100;
  
  let status: 'low' | 'normal' | 'high' | 'over';
  if (percentage > 100) {
    status = 'over';
  } else if (percentage > 80) {
    status = 'high';
  } else if (percentage > 50) {
    status = 'normal';
  } else {
    status = 'low';
  }
  
  return { percentage, status };
}

/**
 * Suggests optimal allocation based on capacity and existing allocations
 */
export function suggestOptimalAllocation(
  weeklyCapacity: number,
  currentAllocations: number[],
  targetWeeks: number
): number {
  const totalAllocated = currentAllocations.reduce((sum, hours) => sum + hours, 0);
  const remainingCapacity = Math.max(0, weeklyCapacity - totalAllocated);
  
  if (targetWeeks <= 0) {
    return 0;
  }
  
  return Math.min(remainingCapacity / targetWeeks, weeklyCapacity * 0.8); // Max 80% of weekly capacity per allocation
}
