'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Upload, Link, Trash2, Image as ImageIcon, X } from 'lucide-react';

interface LogoManagerProps {
  logoUrl: string | null;
  onChange: (logoUrl: string | null) => void;
  label?: string;
}

export default function LogoManager({ logoUrl, onChange, label = "Company Logo" }: LogoManagerProps) {
  const [inputMode, setInputMode] = useState<'url' | 'upload' | null>(null);
  const [tempUrl, setTempUrl] = useState('');
  const [previewError, setPreviewError] = useState(false);

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
              disabled
            >
              <Upload className="w-4 h-4" />
              Upload (Coming Soon)
            </Button>
          </div>
        )}
      </div>

      {/* Logo Display */}
      {logoUrl && !inputMode && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 bg-gray-50 rounded-lg border-2 border-gray-200 flex items-center justify-center overflow-hidden">
              {!previewError ? (
                <img
                  src={logoUrl}
                  alt="Company logo"
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
              <p className="text-sm text-gray-600 mb-2">Current Logo URL:</p>
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
                  Remove Logo
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
                Enter a direct URL to your company logo (PNG, JPG, or SVG)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUrlSubmit}
                disabled={!tempUrl.trim()}
                className="bg-power100-green hover:bg-green-600 text-white"
              >
                Add Logo
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

      {/* Empty State */}
      {!logoUrl && !inputMode && (
        <Card className="p-8 text-center border-2 border-dashed border-gray-300">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-3">No logo added yet</p>
          <p className="text-sm text-gray-400">Add a logo to display on your partner profile</p>
        </Card>
      )}
    </div>
  );
}