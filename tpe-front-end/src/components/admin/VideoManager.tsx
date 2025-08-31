'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus, X, GripVertical, PlayCircle, Upload } from 'lucide-react';

interface Video {
  url: string;
  title: string;
  duration: string;
  thumbnail: string | null;
  order?: number;
}

interface VideoManagerProps {
  videos: Video[];
  onChange: (videos: Video[]) => void;
  label?: string;
}

export default function VideoManager({ videos = [], onChange, label = "Landing Page Videos" }: VideoManagerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addVideo = () => {
    const newVideo: Video = {
      url: '',
      title: '',
      duration: '',
      thumbnail: null,
      order: videos.length + 1
    };
    onChange([...videos, newVideo]);
  };

  const updateVideo = (index: number, field: keyof Video, value: string) => {
    const updatedVideos = [...videos];
    updatedVideos[index] = {
      ...updatedVideos[index],
      [field]: value || null
    };
    onChange(updatedVideos);
  };

  const removeVideo = (index: number) => {
    const updatedVideos = videos.filter((_, i) => i !== index);
    // Update order numbers
    updatedVideos.forEach((video, i) => {
      video.order = i + 1;
    });
    onChange(updatedVideos);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const draggedVideo = videos[draggedIndex];
    const newVideos = [...videos];
    
    // Remove dragged item
    newVideos.splice(draggedIndex, 1);
    // Insert at new position
    newVideos.splice(dropIndex, 0, draggedVideo);
    
    // Update order numbers
    newVideos.forEach((video, i) => {
      video.order = i + 1;
    });
    
    onChange(newVideos);
    setDraggedIndex(null);
  };

  // Helper to extract YouTube ID from URL
  const extractYouTubeId = (url: string): string => {
    if (!url) return '';
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return url; // Return original if no match (might be just ID)
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">{label}</Label>
        <Button
          type="button"
          onClick={addVideo}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Video
        </Button>
      </div>

      {videos.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <PlayCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 mb-4">No videos added yet</p>
          <Button onClick={addVideo} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Video
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {videos.map((video, index) => {
            const videoId = extractYouTubeId(video.url);
            const thumbnailPreview = video.thumbnail || 
              (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

            return (
              <Card
                key={index}
                className="p-4"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="flex items-start gap-4">
                  {/* Drag Handle */}
                  <div className="cursor-move pt-2">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                  </div>

                  {/* Thumbnail Preview */}
                  <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {thumbnailPreview ? (
                      <img
                        src={thumbnailPreview}
                        alt={video.title || 'Video thumbnail'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <PlayCircle className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Video Fields */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`title-${index}`} className="text-sm">Title</Label>
                        <Input
                          id={`title-${index}`}
                          value={video.title}
                          onChange={(e) => updateVideo(index, 'title', e.target.value)}
                          placeholder="e.g., Introduction to Our Services"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`duration-${index}`} className="text-sm">Duration</Label>
                        <Input
                          id={`duration-${index}`}
                          value={video.duration}
                          onChange={(e) => updateVideo(index, 'duration', e.target.value)}
                          placeholder="e.g., 3:45"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`url-${index}`} className="text-sm">YouTube URL</Label>
                      <Input
                        id={`url-${index}`}
                        value={video.url}
                        onChange={(e) => updateVideo(index, 'url', e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Supports YouTube URLs, short URLs (youtu.be), or just the video ID
                      </p>
                    </div>

                    <div>
                      <Label htmlFor={`thumbnail-${index}`} className="text-sm">
                        Custom Thumbnail URL (Optional)
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id={`thumbnail-${index}`}
                          value={video.thumbnail || ''}
                          onChange={(e) => updateVideo(index, 'thumbnail', e.target.value)}
                          placeholder="/uploads/thumbnails/video.jpg or https://..."
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Upload thumbnail"
                          className="flex-shrink-0"
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to use YouTube's thumbnail. Upload to AWS or use public URL.
                      </p>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeVideo(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {videos.length > 0 && (
        <p className="text-sm text-gray-500">
          Drag videos to reorder them. They will appear in this order on the landing page.
        </p>
      )}
    </div>
  );
}