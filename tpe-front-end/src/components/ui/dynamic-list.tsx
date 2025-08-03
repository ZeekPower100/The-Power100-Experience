"use client";

import React, { useState } from 'react';
import { Plus, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';

interface TestimonialItem {
  client_name: string;
  testimonial: string;
  rating?: number;
}

interface DynamicListProps {
  value: TestimonialItem[];
  onChange: (items: TestimonialItem[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const DynamicList: React.FC<DynamicListProps> = ({
  value = [],
  onChange,
  placeholder = "Add testimonials...",
  className = "",
  disabled = false
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState<TestimonialItem>({
    client_name: '',
    testimonial: '',
    rating: 5
  });

  const handleAddItem = () => {
    if (newItem.client_name.trim() && newItem.testimonial.trim()) {
      onChange([...value, { ...newItem }]);
      setNewItem({ client_name: '', testimonial: '', rating: 5 });
      setIsAdding(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateItem = (index: number, field: keyof TestimonialItem, newValue: string | number) => {
    const updated = value.map((item, i) => 
      i === index ? { ...item, [field]: newValue } : item
    );
    onChange(updated);
  };

  const renderStars = (rating: number = 0, onClick?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onClick?.(star)}
            disabled={disabled}
            className={`${onClick ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star 
              className={`h-4 w-4 ${
                star <= rating 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-gray-300'
              }`} 
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Existing testimonials */}
      {value.map((item, index) => (
        <Card key={index} className="relative">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <Input
                  value={item.client_name}
                  onChange={(e) => handleUpdateItem(index, 'client_name', e.target.value)}
                  placeholder="Client name"
                  disabled={disabled}
                  className="font-medium mb-2"
                />
                {renderStars(item.rating, (rating) => handleUpdateItem(index, 'rating', rating))}
              </div>
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
            <Textarea
              value={item.testimonial}
              onChange={(e) => handleUpdateItem(index, 'testimonial', e.target.value)}
              placeholder="Client testimonial..."
              disabled={disabled}
              rows={3}
              className="resize-none"
            />
          </CardContent>
        </Card>
      ))}

      {/* Add new testimonial form */}
      {isAdding && !disabled && (
        <Card className="border-dashed border-2">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Input
                    value={newItem.client_name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, client_name: e.target.value }))}
                    placeholder="Client name"
                    className="font-medium mb-2"
                  />
                  {renderStars(newItem.rating, (rating) => setNewItem(prev => ({ ...prev, rating })))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setNewItem({ client_name: '', testimonial: '', rating: 5 });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={newItem.testimonial}
                onChange={(e) => setNewItem(prev => ({ ...prev, testimonial: e.target.value }))}
                placeholder="Client testimonial..."
                rows={3}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!newItem.client_name.trim() || !newItem.testimonial.trim()}
                  size="sm"
                >
                  Add Testimonial
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setNewItem({ client_name: '', testimonial: '', rating: 5 });
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add new button */}
      {!isAdding && !disabled && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAdding(true)}
          className="w-full border-dashed border-2 h-12 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          {value.length === 0 ? placeholder : 'Add Another Testimonial'}
        </Button>
      )}

      {value.length === 0 && !isAdding && disabled && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No testimonials added yet
        </div>
      )}
    </div>
  );
};