"use client";

import React, { useState, useRef } from 'react';
import { Plus, X, Upload, Link2, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

export interface DemoItem {
  id: string;
  title: string;
  description: string;
  type: 'upload' | 'link';
  file?: File;
  url?: string;
  fileName?: string;
  uploadedUrl?: string;
  isUploading?: boolean;
  uploadProgress?: number;
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
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingItems, setUploadingItems] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadVideoFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('video', file);

    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      console.log('📹 Uploading video:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type,
        hasToken: !!token
      });
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl;
      const response = await fetch(`${baseUrl}/api/upload/video`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response error:', response.status, errorText);
        
        // Try to parse as JSON if possible
        try {
          const errorData = safeJsonParse(errorText);
          throw new Error(errorData.message || errorData.error || 'Upload failed');
        } catch {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
      }

      const data = await handleApiResponse(response);
      const uploadedUrl = data.data.url.startsWith('http') 
        ? data.data.url 
        : `${baseUrl}${data.data.url}`;
      
      console.log('✅ Upload successful:', uploadedUrl);
      return uploadedUrl;
    } catch (error) {
      console.error('❌ Video upload error:', error);
      alert(`Failed to upload video: ${error.message || 'Unknown error'}`);
      return null;
    }
  };

  const handleFileUpload = async (file: File, isNewItem: boolean = false, index?: number) => {
    // Validate file type - more permissive list
    const validTypes = [
      'video/mp4', 
      'video/mpeg', 
      'video/quicktime', 
      'video/webm',
      'video/x-msvideo',  // AVI
      'video/x-ms-wmv',   // WMV
      'video/x-flv',      // FLV
      'video/3gpp',       // 3GP
      'video/ogg'         // OGG
    ];
    
    // Also check by extension if MIME type is not recognized
    const validExtensions = ['.mp4', '.mpeg', '.mpg', '.mov', '.webm', '.avi', '.wmv', '.flv', '.3gp', '.ogg', '.mkv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      console.error('Invalid file type:', file.type, 'Extension:', fileExtension);
      alert(`Invalid video file type: ${file.type || 'unknown'}. Please upload a valid video file (MP4, MOV, WebM, etc.)`);
      return;
    }

    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      alert('File size must be less than 500MB');
      return;
    }

    if (isNewItem) {
      setNewItem(prev => ({ 
        ...prev, 
        type: 'upload', 
        file, 
        fileName: file.name,
        url: undefined,
        isUploading: true
      }));

      const uploadedUrl = await uploadVideoFile(file);
      if (uploadedUrl) {
        setNewItem(prev => ({ 
          ...prev, 
          uploadedUrl,
          isUploading: false
        }));
      } else {
        setNewItem(prev => ({ 
          ...prev, 
          isUploading: false,
          file: undefined,
          fileName: undefined
        }));
      }
    } else if (index !== undefined) {
      const itemId = items[index].id;
      setUploadingItems(prev => new Set(prev).add(itemId));
      
      handleUpdateItem(index, { 
        type: 'upload', 
        file, 
        fileName: file.name, 
        url: undefined,
        isUploading: true
      });

      const uploadedUrl = await uploadVideoFile(file);
      setUploadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });

      if (uploadedUrl) {
        handleUpdateItem(index, { 
          uploadedUrl,
          isUploading: false
        });
      } else {
        handleUpdateItem(index, { 
          isUploading: false,
          file: undefined,
          fileName: undefined
        });
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      if (isAdding) {
        await handleFileUpload(files[0], true);
      }
    }
  };

  const canAddMore = items.length < maxItems;

  const renderDemoPreview = (item: DemoItem) => {
    if (item.isUploading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading: {item.fileName}</span>
        </div>
      );
    } else if (item.type === 'upload' && (item.uploadedUrl || item.url || item.fileName)) {
      // Check if we have a URL (either uploadedUrl or url field)
      const fileUrl = item.uploadedUrl || item.url;
      
      // Try to get filename from various sources
      let fileName = item.fileName;
      if (!fileName && fileUrl) {
        // Extract filename from URL if not provided
        const urlParts = fileUrl.split('/');
        fileName = urlParts[urlParts.length - 1] || 'Uploaded file';
        // Clean up filename if it has query params
        if (fileName.includes('?')) {
          fileName = fileName.split('?')[0];
        }
      }
      fileName = fileName || 'Uploaded file';
      
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" 
               className="hover:underline max-w-xs truncate text-power100-green">
              <strong>✓</strong> {fileName}
            </a>
          ) : (
            <span>File: {fileName} (pending upload)</span>
          )}
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
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) await handleFileUpload(file, false, index);
                          }}
                          className="hidden"
                          disabled={uploadingItems.has(item.id)}
                        />
                        <Button type="button" variant="outline" size="sm" asChild disabled={uploadingItems.has(item.id)}>
                          <span>
                            {uploadingItems.has(item.id) ? (
                              <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Uploading...</>
                            ) : (
                              <><Upload className="h-4 w-4 mr-1" />Upload</>
                            )}
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
        <Card 
          className={`border-dashed border-2 ${isDragging ? 'border-power100-green bg-green-50' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
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
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await handleFileUpload(file, true);
                        }}
                        className="hidden"
                        disabled={newItem.isUploading}
                      />
                      <Button type="button" variant="outline" size="sm" asChild disabled={newItem.isUploading}>
                        <span>
                          {newItem.isUploading ? (
                            <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Uploading...</>
                          ) : (
                            <><Upload className="h-4 w-4 mr-1" />Upload</>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                  
                  {newItem.type === 'upload' && newItem.fileName && (
                    <div className="flex items-center gap-2 text-sm text-power100-green">
                      {newItem.isUploading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /><span>Uploading: {newItem.fileName}</span></>
                      ) : newItem.uploadedUrl ? (
                        <><Upload className="h-4 w-4" /><span>Uploaded: {newItem.fileName}</span></>
                      ) : (
                        <><Upload className="h-4 w-4" /><span>File ready: {newItem.fileName}</span></>
                      )}
                    </div>
                  )}
                  
                  {isDragging && (
                    <div className="mt-2 p-3 border-2 border-dashed border-power100-green bg-green-50 rounded text-center">
                      <p className="text-sm text-power100-green font-medium">Drop video file here!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                onClick={handleAddItem}
                disabled={!newItem.title.trim() || (!newItem.url?.trim() && !newItem.file && !newItem.uploadedUrl) || newItem.isUploading}
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