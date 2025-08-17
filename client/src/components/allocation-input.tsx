import React, { useState, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationError {
  type: 'min' | 'max' | 'invalid' | 'capacity';
  message: string;
}

interface AllocationInputProps {
  value: number;
  onChange: (value: string, oldValue: number) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  cellKey: string;
  isFocused?: boolean;
  isSaving?: boolean;
  isSaved?: boolean;
  hasPendingChanges?: boolean;
  isOverCapacity?: boolean;
  capacityWarning?: string;
  fullscreen?: boolean;
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  // Validation props
  validateOnBlur?: boolean;
  customValidation?: (value: number) => ValidationError | null;
  showValidationErrors?: boolean;
}

export function AllocationInput({
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
  isOverCapacity = false,
  capacityWarning,
  fullscreen = false,
  readOnly = false,
  min = 0,
  max = 40,
  step = 0.5,
  className = "",
  validateOnBlur = true,
  customValidation,
  showValidationErrors = true
}: AllocationInputProps) {
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
      return { type: 'max', message: `Value cannot exceed ${max}` };
    }

    return null;
  }, [min, max, customValidation]);

  // Handle input change with validation
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear validation error while typing
    if (validationError) {
      setValidationError(null);
    }

    // Only validate and call onChange if the value is complete or empty
    if (newValue === '' || !isNaN(parseFloat(newValue))) {
      const numValue = newValue === '' ? 0 : parseFloat(newValue);
      onChange(newValue, value);
    }
  }, [onChange, value, validationError]);

  // Handle blur with validation
  const handleBlur = useCallback(() => {
    if (validateOnBlur) {
      const numValue = inputValue === '' ? 0 : parseFloat(inputValue);
      const error = validateValue(numValue);
      setValidationError(error);

      // If there's an error, revert to the original value
      if (error) {
        setInputValue(value?.toString() || '');
      } else {
        // Ensure the value is properly formatted
        const formattedValue = numValue.toString();
        setInputValue(formattedValue);
        onChange(formattedValue, value);
      }
    }

    onBlur?.();
  }, [validateOnBlur, inputValue, validateValue, value, onChange, onBlur]);

  // Handle stepper button clicks with consistent 0.5 hour increments
  const handleIncrement = useCallback(() => {
    // Get current value from input field to ensure we have the latest value
    const currentValue = parseFloat(inputValue) || 0;

    // Calculate new value with precise 0.5 increment
    const incrementedValue = currentValue + 0.5;
    const newValue = Math.min(max, Math.round(incrementedValue * 10) / 10);

    // Update input field immediately for visual feedback
    const newValueStr = newValue.toString();
    setInputValue(newValueStr);

    // Validate the new value
    const error = validateValue(newValue);
    if (!error) {
      // Call onChange with the new value
      onChange(newValueStr, currentValue);
      setValidationError(null);
    } else {
      setValidationError(error);
    }
  }, [inputValue, max, onChange, validateValue]);

  const handleDecrement = useCallback(() => {
    // Get current value from input field to ensure we have the latest value
    const currentValue = parseFloat(inputValue) || 0;

    // Calculate new value with precise 0.5 decrement
    const decrementedValue = currentValue - 0.5;
    const newValue = Math.max(min, Math.round(decrementedValue * 10) / 10);

    // Update input field immediately for visual feedback
    const newValueStr = newValue.toString();
    setInputValue(newValueStr);

    // Validate the new value
    const error = validateValue(newValue);
    if (!error) {
      // Call onChange with the new value
      onChange(newValueStr, currentValue);
      setValidationError(null);
    } else {
      setValidationError(error);
    }
  }, [inputValue, min, onChange, validateValue]);

  // Enhanced keyboard navigation with multiple increment options
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle increment/decrement with Ctrl/Cmd modifier (original behavior)
    if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
      return;
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
      return;
    }

    // Handle increment/decrement with Alt modifier for quick access
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
      // Trigger blur to save current value
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
      return 'ring-2 ring-blue-500 shadow-lg scale-105 bg-white';
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

    if (value > 0) {
      return 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 text-blue-900';
    }

    return 'bg-white hover:bg-gray-50';
  }, [validationError, showValidationErrors, isFocused, isSaving, isSaved, hasPendingChanges, value]);

  const getOverCapacityClasses = useCallback(() => {
    if (isOverCapacity && value > 0) {
      return 'border-red-400 bg-gradient-to-br from-red-50 to-red-100 text-red-900';
    }
    return '';
  }, [isOverCapacity, value]);

  if (readOnly) {
    return (
      <div
        className={`${fullscreen ? "w-20" : "w-16"} h-9 text-center text-sm font-medium flex items-center justify-center rounded border transition-all duration-200 ${
          value > 0
            ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 text-blue-900'
            : 'bg-white border-gray-200'
        } ${getOverCapacityClasses()}`}
      >
        {value > 0 ? `${value}h` : '—'}
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="relative">
        <Input
          ref={inputRef}
          data-cell={cellKey}
          type="number"
          step={0.5}
          min={min}
          max={max}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onBlur={handleBlur}
          className={cn(
            // Base styling
            fullscreen ? "w-20" : "w-16",
            "h-9 text-center text-sm font-medium",
            "border border-gray-200 rounded-md bg-white",
            "pr-5", // Add right padding for chevron buttons

            // Hide native number input spinners
            "[&::-webkit-outer-spin-button]:appearance-none",
            "[&::-webkit-inner-spin-button]:appearance-none",
            "[-moz-appearance:textfield]",

            // Transitions and interactions
            "transition-all duration-200 ease-in-out",
            "hover:border-gray-300 hover:shadow-sm",
            "focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50",
            "focus:outline-none",

            // State-specific styling
            getStateClasses(),
            getOverCapacityClasses(),

            // Custom classes
            className
          )}
          placeholder="0"
          aria-invalid={validationError ? 'true' : 'false'}
          aria-describedby={validationError ? `${cellKey}-error` : `${cellKey}-help`}
          aria-label={`Allocation hours for ${cellKey}. Current value: ${inputValue} hours. Use Ctrl+Up/Down or Alt+Up/Down to increment by 0.5 hours.`}
          title={`Allocation: ${inputValue}h. Keyboard shortcuts: Ctrl/Alt + ↑/↓ to adjust by 0.5h, Enter to save, Escape to cancel`}
        />
        
        {/* State-of-the-Art Stepper Buttons */}
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
              // Enabled state
              parseFloat(inputValue) < max && [
                "hover:bg-gradient-to-b hover:from-blue-50 hover:to-blue-100",
                "active:bg-gradient-to-b active:from-blue-100 active:to-blue-200",
                "active:scale-95",
                "cursor-pointer"
              ],
              // Disabled state
              parseFloat(inputValue) >= max && [
                "opacity-20 cursor-not-allowed"
              ]
            )}
            title={parseFloat(inputValue) < max ?
              `Increase by 0.5 hours (${inputValue} → ${Math.min(max, Math.round((parseFloat(inputValue) + 0.5) * 10) / 10)})` :
              "Maximum value reached"
            }
            aria-label="Increase allocation by 0.5 hours"
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
              // Enabled state
              parseFloat(inputValue) > min && [
                "hover:bg-gradient-to-b hover:from-blue-50 hover:to-blue-100",
                "active:bg-gradient-to-b active:from-blue-100 active:to-blue-200",
                "active:scale-95",
                "cursor-pointer"
              ],
              // Disabled state
              parseFloat(inputValue) <= min && [
                "opacity-20 cursor-not-allowed"
              ]
            )}
            title={parseFloat(inputValue) > min ?
              `Decrease by 0.5 hours (${inputValue} → ${Math.max(min, Math.round((parseFloat(inputValue) - 0.5) * 10) / 10)})` :
              "Minimum value reached"
            }
            aria-label="Decrease allocation by 0.5 hours"
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

      {/* Hidden help text for screen readers */}
      <div id={`${cellKey}-help`} className="sr-only">
        Allocation input field. Use Ctrl+Up/Down or Alt+Up/Down arrows to increment by 0.5 hours.
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
            <div className="absolute -top-1 -left-1 h-3 w-3 bg-yellow-500 rounded-full animate-pulse" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Saving...</p>
          </TooltipContent>
        </Tooltip>
      )}

      {!validationError && isSaved && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute -top-1 -left-1 h-3 w-3 bg-green-500 rounded-full" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Saved</p>
          </TooltipContent>
        </Tooltip>
      )}

      {!validationError && hasPendingChanges && !isSaving && !isSaved && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute -top-1 -left-1 h-3 w-3 bg-orange-500 rounded-full" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Unsaved changes</p>
          </TooltipContent>
        </Tooltip>
      )}


    </div>
  );
}
