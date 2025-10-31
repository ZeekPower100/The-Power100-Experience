'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { getApiUrl } from '@/utils/api';

interface Campaign {
  id: number;
  campaign_name: string;
  quarter: string;
  year: number;
  status: string;
  end_date: string;
}

interface ProcessingResult {
  totalPartners: number;
  succeeded: number;
  failed: number;
  errors: Array<{ partnerId: number; error: string }>;
}

const PowerCardsManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [results, setResults] = useState<{ campaignId: number; result: ProcessingResult } | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const response = await fetch(getApiUrl('/api/power-cards/campaigns'));
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const processCampaign = async (campaignId: number) => {
    setProcessing(campaignId);
    setResults(null);

    try {
      const response = await fetch(getApiUrl(`/api/admin/power-cards/campaigns/${campaignId}/process`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        setResults({ campaignId, result: data.results });
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing campaign:', error);
      alert('Failed to process campaign. Check console for details.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-power100-black">Power Cards Management</h1>
          <p className="text-power100-grey mt-2">
            Manage quarterly feedback surveys and PowerConfidence scoring
          </p>
        </div>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>Process completed PowerCards campaigns to update partner PCR scores</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-power100-grey">No campaigns found. Create a campaign to begin.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold text-power100-black">{campaign.campaign_name}</h3>
                    <p className="text-sm text-power100-grey">
                      {campaign.quarter} {campaign.year} • Status: {campaign.status}
                    </p>
                  </div>
                  <Button
                    onClick={() => processCampaign(campaign.id)}
                    disabled={processing !== null}
                    className="bg-power100-green hover:bg-green-600 text-white"
                  >
                    {processing === campaign.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Process Campaign
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Results */}
      {results && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Campaign Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{results.result.totalPartners}</div>
                <div className="text-sm text-green-600">Total Partners</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{results.result.succeeded}</div>
                <div className="text-sm text-green-600">Succeeded</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{results.result.failed}</div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
            </div>

            {results.result.errors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errors
                </h4>
                <ul className="space-y-1 text-sm">
                  {results.result.errors.map((err, idx) => (
                    <li key={idx} className="text-red-700">
                      Partner {err.partnerId}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PowerCardsManager;