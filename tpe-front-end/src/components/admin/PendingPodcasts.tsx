'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Trash2, Mic } from 'lucide-react';
import { podcastApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface PendingPodcast {
  id: number;
  name: string;
  host: string;
  submitter_name?: string;
  submitter_email?: string;
  status: string;
  created_at: string;
  is_host: boolean;
  description?: string;
  focus_areas?: string[];
  episode_frequency?: string;
  total_episodes?: number;
}

export default function PendingPodcasts() {
  const [podcasts, setPodcasts] = useState<PendingPodcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPendingPodcasts();
  }, []);

  const fetchPendingPodcasts = async () => {
    try {
      const data = await podcastApi.getPending();
      setPodcasts(data.podcasts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approvePodcast = async (podcastId: number) => {
    if (!confirm('Are you sure you want to approve this podcast?')) {
      return;
    }

    try {
      await podcastApi.approve(podcastId.toString());
      
      // Refresh the list
      await fetchPendingPodcasts();
      alert('Podcast approved successfully!');
    } catch (err: any) {
      alert(`Error approving podcast: ${err.message}`);
    }
  };

  const deletePodcast = async (podcastId: number, podcastName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${podcastName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await podcastApi.delete(podcastId.toString());
      
      // Refresh the list
      await fetchPendingPodcasts();
      alert('Podcast deleted successfully!');
    } catch (err: any) {
      alert(`Error deleting podcast: ${err.message}`);
    }
  };

  const viewPodcast = (podcastId: number) => {
    router.push(`/admindashboard/podcasts/${podcastId}`);
  };

  const getSubmitterInfo = (podcast: PendingPodcast) => {
    if (podcast.is_host) {
      return <span className="text-xs text-green-600">Submitted by Host</span>;
    }
    return <span className="text-xs text-gray-600">Submitted by: {podcast.submitter_name || 'Unknown'}</span>;
  };

  const getFrequencyBadge = (frequency?: string) => {
    if (!frequency) return null;
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      bi_weekly: 'Bi-Weekly',
      monthly: 'Monthly',
      irregular: 'Irregular'
    };
    return (
      <Badge variant="outline" className="text-xs">
        {labels[frequency] || frequency}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Pending Podcasts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading pending podcasts...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Pending Podcasts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">Error loading podcasts: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Pending Podcasts
          {podcasts.length > 0 && (
            <Badge className="ml-2">{podcasts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {podcasts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pending podcasts at this time
          </div>
        ) : (
          <div className="space-y-4">
            {podcasts.map((podcast) => (
              <div
                key={podcast.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-power100-black">
                        {podcast.name}
                      </h3>
                      <Badge className="bg-blue-100 text-blue-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending Review
                      </Badge>
                      {getFrequencyBadge(podcast.episode_frequency)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      Hosted by {podcast.host}
                    </p>
                    
                    {getSubmitterInfo(podcast)}
                    
                    {podcast.total_episodes && (
                      <p className="text-sm text-gray-600 mt-1">
                        {podcast.total_episodes} episodes published
                      </p>
                    )}
                    
                    {podcast.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {podcast.description}
                      </p>
                    )}
                    
                    {podcast.focus_areas && podcast.focus_areas.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {podcast.focus_areas.slice(0, 3).map((area) => (
                          <Badge key={area} variant="secondary" className="text-xs">
                            {area.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {podcast.focus_areas.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{podcast.focus_areas.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Submitted: {new Date(podcast.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewPodcast(podcast.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="bg-power100-green hover:bg-green-700 text-white flex items-center gap-1"
                      onClick={() => approvePodcast(podcast.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deletePodcast(podcast.id, podcast.name)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}