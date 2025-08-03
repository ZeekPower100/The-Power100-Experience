"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectWithEntryProps {
  value: string[];
  onChange: (values: string[]) => void;
  options?: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const MultiSelectWithEntry: React.FC<MultiSelectWithEntryProps> = ({
  value = [],
  onChange,
  options = [],
  placeholder = "Select or enter values...",
  className = "",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Filter options based on input and exclude already selected values
    const filtered = options.filter(option => 
      option.label.toLowerCase().includes(newValue.toLowerCase()) &&
      !value.includes(option.value)
    );
    setFilteredOptions(filtered);
  }, [newValue, options, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setNewValue("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (optionValue: string) => {
    if (!value.includes(optionValue)) {
      onChange([...value, optionValue]);
    }
    setNewValue("");
    inputRef.current?.focus();
  };

  const handleAddCustomValue = () => {
    const trimmedValue = newValue.trim();
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue]);
      setNewValue("");
    }
  };

  const handleRemoveValue = (valueToRemove: string) => {
    onChange(value.filter(v => v !== valueToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && newValue) {
        // If there's an exact match, use it; otherwise add as custom
        const exactMatch = filteredOptions.find(opt => 
          opt.label.toLowerCase() === newValue.toLowerCase()
        );
        if (exactMatch) {
          handleSelectOption(exactMatch.value);
        } else {
          handleAddCustomValue();
        }
      } else if (newValue) {
        handleAddCustomValue();
      }
    } else if (e.key === 'Backspace' && !newValue && value.length > 0) {
      // Remove last selected value when backspacing with empty input
      handleRemoveValue(value[value.length - 1]);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        className={`min-h-[2.5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-text ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${isOpen ? 'ring-2 ring-ring ring-offset-2' : ''}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <div className="flex flex-wrap gap-1 items-center">
          {value.map((val) => {
            const option = options.find(opt => opt.value === val);
            const displayLabel = option?.label || val;
            return (
              <Badge
                key={val}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                <span className="text-xs">{displayLabel}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveValue(val);
                    }}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
          
          <div className="flex-1 flex items-center min-w-[120px]">
            <input
              ref={inputRef}
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              placeholder={value.length === 0 ? placeholder : ""}
              disabled={disabled}
              className="outline-none bg-transparent flex-1 text-sm placeholder:text-muted-foreground"
            />
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-auto">
          {filteredOptions.length > 0 && (
            <div className="p-1">
              <div className="text-xs text-muted-foreground px-2 py-1 font-medium">Suggested options:</div>
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelectOption(option.value)}
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          
          {newValue.trim() && (
            <div className="p-1 border-t">
              <button
                type="button"
                onClick={handleAddCustomValue}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm flex items-center gap-2"
              >
                <Plus className="h-3 w-3" />
                Add &quot;{newValue.trim()}&quot;
              </button>
            </div>
          )}
          
          {filteredOptions.length === 0 && !newValue.trim() && (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              Type to add custom values...
            </div>
          )}
        </div>
      )}
    </div>
  );
};