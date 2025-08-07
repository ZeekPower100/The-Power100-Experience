'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Star, 
  LogOut, 
  Settings,
  Mail,
  Phone,
  Globe,
  Building
} from 'lucide-react';

interface PartnerInfo {
  id: number;
  company_name: string;
  email: string;
  last_login: string;
}

interface PartnerProfile {
  email: string;
  last_login: string;
  created_at: string;
  company_name: string;
  description: string;
  website: string;
  logo_url: string;
  power_confidence_score: number;
  is_active: boolean;
}

export default function PartnerDashboard() {
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if partner is logged in
    const token = localStorage.getItem('partnerToken');
    const storedPartnerInfo = localStorage.getItem('partnerInfo');
    
    if (!token || !storedPartnerInfo) {
      router.push('/partner-portal');
      return;
    }

    setPartnerInfo(JSON.parse(storedPartnerInfo));
    fetchPartnerProfile(token);
  }, [router]);

  const fetchPartnerProfile = async (token: string) => {
    try {
      const response = await fetch('http://localhost:5001/api/partner-auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPartnerProfile(data.partner);
      } else {
        setError(data.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('partnerToken');
    localStorage.removeItem('partnerInfo');
    router.push('/partner-portal');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--power100-red)' }}>
                Power100
              </h1>
              <span className="ml-3 text-slate-500">Partner Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                Welcome, {partnerInfo?.company_name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {partnerProfile?.company_name}!
          </h2>
          <p className="text-slate-600">
            Here's an overview of your partnership performance and activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PowerConfidence Score</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {partnerProfile?.analytics?.power_confidence_score || partnerProfile?.power_confidence_score || 0}
              </div>
              <p className="text-xs text-slate-600">
                Customer satisfaction rating
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Received</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {partnerProfile?.analytics?.leads_received || 0}
              </div>
              <p className="text-xs text-slate-600">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Demo Requests</CardTitle>
              <Calendar className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {partnerProfile?.analytics?.demos_requested || 0}
              </div>
              <p className="text-xs text-slate-600">
                Pending scheduling
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {partnerProfile?.analytics?.conversion_rate ? 
                  `${partnerProfile.analytics.conversion_rate}%` : '--'}
              </div>
              <p className="text-xs text-slate-600">
                Demo to closed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Company Profile Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Company Profile
              </CardTitle>
              <CardDescription>
                Your company information and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <Badge variant={partnerProfile?.is_active ? "default" : "secondary"}>
                  {partnerProfile?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              <div>
                <span className="font-medium">Description:</span>
                <p className="text-slate-600 mt-1">
                  {partnerProfile?.description || "No description available"}
                </p>
              </div>

              {partnerProfile?.website && (
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-2 text-slate-500" />
                  <a 
                    href={partnerProfile.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {partnerProfile.website}
                  </a>
                </div>
              )}

              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-slate-500" />
                <span className="text-slate-600">{partnerProfile?.email}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
              <CardDescription>
                Login and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium">Account Created:</span>
                <p className="text-slate-600">
                  {partnerProfile?.created_at ? 
                    new Date(partnerProfile.created_at).toLocaleDateString() : 
                    "Unknown"
                  }
                </p>
              </div>

              <div>
                <span className="font-medium">Last Login:</span>
                <p className="text-slate-600">
                  {partnerProfile?.last_login ? 
                    new Date(partnerProfile.last_login).toLocaleString() : 
                    "Never"
                  }
                </p>
              </div>

              <Button variant="outline" className="w-full mt-4">
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              Additional features in development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border border-dashed border-slate-300 rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <h3 className="font-medium mb-1">Lead Management</h3>
                <p className="text-sm text-slate-600">Track and manage incoming leads</p>
              </div>
              <div className="text-center p-4 border border-dashed border-slate-300 rounded-lg">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <h3 className="font-medium mb-1">Demo Scheduling</h3>
                <p className="text-sm text-slate-600">Manage demo appointments</p>
              </div>
              <div className="text-center p-4 border border-dashed border-slate-300 rounded-lg">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <h3 className="font-medium mb-1">Analytics Dashboard</h3>
                <p className="text-sm text-slate-600">Performance metrics and insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}