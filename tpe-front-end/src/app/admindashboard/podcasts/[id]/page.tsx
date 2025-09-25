'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PodcastForm from '@/components/admin/PodcastForm';
import { Mic, ArrowLeft, Edit, Calendar, Link, Headphones } from 'lucide-react';
import { podcastApi } from '@/lib/api';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../../../utils/jsonHelpers';

export default function PodcastDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [podcast, setPodcast] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchPodcast();
    }
  }, [params.id]);

  const fetchPodcast = async () => {
    try {
      const data = await podcastApi.get(params.id as string);
      setPodcast(data);
    } catch (error) {
      console.error('Error fetching podcast:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    fetchPodcast();
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <p>Loading podcast details...</p>
        </div>
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <p>Podcast not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (editMode) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <PodcastForm 
            podcast={podcast} 
            onSuccess={handleUpdate}
            onCancel={() => setEditMode(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => setEditMode(true)} className="bg-power100-green hover:bg-green-600 text-white text-shadow-soft">
            <Edit className="mr-2 h-4 w-4" />
            Edit Podcast
          </Button>
        </div>

        {/* Main Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {podcast.cover_image_url && (
                  <img src={podcast.cover_image_url} alt={podcast.name} className="w-24 h-24 object-cover rounded" />
                )}
                <div>
                  <CardTitle className="text-2xl">{podcast.name || podcast.title}</CardTitle>
                  <p className="text-gray-600">Hosted by {podcast.host}</p>
                  <Badge className={podcast.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {podcast.status || 'pending_review'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {podcast.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-600">{podcast.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {podcast.episode_frequency && (
                <div>
                  <h3 className="font-semibold mb-1">Frequency</h3>
                  <p className="text-gray-600">{podcast.episode_frequency.replace(/_/g, ' ')}</p>
                </div>
              )}
              {podcast.total_episodes > 0 && (
                <div>
                  <h3 className="font-semibold mb-1">Total Episodes</h3>
                  <p className="text-gray-600">{podcast.total_episodes}</p>
                </div>
              )}
            </div>

            {/* Platform Links */}
            <div className="space-y-2">
              {podcast.website_url && (
                <div>
                  <a href={podcast.website_url} target="_blank" rel="noopener noreferrer" className="text-power100-red hover:underline">
                    Website
                  </a>
                </div>
              )}
              {podcast.spotify_url && (
                <div>
                  <a href={podcast.spotify_url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                    Spotify
                  </a>
                </div>
              )}
              {podcast.apple_podcasts_url && (
                <div>
                  <a href={podcast.apple_podcasts_url} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
                    Apple Podcasts
                  </a>
                </div>
              )}
            </div>

            {podcast.focus_areas && (() => {
              let areas = [];
              try {
                areas = Array.isArray(podcast.focus_areas) ? podcast.focus_areas : 
                        typeof podcast.focus_areas === 'string' ? safeJsonParse(podcast.focus_areas) : [];
              } catch (e) {
                areas = [];
              }
              return areas.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-2">Focus Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {areas.map((area: string) => (
                      <Badge key={area} variant="secondary">
                        {area.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {podcast.notable_guests && (() => {
              let guests = [];
              try {
                guests = Array.isArray(podcast.notable_guests) ? podcast.notable_guests : 
                         typeof podcast.notable_guests === 'string' ? safeJsonParse(podcast.notable_guests) : [];
              } catch (e) {
                guests = [];
              }
              return guests.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-2">Notable Guests</h3>
                  <ul className="list-disc list-inside text-gray-600">
                    {guests.map((guest: string, index: number) => (
                      <li key={index}>{guest}</li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>

        {/* Submitter Info Card */}
        {podcast.submitter_name && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submitter Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Name:</strong> {podcast.submitter_name}</p>
              <p><strong>Email:</strong> {podcast.submitter_email}</p>
              {podcast.submitter_phone && <p><strong>Phone:</strong> {podcast.submitter_phone}</p>}
              {podcast.submitter_company && <p><strong>Company:</strong> {podcast.submitter_company}</p>}
              <p><strong>Is Host:</strong> {podcast.is_host ? 'Yes' : 'No'}</p>
              {podcast.created_at && (
                <p><strong>Submitted:</strong> {new Date(podcast.created_at).toLocaleDateString()}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}