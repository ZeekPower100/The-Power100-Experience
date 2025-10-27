'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PartnerForm from '@/components/admin/PartnerForm';
import { Card, CardContent } from '@/components/ui/card';
import { getFromStorage } from '@/utils/jsonHelpers';

export default function PartnerProfileEditPage() {
  const router = useRouter();
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPartnerData();
  }, []);

  const fetchPartnerData = async () => {
    try {
      setLoading(true);
      const token = getFromStorage('partnerToken');

      if (!token) {
        router.push('/partner/login');
        return;
      }

      // Fetch complete partner profile
      const response = await fetch('http://localhost:5000/api/partner-portal/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('partnerToken');
          localStorage.removeItem('partnerInfo');
          router.push('/partner/login');
          return;
        }
        throw new Error('Failed to fetch partner data');
      }

      const data = await response.json();

      if (data.success && data.profile) {
        setPartnerData(data.profile);
      } else {
        throw new Error('Invalid response format');
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching partner data:', err);
      setError(err.message || 'Failed to load partner data');
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    // Redirect back to dashboard after successful update
    router.push('/partner/dashboard');
  };

  const handleCancel = () => {
    // Go back to dashboard
    router.push('/partner/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error || !partnerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-red-600 mb-4">{error || 'Unable to load partner data'}</p>
            <button
              onClick={() => router.push('/partner/dashboard')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Back to Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PartnerForm
      partner={partnerData}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      isPartnerSelfService={true}
    />
  );
}
