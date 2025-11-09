'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  Users,
  Target,
  Rocket,
  LogOut,
  Home,
  UserCog,
  Calendar,
  TrendingUp,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiUrl } from '@/utils/api';
import { handleApiResponse, getFromStorage } from '../../../utils/jsonHelpers';

interface ContractorProfile {
  userId: number;
  contractorId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  phone: string | null;
  focusAreas: string | null;
  revenueTier: string | null;
  teamSize: string | null;
  lifecycleStage: string | null;
  lastLogin: string;
  createdAt: string;
}

export default function ContractorDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = getFromStorage('contractorToken');

      if (!token) {
        router.push('/contractor/login');
        return;
      }

      const response = await fetch(getApiUrl('api/contractor-auth/profile'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('contractorToken');
          localStorage.removeItem('contractorInfo');
          router.push('/contractor/login');
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await handleApiResponse(response);

      if (data.success) {
        setProfile(data.profile);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to load profile');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('contractorToken');
    localStorage.removeItem('contractorInfo');
    router.push('/contractor/login');
  };

  const getDisplayName = () => {
    if (profile?.firstName || profile?.lastName) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }
    return profile?.email || 'Contractor';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-power100-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error || 'Failed to load profile'}</p>
              <Button onClick={fetchProfile} className="bg-power100-green hover:bg-green-600 text-white">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-power100-green" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Contractor Portal</h1>
                <p className="text-sm text-gray-600">{profile.companyName || getDisplayName()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Home
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Welcome Section */}
          <Card className="mb-6 bg-gradient-to-r from-power100-green to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome back, {getDisplayName()}!</h2>
                  <p className="text-green-50">
                    Your Power100 Experience dashboard is ready. Access your AI concierge, partner matches, and business resources.
                  </p>
                </div>
                <Badge variant="secondary" className="bg-white text-power100-green">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Profile Info */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-power100-green" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
                {profile.phone && (
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{profile.phone}</p>
                  </div>
                )}
                {profile.companyName && (
                  <div>
                    <p className="text-sm text-gray-500">Company</p>
                    <p className="font-medium">{profile.companyName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">{new Date(profile.createdAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Business Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.revenueTier && (
                  <div>
                    <p className="text-sm text-gray-500">Revenue Tier</p>
                    <p className="font-medium">{profile.revenueTier}</p>
                  </div>
                )}
                {profile.teamSize && (
                  <div>
                    <p className="text-sm text-gray-500">Team Size</p>
                    <p className="font-medium">{profile.teamSize}</p>
                  </div>
                )}
                {profile.lifecycleStage && (
                  <div>
                    <p className="text-sm text-gray-500">Lifecycle Stage</p>
                    <Badge variant="outline">{profile.lifecycleStage}</Badge>
                  </div>
                )}
                {profile.lastLogin && (
                  <div>
                    <p className="text-sm text-gray-500">Last Login</p>
                    <p className="font-medium">{new Date(profile.lastLogin).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Focus Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.focusAreas ? (
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(profile.focusAreas).map((area: string, idx: number) => (
                      <Badge key={idx} variant="secondary">{area}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No focus areas set</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Access your Power100 Experience features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push('/ai-concierge')}
                >
                  <Rocket className="w-6 h-6 text-power100-green" />
                  <div className="text-center">
                    <p className="font-semibold">AI Concierge</p>
                    <p className="text-xs text-gray-500">Get personalized guidance</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push('/matches')}
                >
                  <Users className="w-6 h-6 text-blue-600" />
                  <div className="text-center">
                    <p className="font-semibold">Partner Matches</p>
                    <p className="text-xs text-gray-500">View strategic partners</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push('/contractor/reports')}
                >
                  <FileText className="w-6 h-6 text-power100-red" />
                  <div className="text-center">
                    <p className="font-semibold">Reports</p>
                    <p className="text-xs text-gray-500">View performance reports</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => router.push('/events')}
                >
                  <Calendar className="w-6 h-6 text-purple-600" />
                  <div className="text-center">
                    <p className="font-semibold">Events</p>
                    <p className="text-xs text-gray-500">Upcoming networking events</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
