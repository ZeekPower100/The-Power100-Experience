"use client";

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SimpleDynamicListProps {
  items: string[];
  onChange?: (items: string[]) => void;
  onItemsChange?: (items: string[]) => void;  // Support both prop names
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  addButtonText?: string;
  buttonText?: string;  // Support both prop names
}

export const SimpleDynamicList: React.FC<SimpleDynamicListProps> = ({
  items = [],
  onChange,
  onItemsChange,  // Support both prop names
  placeholder = "Enter item...",
  className = "",
  disabled = false,
  addButtonText,
  buttonText  // Support both prop names
}) => {
  // Use whichever callback is provided
  const handleChange = onChange || onItemsChange || (() => {});
  // Use whichever button text is provided
  const buttonLabel = addButtonText || buttonText || "Add Item";
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      handleChange([...items, newItem.trim()]);
      setNewItem('');
      setIsAdding(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    handleChange(updated);
  };

  const handleUpdateItem = (index: number, value: string) => {
    const updated = items.map((item, i) => 
      i === index ? value : item
    );
    handleChange(updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Existing items */}
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => handleUpdateItem(index, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1"
          />
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveItem(index)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      {/* Add new item form */}
      {isAdding && !disabled && (
        <div className="flex items-center gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="flex-1"
            autoFocus
          />
          <Button
            type="button"
            onClick={handleAddItem}
            disabled={!newItem.trim()}
            size="sm"
            className="px-3"
          >
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setIsAdding(false);
              setNewItem('');
            }}
            size="sm"
            className="px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Add new button */}
      {!isAdding && !disabled && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full border-dashed border-2 h-10 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          {items.length === 0 ? buttonLabel : `Add Another`}
        </Button>
      )}

      {items.length === 0 && !isAdding && disabled && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No items added yet
        </div>
      )}
    </div>
  );
};