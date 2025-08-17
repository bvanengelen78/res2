import React, { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronUp, ChevronDown, AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationError {
  type: 'min' | 'max' | 'invalid' | 'custom';
  message: string;
}

interface HourEntryCellProps {
  value: string | number;
  onChange: (value: string, oldValue: string | number) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  cellKey: string;
  isFocused?: boolean;
  isSaving?: boolean;
  isSaved?: boolean;
  hasPendingChanges?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  // Mobile optimization
  mobileOptimized?: boolean;
  // Validation props
  validateOnBlur?: boolean;
  customValidation?: (value: number) => ValidationError | null;
  showValidationErrors?: boolean;
  // Visual state props
  isCurrentDay?: boolean;
  showValueIndicator?: boolean;
}

export function HourEntryCell({
  value,
  onChange,
  onBlur,
  onKeyDown,
  onFocus,
  cellKey,
  isFocused = false,
  isSaving = false,
  isSaved = false,
  hasPendingChanges = false,
  disabled = false,
  min = 0,
  max = 24,
  step = 0.5,
  className = "",
  placeholder = "0.00",
  mobileOptimized = true,
  validateOnBlur = true,
  customValidation,
  showValidationErrors = true,
  isCurrentDay = false,
  showValueIndicator = true
}: HourEntryCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [inputValue, setInputValue] = useState<string>(value?.toString() || '');

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);

  // Validation function
  const validateValue = useCallback((val: number): ValidationError | null => {
    // Custom validation first
    if (customValidation) {
      const customError = customValidation(val);
      if (customError) return customError;
    }

    // Built-in validations
    if (isNaN(val)) {
      return { type: 'invalid', message: 'Please enter a valid number' };
    }

    if (val < min) {
      return { type: 'min', message: `Value must be at least ${min}` };
    }

    if (val > max) {
      return { type: 'max', message: `Value cannot exceed ${max} hours` };
    }

    return null;
  }, [min, max, customValidation]);

  // Handle input change with validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Allow empty string, numbers, and decimal points
    const isValidInput = /^[0-9]*\.?[0-9]*$/.test(newValue) || newValue === '';
    if (!isValidInput) return;
    
    setInputValue(newValue);

    // Clear validation error while typing
    if (validationError) {
      setValidationError(null);
    }

    // Call onChange with the new value
    onChange(newValue, value);
  }, [onChange, value, validationError]);

  // Handle blur with validation and formatting
  const handleBlur = useCallback(() => {
    if (validateOnBlur) {
      const numValue = inputValue === '' ? 0 : parseFloat(inputValue);
      const error = validateValue(numValue);
      setValidationError(error);

      // If there's an error, revert to the original value
      if (error) {
        setInputValue(value?.toString() || '');
      } else {
        // Format the value to 2 decimal places
        const formattedValue = numValue.toFixed(2);
        setInputValue(formattedValue);
        onChange(formattedValue, value);
      }
    }

    onBlur?.();
  }, [validateOnBlur, inputValue, validateValue, value, onChange, onBlur]);

  // Handle stepper button clicks
  const handleIncrement = useCallback(() => {
    const currentValue = parseFloat(inputValue) || 0;
    const incrementedValue = currentValue + step;
    const newValue = Math.min(max, Math.round(incrementedValue * 100) / 100);

    const newValueStr = newValue.toString();
    setInputValue(newValueStr);

    const error = validateValue(newValue);
    if (!error) {
      onChange(newValueStr, currentValue);
      setValidationError(null);
    } else {
      setValidationError(error);
    }
  }, [inputValue, max, step, onChange, validateValue]);

  const handleDecrement = useCallback(() => {
    const currentValue = parseFloat(inputValue) || 0;
    const decrementedValue = currentValue - step;
    const newValue = Math.max(min, Math.round(decrementedValue * 100) / 100);

    const newValueStr = newValue.toString();
    setInputValue(newValueStr);

    const error = validateValue(newValue);
    if (!error) {
      onChange(newValueStr, currentValue);
      setValidationError(null);
    } else {
      setValidationError(error);
    }
  }, [inputValue, min, step, onChange, validateValue]);

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle increment/decrement with Ctrl/Cmd modifier
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
      return;
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
      return;
    }

    // Handle increment/decrement with Alt modifier
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
      return;
    } else if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
      return;
    }

    // Handle Enter key to save and move to next cell
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }

    // Handle Escape key to revert changes
    if (e.key === 'Escape') {
      setInputValue(value?.toString() || '');
      setValidationError(null);
      (e.target as HTMLInputElement).blur();
    }

    onKeyDown?.(e);
  }, [handleIncrement, handleDecrement, onKeyDown, value]);

  // Determine visual state classes
  const getStateClasses = useCallback(() => {
    if (validationError && showValidationErrors) {
      return 'ring-2 ring-red-500 border-red-500 bg-gradient-to-br from-red-50 to-red-100 text-red-900';
    }

    if (isFocused) {
      return 'ring-2 ring-blue-500 border-blue-500 bg-white scale-105 shadow-lg';
    }

    if (isSaving) {
      return 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300 text-yellow-900';
    }

    if (isSaved) {
      return 'bg-gradient-to-br from-green-50 to-green-100 border-green-300 text-green-900';
    }

    if (hasPendingChanges) {
      return 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300 text-orange-900';
    }

    if (isCurrentDay && !disabled) {
      return 'bg-blue-50 border-blue-200';
    }

    if (parseFloat(inputValue) > 0) {
      return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 text-blue-900';
    }

    return 'bg-white hover:bg-gray-50';
  }, [validationError, showValidationErrors, isFocused, isSaving, isSaved, hasPendingChanges, isCurrentDay, disabled, inputValue]);

  if (disabled) {
    return (
      <div
        className={cn(
          "h-12 text-center text-sm font-medium flex items-center justify-center rounded border transition-all duration-200",
          "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200",
          mobileOptimized ? "w-20" : "w-16",
          className
        )}
      >
        {parseFloat(inputValue) > 0 ? `${parseFloat(inputValue).toFixed(2)}h` : '—'}
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="relative">
        <Input
          ref={inputRef}
          data-cell={cellKey}
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={handleBlur}
          className={cn(
            // Base styling
            mobileOptimized ? "w-20 h-12" : "w-16 h-9",
            "text-center text-sm font-medium",
            "border border-gray-200 rounded-md",
            "pr-5", // Add right padding for stepper buttons

            // Transitions and interactions
            "transition-all duration-200 ease-in-out",
            "hover:border-gray-300 hover:shadow-sm",
            "focus:outline-none",

            // State-specific styling
            getStateClasses(),

            // Custom classes
            className
          )}
          placeholder={placeholder}
          aria-invalid={validationError ? 'true' : 'false'}
          aria-describedby={validationError ? `${cellKey}-error` : `${cellKey}-help`}
          aria-label={`Time entry for ${cellKey}. Current value: ${inputValue} hours. Use Ctrl+Up/Down or Alt+Up/Down to increment by ${step} hours.`}
          title={`Time entry: ${inputValue}h. Keyboard shortcuts: Ctrl/Alt + ↑/↓ to adjust by ${step}h, Enter to save, Escape to cancel`}
        />
        
        {/* Stepper Buttons */}
        <div className="absolute inset-y-px right-px flex flex-col opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out">
          {/* Increment Button */}
          <button
            type="button"
            onClick={handleIncrement}
            onMouseDown={(e) => e.preventDefault()}
            disabled={parseFloat(inputValue) >= max}
            className={cn(
              "flex-1 w-4 flex items-center justify-center",
              "border-0 bg-transparent",
              "transition-all duration-150 ease-out",
              "focus:outline-none",
              "rounded-tr-md",
              parseFloat(inputValue) < max && [
                "hover:bg-gradient-to-b hover:from-blue-50 hover:to-blue-100",
                "active:bg-gradient-to-b active:from-blue-100 active:to-blue-200",
                "active:scale-95",
                "cursor-pointer"
              ],
              parseFloat(inputValue) >= max && [
                "opacity-20 cursor-not-allowed"
              ]
            )}
            title={parseFloat(inputValue) < max ?
              `Increase by ${step} hours` :
              "Maximum value reached"
            }
            aria-label={`Increase time entry by ${step} hours`}
          >
            <ChevronUp className={cn(
              "h-3 w-3 transition-all duration-150",
              parseFloat(inputValue) < max ?
                "text-gray-500 hover:text-blue-600 active:text-blue-700" :
                "text-gray-300"
            )} />
          </button>

          {/* Visual Separator */}
          <div className="h-px bg-gray-200 mx-0.5" />

          {/* Decrement Button */}
          <button
            type="button"
            onClick={handleDecrement}
            onMouseDown={(e) => e.preventDefault()}
            disabled={parseFloat(inputValue) <= min}
            className={cn(
              "flex-1 w-4 flex items-center justify-center",
              "border-0 bg-transparent",
              "transition-all duration-150 ease-out",
              "focus:outline-none",
              "rounded-br-md",
              parseFloat(inputValue) > min && [
                "hover:bg-gradient-to-b hover:from-blue-50 hover:to-blue-100",
                "active:bg-gradient-to-b active:from-blue-100 active:to-blue-200",
                "active:scale-95",
                "cursor-pointer"
              ],
              parseFloat(inputValue) <= min && [
                "opacity-20 cursor-not-allowed"
              ]
            )}
            title={parseFloat(inputValue) > min ?
              `Decrease by ${step} hours` :
              "Minimum value reached"
            }
            aria-label={`Decrease time entry by ${step} hours`}
          >
            <ChevronDown className={cn(
              "h-3 w-3 transition-all duration-150",
              parseFloat(inputValue) > min ?
                "text-gray-500 hover:text-blue-600 active:text-blue-700" :
                "text-gray-300"
            )} />
          </button>
        </div>
      </div>

      {/* Value indicator dot */}
      {showValueIndicator && parseFloat(inputValue) > 0 && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
      )}

      {/* Hidden help text for screen readers */}
      <div id={`${cellKey}-help`} className="sr-only">
        Time entry input field. Use Ctrl+Up/Down or Alt+Up/Down arrows to increment by {step} hours.
        Enter to save, Escape to cancel changes. Hover to see increment/decrement buttons.
      </div>

      {/* Status indicators */}
      {validationError && showValidationErrors && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle className="absolute -top-1 -left-1 h-3 w-3 text-red-500 animate-pulse" />
          </TooltipTrigger>
          <TooltipContent>
            <p id={`${cellKey}-error`}>{validationError.message}</p>
          </TooltipContent>
        </Tooltip>
      )}

      {!validationError && isSaving && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Loader2 className="absolute -top-1 -left-1 h-3 w-3 text-yellow-500 animate-spin" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Saving...</p>
          </TooltipContent>
        </Tooltip>
      )}

      {!validationError && isSaved && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Check className="absolute -top-1 -left-1 h-3 w-3 text-green-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Saved</p>
          </TooltipContent>
        </Tooltip>
      )}

      {!validationError && hasPendingChanges && !isSaving && !isSaved && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute -top-1 -left-1 h-3 w-3 bg-orange-500 rounded-full animate-pulse" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Unsaved changes</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
