'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  ArrowLeft,
  Headphones,
  Calendar
} from 'lucide-react';
import PodcastForm from '@/components/admin/PodcastForm';
import { Podcast } from '@/lib/types/podcast';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../../utils/jsonHelpers';

export default function PodcastsPage() {
  const router = useRouter();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | undefined>(undefined);

  useEffect(() => {
    fetchPodcasts();
  }, []);

  const fetchPodcasts = async () => {
    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      
      const response = await fetch('/api/podcasts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await handleApiResponse(response);
        setPodcasts(data);
      } else {
        console.error('Failed to fetch podcasts:', response.status);
      }
    } catch (error) {
      console.error('Error fetching podcasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this podcast?')) return;

    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      
      const response = await fetch(`/api/podcasts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await fetchPodcasts();
      }
    } catch (error) {
      console.error('Error deleting podcast:', error);
    }
  };

  const filteredPodcasts = podcasts.filter(podcast => 
    podcast.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    podcast.host?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    podcast.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showForm) {
    return (
      <PodcastForm
        podcast={selectedPodcast}
        onSuccess={() => {
          setShowForm(false);
          setSelectedPodcast(undefined);
          fetchPodcasts();
        }}
        onCancel={() => {
          setShowForm(false);
          setSelectedPodcast(undefined);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/admindashboard')}
              className="hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-power100-black">Podcasts Management</h1>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-power100-green hover:bg-green-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Podcast
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search podcasts by title, host, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        {/* Podcasts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-power100-green"></div>
            <p className="mt-4 text-power100-grey">Loading podcasts...</p>
          </div>
        ) : filteredPodcasts.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="text-center py-12">
              <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No podcasts found matching your search.' : 'No podcasts added yet.'}
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-power100-green hover:bg-green-600 text-white"
              >
                Add First Podcast
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPodcasts.map(podcast => (
              <Card key={podcast.id} className="bg-white hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{podcast.title || 'Untitled Podcast'}</CardTitle>
                      <p className="text-sm text-power100-grey mt-1">Hosted by {podcast.host || 'Unknown'}</p>
                    </div>
                    <Badge 
                      variant={
                        podcast.status === 'draft' 
                          ? 'outline' 
                          : podcast.is_active 
                            ? 'default' 
                            : 'secondary'
                      }
                    >
                      {podcast.status === 'draft' 
                        ? 'Draft' 
                        : podcast.is_active 
                          ? 'Active' 
                          : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {podcast.frequency && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-power100-grey" />
                        <p className="text-sm text-gray-600">{podcast.frequency}</p>
                      </div>
                    )}
                    {podcast.format && (
                      <div className="flex items-center gap-2">
                        <Headphones className="h-3 w-3 text-power100-grey" />
                        <p className="text-sm text-gray-600">{podcast.format}</p>
                      </div>
                    )}
                    {podcast.target_audience && (
                      <p className="text-sm text-gray-600 italic">"{podcast.target_audience}"</p>
                    )}
                  </div>

                  {podcast.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{podcast.description}</p>
                  )}
                  
                  {podcast.focus_areas_covered && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Focus Areas:</p>
                      <div className="flex flex-wrap gap-1">
                        {podcast.focus_areas_covered.split(',').slice(0, 3).map((area, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {area.trim()}
                          </Badge>
                        ))}
                        {podcast.focus_areas_covered.split(',').length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{podcast.focus_areas_covered.split(',').length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPodcast(podcast);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {podcast.website && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(podcast.website, '_blank')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => podcast.id && handleDelete(podcast.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}