"use client";

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export interface ClientReference {
  name: string;
  email: string;
  phone: string;
  website: string;
}

interface ClientReferenceListProps {
  items: ClientReference[];
  onChange: (items: ClientReference[]) => void;
  className?: string;
  disabled?: boolean;
  maxItems?: number;
}

export const ClientReferenceList: React.FC<ClientReferenceListProps> = ({
  items = [],
  onChange,
  className = "",
  disabled = false,
  maxItems = 5
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<ClientReference>({
    name: '',
    email: '',
    phone: '',
    website: ''
  });

  const handleAddItem = () => {
    if (newItem.name.trim() && newItem.email.trim()) {
      onChange([...items, { ...newItem }]);
      setNewItem({ name: '', email: '', phone: '', website: '' });
      setIsAdding(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateItem = (index: number, field: keyof ClientReference, value: string) => {
    const updated = items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Prevent form submission
      handleAddItem();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Prevent form submission
      // Just prevent the form submission, no other action needed for editing
    }
  };

  const canAddMore = items.length < maxItems;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Existing references */}
      {items.map((item, index) => (
        <Card key={index} className="relative">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-semibold text-lg">Reference #{index + 1}</h4>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`ref-name-${index}`}>Contact Name *</Label>
                <Input
                  id={`ref-name-${index}`}
                  value={item.name}
                  onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                  onKeyPress={handleEditKeyPress}
                  onKeyDown={handleEditKeyPress}
                  placeholder="John Smith"
                  disabled={disabled}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`ref-email-${index}`}>Email *</Label>
                <Input
                  id={`ref-email-${index}`}
                  type="email"
                  value={item.email}
                  onChange={(e) => handleUpdateItem(index, 'email', e.target.value)}
                  onKeyPress={handleEditKeyPress}
                  onKeyDown={handleEditKeyPress}
                  placeholder="john@company.com"
                  disabled={disabled}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`ref-phone-${index}`}>Phone</Label>
                <Input
                  id={`ref-phone-${index}`}
                  value={item.phone}
                  onChange={(e) => handleUpdateItem(index, 'phone', e.target.value)}
                  onKeyPress={handleEditKeyPress}
                  onKeyDown={handleEditKeyPress}
                  placeholder="(555) 123-4567"
                  disabled={disabled}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`ref-website-${index}`}>Company Website</Label>
                <Input
                  id={`ref-website-${index}`}
                  value={item.website}
                  onChange={(e) => handleUpdateItem(index, 'website', e.target.value)}
                  onKeyPress={handleEditKeyPress}
                  onKeyDown={handleEditKeyPress}
                  placeholder="https://company.com"
                  disabled={disabled}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add new reference form */}
      {isAdding && !disabled && canAddMore && (
        <Card className="border-dashed border-2">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-semibold text-lg">New Reference</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewItem({ name: '', email: '', phone: '', website: '' });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-ref-name">Contact Name *</Label>
                <Input
                  id="new-ref-name"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  onKeyPress={handleKeyPress}
                  onKeyDown={handleKeyPress}
                  placeholder="John Smith"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="new-ref-email">Email *</Label>
                <Input
                  id="new-ref-email"
                  type="email"
                  value={newItem.email}
                  onChange={(e) => setNewItem(prev => ({ ...prev, email: e.target.value }))}
                  onKeyPress={handleKeyPress}
                  onKeyDown={handleKeyPress}
                  placeholder="john@company.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-ref-phone">Phone</Label>
                <Input
                  id="new-ref-phone"
                  value={newItem.phone}
                  onChange={(e) => setNewItem(prev => ({ ...prev, phone: e.target.value }))}
                  onKeyPress={handleKeyPress}
                  onKeyDown={handleKeyPress}
                  placeholder="(555) 123-4567"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-ref-website">Company Website</Label>
                <Input
                  id="new-ref-website"
                  value={newItem.website}
                  onChange={(e) => setNewItem(prev => ({ ...prev, website: e.target.value }))}
                  onKeyPress={handleKeyPress}
                  onKeyDown={handleKeyPress}
                  placeholder="https://company.com"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                onClick={handleAddItem}
                disabled={!newItem.name.trim() || !newItem.email.trim()}
                size="sm"
              >
                Add Reference
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewItem({ name: '', email: '', phone: '', website: '' });
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add new button */}
      {!isAdding && !disabled && canAddMore && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full border-dashed border-2 h-12 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          {items.length === 0 ? 'Add Client Reference' : `Add Reference (${items.length}/${maxItems})`}
        </Button>
      )}

      {!canAddMore && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Maximum {maxItems} references reached
        </div>
      )}

      {items.length === 0 && !isAdding && disabled && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No client references added yet
        </div>
      )}
    </div>
  );
};