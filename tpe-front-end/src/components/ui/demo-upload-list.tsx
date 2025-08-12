"use client";

import React, { useState } from 'react';
import { Plus, X, Upload, Link2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface DemoItem {
  id: string;
  title: string;
  description: string;
  type: 'upload' | 'link';
  file?: File;
  url?: string;
  fileName?: string;
}

interface DemoUploadListProps {
  items: DemoItem[];
  onChange: (items: DemoItem[]) => void;
  className?: string;
  disabled?: boolean;
  maxItems?: number;
}

export const DemoUploadList: React.FC<DemoUploadListProps> = ({
  items = [],
  onChange,
  className = "",
  disabled = false,
  maxItems = 5
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [addType, setAddType] = useState<'upload' | 'link'>('link');
  const [newItem, setNewItem] = useState<Omit<DemoItem, 'id'>>({
    title: '',
    description: '',
    type: 'link',
    url: ''
  });

  const handleAddItem = () => {
    if (newItem.title.trim() && 
        ((newItem.type === 'link' && newItem.url?.trim()) || 
         (newItem.type === 'upload' && newItem.file))) {
      const id = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      onChange([...items, { ...newItem, id } as DemoItem]);
      setNewItem({ title: '', description: '', type: 'link', url: '' });
      setIsAdding(false);
    }
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

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateItem = (index: number, updates: Partial<DemoItem>) => {
    const updated = items.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    );
    onChange(updated);
  };

  const handleFileUpload = (file: File, isNewItem: boolean = false, index?: number) => {
    if (isNewItem) {
      setNewItem(prev => ({ 
        ...prev, 
        type: 'upload', 
        file, 
        fileName: file.name,
        url: undefined 
      }));
    } else if (index !== undefined) {
      handleUpdateItem(index, { 
        type: 'upload', 
        file, 
        fileName: file.name, 
        url: undefined 
      });
    }
  };

  const canAddMore = items.length < maxItems;

  const renderDemoPreview = (item: DemoItem) => {
    if (item.type === 'upload' && item.fileName) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          <span>File: {item.fileName}</span>
        </div>
      );
    } else if (item.type === 'link' && item.url) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link2 className="h-4 w-4" />
          <a href={item.url} target="_blank" rel="noopener noreferrer" 
             className="hover:underline max-w-xs truncate">
            {item.url}
          </a>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Existing demos */}
      {items.map((item, index) => (
        <Card key={item.id} className="relative">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-power100-red" />
                <h4 className="font-semibold text-lg">Demo #{index + 1}</h4>
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
            
            <div className="space-y-4">
              <div>
                <Label htmlFor={`demo-title-${index}`}>Demo Title *</Label>
                <Input
                  id={`demo-title-${index}`}
                  value={item.title}
                  onChange={(e) => handleUpdateItem(index, { title: e.target.value })}
                  onKeyPress={handleEditKeyPress}
                  onKeyDown={handleEditKeyPress}
                  placeholder="Kitchen Remodel Demo"
                  disabled={disabled}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor={`demo-description-${index}`}>Description</Label>
                <Textarea
                  id={`demo-description-${index}`}
                  value={item.description}
                  onChange={(e) => handleUpdateItem(index, { description: e.target.value })}
                  onKeyPress={handleEditKeyPress}
                  onKeyDown={handleEditKeyPress}
                  placeholder="Describe what this demo showcases and the results achieved..."
                  disabled={disabled}
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Demo Source */}
              <div>
                <Label>Demo Source</Label>
                <div className="mt-2 space-y-2">
                  {renderDemoPreview(item)}
                  
                  {!disabled && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={item.url || ''}
                          onChange={(e) => handleUpdateItem(index, { type: 'link', url: e.target.value, file: undefined, fileName: undefined })}
                          onKeyPress={handleEditKeyPress}
                          onKeyDown={handleEditKeyPress}
                          placeholder="https://youtube.com/watch?v=..."
                          className="text-sm"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground self-center">OR</div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, false, index);
                          }}
                          className="hidden"
                        />
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-1" />
                            Upload
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add new demo form */}
      {isAdding && !disabled && canAddMore && (
        <Card className="border-dashed border-2">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-power100-red" />
                <h4 className="font-semibold text-lg">New Demo</h4>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewItem({ title: '', description: '', type: 'link', url: '' });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-demo-title">Demo Title *</Label>
                <Input
                  id="new-demo-title"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                  onKeyPress={handleKeyPress}
                  onKeyDown={handleKeyPress}
                  placeholder="Kitchen Remodel Demo"
                  className="mt-1"
                  autoFocus
                />
              </div>
              
              <div>
                <Label htmlFor="new-demo-description">Description</Label>
                <Textarea
                  id="new-demo-description"
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  onKeyPress={handleKeyPress}
                  onKeyDown={handleKeyPress}
                  placeholder="Describe what this demo showcases and the results achieved..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* Demo Source */}
              <div>
                <Label>Demo Source</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={newItem.url || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, type: 'link', url: e.target.value, file: undefined, fileName: undefined }))}
                        onKeyPress={handleKeyPress}
                        onKeyDown={handleKeyPress}
                        placeholder="https://youtube.com/watch?v=..."
                        className="text-sm"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground self-center">OR</div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, true);
                        }}
                        className="hidden"
                      />
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </span>
                      </Button>
                    </label>
                  </div>
                  
                  {newItem.type === 'upload' && newItem.fileName && (
                    <div className="flex items-center gap-2 text-sm text-power100-green">
                      <Upload className="h-4 w-4" />
                      <span>File ready: {newItem.fileName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                onClick={handleAddItem}
                disabled={!newItem.title.trim() || (!newItem.url?.trim() && !newItem.file)}
                size="sm"
              >
                Add Demo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewItem({ title: '', description: '', type: 'link', url: '' });
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
          {items.length === 0 ? 'Add Client Demo' : `Add Demo (${items.length}/${maxItems})`}
        </Button>
      )}

      {!canAddMore && (
        <div className="text-center py-2 text-sm text-muted-foreground">
          Maximum {maxItems} demos reached
        </div>
      )}

      {items.length === 0 && !isAdding && disabled && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No demos added yet
        </div>
      )}
    </div>
  );
};