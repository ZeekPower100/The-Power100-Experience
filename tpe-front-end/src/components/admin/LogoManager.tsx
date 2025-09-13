'use client';

import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Upload, Link, Trash2, Image as ImageIcon, X, CheckCircle } from 'lucide-react';
import { Progress } from '../ui/progress';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

interface LogoManagerProps {
  currentLogoUrl?: string | null;
  onLogoChange?: (logoUrl: string | null) => void;
  // Legacy props for backward compatibility
  logoUrl?: string | null;
  onChange?: (logoUrl: string | null) => void;
  label?: string;
  uploadLabel?: string;
  removeLabel?: string;
  previewSize?: string;
  entityType?: string;
  entityName?: string;
}

export default function LogoManager({ 
  currentLogoUrl,
  onLogoChange,
  logoUrl: legacyLogoUrl,
  onChange: legacyOnChange,
  label = "Company Logo",
  uploadLabel = "Add Logo",
  removeLabel = "Remove Logo",
  previewSize = "w-32 h-32",
  entityType = "company",
  entityName = "partner"
}: LogoManagerProps) {
  // Use new props if available, otherwise fall back to legacy props
  const logoUrl = currentLogoUrl !== undefined ? currentLogoUrl : legacyLogoUrl;
  const onChange = onLogoChange || legacyOnChange || (() => {});
  const [inputMode, setInputMode] = useState<'url' | 'upload' | null>(null);
  const [tempUrl, setTempUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = () => {
    if (tempUrl.trim()) {
      onChange(tempUrl.trim());
      setTempUrl('');
      setInputMode(null);
      setPreviewError(false);
    }
  };

  const handleRemoveLogo = () => {
    onChange(null);
    setPreviewError(false);
  };

  const handleImageError = () => {
    setPreviewError(true);
  };

  const handleImageLoad = () => {
    setPreviewError(false);
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, SVG, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    const formData = new FormData();
    formData.append('logo', file);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get auth token (optional - upload works without it for public forms)
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl;
      
      // Build headers object conditionally
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${baseUrl}/api/upload/logo`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await handleApiResponse(response);
      
      // Use the uploaded URL
      const uploadedUrl = data.data.url.startsWith('http') 
        ? data.data.url 
        : `${baseUrl}${data.data.url}`;
      
      onChange(uploadedUrl);
      setInputMode(null);
      setPreviewImage(null);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload logo. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
      setPreviewImage(null);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{label}</h3>
        {!logoUrl && !inputMode && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInputMode('url')}
              className="flex items-center gap-2"
            >
              <Link className="w-4 h-4" />
              Add from URL
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInputMode('upload')}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>
        )}
      </div>

      {/* Logo Display */}
      {logoUrl && !inputMode && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className={`${previewSize} bg-gray-50 rounded-lg border-2 border-gray-200 flex items-center justify-center overflow-hidden`}>
              {!previewError ? (
                <img
                  src={logoUrl}
                  alt={`${entityType} ${entityName}`}
                  className="w-full h-full object-contain"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                />
              ) : (
                <div className="text-center text-gray-400 p-2">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs">Failed to load image</p>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">Current {label} URL:</p>
              <p className="text-sm font-mono bg-gray-50 p-2 rounded break-all">{logoUrl}</p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInputMode('url')}
                  className="flex items-center gap-1"
                >
                  <Link className="w-3 h-3" />
                  Change URL
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                  {removeLabel}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* URL Input Mode */}
      {inputMode === 'url' && (
        <Card className="p-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Logo URL
              </label>
              <input
                type="url"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-power100-red focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a direct URL to your {entityType === 'book' ? 'book cover' : entityType === 'event' ? 'event logo' : entityType === 'podcast' ? 'podcast logo' : 'company logo'} (PNG, JPG, or SVG)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUrlSubmit}
                disabled={!tempUrl.trim()}
                className="bg-power100-green hover:bg-green-600 text-white"
              >
                {uploadLabel}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setInputMode(null);
                  setTempUrl('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Upload Mode */}
      {inputMode === 'upload' && (
        <Card className="p-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-power100-green bg-green-50' : 'border-gray-300'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {isUploading ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto">
                  <CheckCircle className="w-full h-full text-power100-green animate-pulse" />
                </div>
                <p className="text-sm font-medium">Uploading logo...</p>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
              </div>
            ) : previewImage ? (
              <div className="space-y-4">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="w-32 h-32 object-contain mx-auto rounded-lg"
                />
                <p className="text-sm text-gray-600">Processing upload...</p>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {isDragging ? 'Drop your logo here!' : 'Drag and drop your logo'}
                </p>
                <p className="text-sm text-gray-500 mb-4">or</p>
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-power100-green hover:bg-green-600 text-white"
                >
                  Choose File
                </Button>
                <p className="text-xs text-gray-400 mt-4">
                  Supported formats: JPG, PNG, SVG, WebP (Max 5MB)
                </p>
              </>
            )}
          </div>
          
          {!isUploading && (
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setInputMode(null);
                  setPreviewImage(null);
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Empty State */}
      {!logoUrl && !inputMode && (
        <Card className="p-8 text-center border-2 border-dashed border-gray-300">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">No {entityType === 'book' ? 'book cover' : 'logo'} added yet</p>
          <p className="text-sm text-gray-400">Add a {entityType === 'book' ? 'cover image' : 'logo'} to display on your {entityType === 'partner' ? 'partner profile' : entityType === 'book' ? 'book' : entityType === 'event' ? 'event' : 'podcast'}</p>
        </Card>
      )}
    </div>
  );
}