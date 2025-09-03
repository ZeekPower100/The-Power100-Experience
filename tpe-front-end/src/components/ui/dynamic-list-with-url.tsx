"use client";

import React, { useState } from 'react';
import { Plus, X, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ItemWithUrl {
  name: string;
  url?: string;
}

interface DynamicListWithUrlProps {
  items: ItemWithUrl[];
  onChange: (items: ItemWithUrl[]) => void;
  namePlaceholder?: string;
  urlPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  addButtonText?: string;
}

export const DynamicListWithUrl: React.FC<DynamicListWithUrlProps> = ({
  items = [],
  onChange,
  namePlaceholder = "Enter name...",
  urlPlaceholder = "Enter URL (optional)...",
  className = "",
  disabled = false,
  addButtonText = "Add Item"
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<ItemWithUrl>({ name: '', url: '' });

  const handleAddItem = () => {
    if (newItem.name.trim()) {
      onChange([...items, { 
        name: newItem.name.trim(), 
        url: newItem.url?.trim() || undefined 
      }]);
      setNewItem({ name: '', url: '' });
      setIsAdding(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateItem = (index: number, field: 'name' | 'url', value: string) => {
    const updated = items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      if (newItem.name.trim()) {
        handleAddItem();
      }
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Existing items */}
      {items.map((item, index) => (
        <div key={index} className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Input
              value={item.name}
              onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
              placeholder={namePlaceholder}
              disabled={disabled}
              className="flex-1 bg-white"
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
          <div className="flex items-center gap-2 pl-1">
            <Link className="h-4 w-4 text-gray-400" />
            <Input
              value={item.url || ''}
              onChange={(e) => handleUpdateItem(index, 'url', e.target.value)}
              placeholder={urlPlaceholder}
              disabled={disabled}
              className="flex-1 bg-white"
            />
          </div>
        </div>
      ))}

      {/* Add new item form */}
      {isAdding && !disabled && (
        <div className="space-y-2 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
          <div className="flex items-center gap-2">
            <Input
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder={namePlaceholder}
              className="flex-1 bg-white"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 pl-1">
            <Link className="h-4 w-4 text-gray-400" />
            <Input
              value={newItem.url || ''}
              onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder={urlPlaceholder}
              className="flex-1 bg-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={handleAddItem}
              disabled={!newItem.name.trim()}
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
                setNewItem({ name: '', url: '' });
              }}
              size="sm"
              className="px-2"
            >
              Cancel
            </Button>
          </div>
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
          {items.length === 0 ? addButtonText : `Add Another`}
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