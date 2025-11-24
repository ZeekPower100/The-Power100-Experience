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
  FileText,
  Crown,
  Lock,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiUrl } from '@/utils/api';
import { handleApiResponse, getFromStorage, safeJsonParse } from '../../../utils/jsonHelpers';

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
  // CEO PCR Premium Access
  hasCeoPcrAccess: boolean;
  ceoPcrSubscriptionTier: string | null;
  ceoPcrSubscriptionStatus: string | null;
  ceoPcrSubscriptionStart: string | null;
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Modern Header */}
      <div className="relative bg-white shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-power100-green/5 via-transparent to-blue-500/5"></div>
        <div className="relative container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-power100-green to-emerald-600 flex items-center justify-center shadow-lg shadow-power100-green/30">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Contractor Portal</h1>
                <p className="text-sm text-gray-500">{profile.companyName || getDisplayName()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                  <Home className="w-4 h-4" />
                  Home
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-full hover:bg-red-100 hover:border-red-200 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
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
          {/* Modern Welcome Section */}
          <div className="mb-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-power100-green via-emerald-500 to-teal-600 text-white p-8 md:p-10 shadow-2xl">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
              <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl"></div>

              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm mb-4">
                    <span className="w-2 h-2 rounded-full bg-green-300 mr-2 animate-pulse"></span>
                    Account Active
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-3">Welcome back, {getDisplayName()}!</h2>
                  <p className="text-lg text-white/80 max-w-xl">
                    Your Power100 Experience dashboard is ready. Access your AI concierge, partner matches, and business resources.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Rocket className="w-10 h-10 md:w-12 md:h-12 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Profile Info Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Profile Information Card */}
            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-power100-green/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-power100-green to-emerald-600 flex items-center justify-center shadow-md shadow-power100-green/20">
                    <UserCog className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Profile Information</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">Email</span>
                    <span className="text-sm font-medium text-gray-900 truncate ml-4 max-w-[180px]">{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Phone</span>
                      <span className="text-sm font-medium text-gray-900">{profile.phone}</span>
                    </div>
                  )}
                  {profile.companyName && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Company</span>
                      <span className="text-sm font-medium text-gray-900">{profile.companyName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">Member Since</span>
                    <span className="text-sm font-medium text-power100-green">{new Date(profile.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Profile Card */}
            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Business Profile</h3>
                </div>
                <div className="space-y-4">
                  {profile.revenueTier && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Revenue Tier</span>
                      <span className="text-sm font-medium text-gray-900">{profile.revenueTier}</span>
                    </div>
                  )}
                  {profile.teamSize && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Team Size</span>
                      <span className="text-sm font-medium text-gray-900">{profile.teamSize}</span>
                    </div>
                  )}
                  {profile.lifecycleStage && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Lifecycle Stage</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                        {profile.lifecycleStage}
                      </span>
                    </div>
                  )}
                  {profile.lastLogin && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-500">Last Login</span>
                      <span className="text-sm font-medium text-blue-600">{new Date(profile.lastLogin).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Focus Areas Card */}
            <div className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md shadow-purple-500/20">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Focus Areas</h3>
                </div>
                {profile.focusAreas ? (
                  <div className="flex flex-wrap gap-2">
                    {safeJsonParse(profile.focusAreas, []).map((area: string, idx: number) => (
                      <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200/50">
                        {area}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No focus areas set</p>
                    <button className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium">
                      + Add Focus Areas
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CEO Culture Card - Premium Feature - Modern Design */}
          <div className="mb-6">
            <div className={`group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${
              profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'active'
                ? 'ring-2 ring-amber-400/50'
                : ''
            }`}>
              {/* Gradient Background Overlay */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'active'
                  ? 'bg-gradient-to-br from-amber-500/5 to-orange-500/5'
                  : 'bg-gradient-to-br from-gray-500/5 to-slate-500/5'
              }`}></div>

              {/* Decorative Element */}
              {profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'active' && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
              )}

              <div className="relative p-8">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  {/* Icon Section */}
                  <div className="flex-shrink-0">
                    <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center ${
                      profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'active'
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30'
                        : profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'inactive'
                          ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-lg shadow-orange-500/30'
                          : 'bg-gray-100'
                    }`}>
                      {profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'active' ? (
                        <Crown className="w-8 h-8 text-white" />
                      ) : profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'inactive' ? (
                        <Crown className="w-8 h-8 text-white" />
                      ) : (
                        <Lock className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1">
                    {/* Header with Badge */}
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">CEO Culture Feedback System</h3>
                      {profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'active' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border border-amber-200">
                          <Crown className="w-3.5 h-3.5 mr-1.5" />
                          Premium Active
                        </span>
                      ) : profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'inactive' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                          Subscription Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          <Lock className="w-3.5 h-3.5 mr-1.5" />
                          Premium Feature
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 mb-6 text-base leading-relaxed">
                      {profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'active'
                        ? 'Access your CEO PowerConfidence Rating dashboard. Collect anonymous employee feedback and track your leadership scores over time.'
                        : profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'inactive'
                          ? 'Your subscription has expired. Reactivate to continue using the CEO culture feedback system and access your historical data.'
                          : 'Unlock the power of anonymous employee feedback. Get your CEO PowerConfidence Rating (0-105) and AI-powered leadership recommendations.'}
                    </p>

                    {/* CTA Section */}
                    <div className="flex flex-wrap items-center gap-4">
                      {profile.hasCeoPcrAccess && profile.ceoPcrSubscriptionStatus === 'active' ? (
                        <>
                          <button
                            onClick={() => router.push(`/ceo-dashboard/${profile.contractorId}`)}
                            className="group/btn inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-full shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:from-amber-600 hover:to-orange-600 transition-all duration-300"
                          >
                            <BarChart3 className="w-5 h-5 mr-2" />
                            Open CEO Dashboard
                            <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                          </button>
                          <span className="text-sm text-gray-500">
                            Tier: <span className="font-semibold text-amber-600 capitalize">{profile.ceoPcrSubscriptionTier?.replace('culture_', '')}</span>
                          </span>
                        </>
                      ) : (
                        <button
                          onClick={() => router.push('/contractor/upgrade/ceo-pcr')}
                          className="group/btn inline-flex items-center px-6 py-3 bg-white border-2 border-amber-400 text-amber-600 font-semibold rounded-full hover:bg-amber-50 hover:border-amber-500 hover:text-amber-700 transition-all duration-300"
                        >
                          <Crown className="w-5 h-5 mr-2" />
                          {profile.hasCeoPcrAccess ? 'Reactivate Subscription' : 'Upgrade to Premium'}
                          <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      )}
                    </div>

                    {/* Feature List for Non-Premium */}
                    {!profile.hasCeoPcrAccess && (
                      <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-sm font-semibold text-gray-700 mb-4">What&apos;s included:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            'Anonymous employee feedback surveys',
                            'CEO PowerConfidence Rating (0-105)',
                            'Quarterly culture trend reports',
                            'AI-powered leadership recommendations'
                          ].map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm text-gray-600">
                              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Quick Actions */}
          <div className="mt-8">
            <div className="text-center mb-8">
              <span className="inline-block bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                Quick Actions
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Access Your Power100 Features</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* AI Concierge */}
              <button
                onClick={() => router.push('/ai-concierge')}
                className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-power100-green/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-power100-green to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-power100-green/30 group-hover:scale-110 transition-transform duration-300">
                    <Rocket className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">AI Concierge</h3>
                  <p className="text-sm text-gray-500 mb-4">Get personalized guidance</p>
                  <div className="flex items-center text-power100-green font-semibold text-sm group-hover:translate-x-1 transition-transform duration-300">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              {/* Partner Matches */}
              <button
                onClick={() => router.push('/matches')}
                className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Partner Matches</h3>
                  <p className="text-sm text-gray-500 mb-4">View strategic partners</p>
                  <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform duration-300">
                    View Matches
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              {/* Reports */}
              <button
                onClick={() => router.push('/contractor/reports')}
                className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-power100-red/10 to-rose-500/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-power100-red to-rose-600 flex items-center justify-center mb-4 shadow-lg shadow-power100-red/30 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Reports</h3>
                  <p className="text-sm text-gray-500 mb-4">View performance reports</p>
                  <div className="flex items-center text-power100-red font-semibold text-sm group-hover:translate-x-1 transition-transform duration-300">
                    View Reports
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              {/* Events */}
              <button
                onClick={() => router.push('/events')}
                className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform duration-300">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Events</h3>
                  <p className="text-sm text-gray-500 mb-4">Upcoming networking events</p>
                  <div className="flex items-center text-purple-600 font-semibold text-sm group-hover:translate-x-1 transition-transform duration-300">
                    View Events
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
