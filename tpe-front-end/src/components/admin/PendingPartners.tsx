'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { partnerApi } from '@/lib/api';

interface PendingPartner {
  id: number;
  company_name: string;
  ceo_contact_name?: string;
  ceo_contact_email?: string;
  status: string;
  completed_steps: number;
  created_at: string;
  is_active: boolean;
  value_proposition?: string;
  website?: string;
}

export default function PendingPartners() {
  const [partners, setPartners] = useState<PendingPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingPartners();
  }, []);

  const fetchPendingPartners = async () => {
    try {
      const data = await partnerApi.getPendingPartners();
      setPartners(data.partners || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approvePartner = async (partnerId: number) => {
    if (!confirm('Are you sure you want to approve this partner?')) {
      return;
    }

    try {
      await partnerApi.approvePartner(partnerId.toString());

      // Refresh the list
      await fetchPendingPartners();
      alert('Partner approved successfully!');
    } catch (err: any) {
      alert(`Error approving partner: ${err.message}`);
    }
  };

  const activatePartner = async (partnerId: number) => {
    try {
      await partnerApi.toggleStatus(partnerId.toString());

      // Refresh the list
      await fetchPendingPartners();
      alert('Partner activated successfully!');
    } catch (err: any) {
      alert(`Error activating partner: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string, completedSteps: number) => {
    if (status === 'partial_submission') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Partial (Step {completedSteps}/8)
        </Badge>
      );
    } else if (status === 'pending_review') {
      return (
        <Badge className="bg-blue-100 text-blue-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pending Review
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-800">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">Loading pending partners...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-600">Error: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Pending Partner Applications</span>
          <Badge variant="outline" className="ml-2">
            {partners.length} Pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {partners.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pending partner applications
          </div>
        ) : (
          <div className="space-y-4">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {partner.company_name}
                      </h3>
                      {getStatusBadge(partner.status, partner.completed_steps)}
                      {!partner.is_active && (
                        <Badge className="bg-gray-100 text-gray-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      {partner.ceo_contact_name && (
                        <div>Contact: {partner.ceo_contact_name}</div>
                      )}
                      {partner.ceo_contact_email && (
                        <div>Email: {partner.ceo_contact_email}</div>
                      )}
                      {partner.website && (
                        <div>Website: {partner.website}</div>
                      )}
                      <div>
                        Applied: {new Date(partner.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {partner.value_proposition && (
                      <div className="mt-2 text-sm text-gray-700">
                        <strong>Value Proposition:</strong> {partner.value_proposition.substring(0, 150)}...
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `/admindashboard/partners/${partner.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    {partner.status === 'pending_review' && (
                      <Button
                        size="sm"
                        className="bg-power100-green hover:bg-green-700 text-white"
                        onClick={() => approvePartner(partner.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    
                    {!partner.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-power100-green text-power100-green hover:bg-power100-green hover:text-white"
                        onClick={() => activatePartner(partner.id)}
                      >
                        Activate
                      </Button>
                    )}
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