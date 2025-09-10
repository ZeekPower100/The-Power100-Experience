'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, BookOpen, Mic, Calendar } from 'lucide-react';
import PendingPartners from './PendingPartners';
import PendingBooks from './PendingBooks';
import PendingPodcasts from './PendingPodcasts';
import PendingEvents from './PendingEvents';
import { partnerApi, bookApi, podcastApi, eventApi } from '@/lib/api';

export default function PendingResourcesTabs() {
  const [counts, setCounts] = useState({
    partners: 0,
    books: 0,
    podcasts: 0,
    events: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      // Fetch all pending counts in parallel
      const [partnersRes, booksRes, podcastsRes, eventsRes] = await Promise.allSettled([
        partnerApi.getPendingPartners(),
        bookApi.getPending(),
        podcastApi.getPending(),
        eventApi.getPending()
      ]);

      setCounts({
        partners: partnersRes.status === 'fulfilled' ? (partnersRes.value.partners?.length || 0) : 0,
        books: booksRes.status === 'fulfilled' ? (booksRes.value.books?.length || 0) : 0,
        podcasts: podcastsRes.status === 'fulfilled' ? (podcastsRes.value.podcasts?.length || 0) : 0,
        events: eventsRes.status === 'fulfilled' ? (eventsRes.value.events?.length || 0) : 0
      });
    } catch (error) {
      console.error('Error fetching pending counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const TabLabel = ({ icon: Icon, label, count }: { icon: any, label: string, count: number }) => (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count > 0 && (
        <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
          {count}
        </Badge>
      )}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Pending Submissions</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="partners" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="partners" className="data-[state=active]:bg-power100-red data-[state=active]:text-white">
              <TabLabel icon={Users} label="Partners" count={counts.partners} />
            </TabsTrigger>
            <TabsTrigger value="books" className="data-[state=active]:bg-power100-red data-[state=active]:text-white">
              <TabLabel icon={BookOpen} label="Books" count={counts.books} />
            </TabsTrigger>
            <TabsTrigger value="podcasts" className="data-[state=active]:bg-power100-red data-[state=active]:text-white">
              <TabLabel icon={Mic} label="Podcasts" count={counts.podcasts} />
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-power100-red data-[state=active]:text-white">
              <TabLabel icon={Calendar} label="Events" count={counts.events} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partners" className="mt-0">
            <div className="pending-partners-content">
              <PendingPartners />
            </div>
          </TabsContent>

          <TabsContent value="books" className="mt-0">
            <div className="pending-books-content">
              <PendingBooks />
            </div>
          </TabsContent>

          <TabsContent value="podcasts" className="mt-0">
            <div className="pending-podcasts-content">
              <PendingPodcasts />
            </div>
          </TabsContent>

          <TabsContent value="events" className="mt-0">
            <div className="pending-events-content">
              <PendingEvents />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}