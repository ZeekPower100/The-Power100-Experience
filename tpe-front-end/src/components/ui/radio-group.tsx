'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

interface RadioGroupItemProps {
  value: string;
  id?: string;
  className?: string;
  children?: React.ReactNode;
}

const RadioGroupContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: '',
  onValueChange: () => {},
});

const RadioGroup: React.FC<RadioGroupProps> = ({ 
  value = '', 
  onValueChange = () => {}, 
  className, 
  children 
}) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className={cn("grid gap-2", className)} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
};

const RadioGroupItem: React.FC<RadioGroupItemProps> = ({ 
  value, 
  id, 
  className, 
  children 
}) => {
  const { value: selectedValue, onValueChange } = React.useContext(RadioGroupContext);
  const isSelected = selectedValue === value;

  return (
    <div className="flex items-center space-x-2">
      <button
        id={id}
        type="button"
        role="radio"
        aria-checked={isSelected}
        onClick={() => onValueChange(value)}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-gray-300 text-white shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-50",
          isSelected && "bg-red-600 border-red-600",
          className
        )}
      >
        {isSelected && (
          <div className="h-2 w-2 rounded-full bg-white mx-auto" />
        )}
      </button>
      {children}
    </div>
  );
};

export { RadioGroup, RadioGroupItem };