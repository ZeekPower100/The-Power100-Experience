"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { SimpleDynamicList } from '@/components/ui/simple-dynamic-list';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LogoManager from '@/components/admin/LogoManager';
import { podcastApi } from '@/lib/api';
import { Mic, User, Target, Sparkles, ArrowRight, ArrowLeft, AlertTriangle, Headphones } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Podcast } from '@/lib/types/podcast';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

// Focus areas for podcast matching - aligned with partner focus areas
const FOCUS_AREAS = [
  { value: 'greenfield_growth', label: 'Market Expansion', description: 'Expanding into new markets and territories' },
  { value: 'team_building', label: 'Team Development', description: 'Building and developing high-performing teams' },
  { value: 'operational_efficiency', label: 'Operations & Efficiency', description: 'Streamlining processes and improving productivity' },
  { value: 'marketing_sales', label: 'Marketing & Sales', description: 'Growing revenue through marketing and sales strategies' },
  { value: 'financial_management', label: 'Financial Management', description: 'Managing finances, budgeting, and cash flow' },
  { value: 'technology_implementation', label: 'Technology & Digital', description: 'Implementing technology solutions and digital transformation' },
  { value: 'customer_experience', label: 'Customer Experience', description: 'Enhancing customer satisfaction and retention' },
  { value: 'strategic_planning', label: 'Strategic Planning', description: 'Long-term planning and business strategy' },
  { value: 'culture_development', label: 'Culture & Leadership', description: 'Building company culture and leadership development' },
  { value: 'talent_management', label: 'Talent Management', description: 'Recruiting, retaining, and developing talent' }
];

const TARGET_REVENUE_OPTIONS = [
  { value: '0_5_million', label: '0-5 Million' },
  { value: '5_10_million', label: '5-10 Million' },
  { value: '11_20_million', label: '11-20 Million' },
  { value: '21_30_million', label: '21-30 Million' },
  { value: '31_50_million', label: '31-50 Million' },
  { value: '51_75_million', label: '51-75 Million' },
  { value: '76_150_million', label: '76-150 Million' },
  { value: '151_300_million', label: '151-300 Million' },
  { value: '300_plus_million', label: '300+ Million' }
];

const EPISODE_FREQUENCY_OPTIONS = [
  { value: 'Daily', label: 'Daily' },
  { value: 'Twice Weekly', label: 'Twice Weekly' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Biweekly', label: 'Biweekly' },
  { value: 'Monthly', label: 'Monthly' }
];

export default function PodcastOnboardingForm() {
  const router = useRouter();
  const totalSteps = 4;
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionType, setSubmissionType] = useState<'host' | 'team_member'>('host');

  // Form data state
  const [formData, setFormData] = useState<Partial<Podcast>>({
    title: '',
    host: '',
    description: '',
    website: '',
    spotify_url: '',
    apple_podcasts_url: '',
    youtube_url: '',
    other_platform_urls: '',
    focus_areas_covered: [],
    target_revenue: [],
    frequency: '',
    average_episode_length: '',
    total_episodes: 0,
    subscriber_count: 0,
    download_average: 0,
    notable_guests: [],
    topics: [],
    testimonials: [],
    logo_url: '',
    target_audience: '',
    accepts_guest_requests: false,
    guest_requirements: '',
    typical_guest_profile: '',
    booking_link: '',
    host_email: '',
    host_phone: '',
    host_linkedin: '',
    host_company: '',
    host_bio: '',
    format: '',
    submitter_name: '',
    submitter_email: '',
    submitter_phone: '',
    submitter_company: '',
    is_host: false,
    status: 'pending_review'
  });

  const handleFieldChange = (field: keyof Podcast, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field: keyof Podcast, values: string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: values
    }));
  };

  const handleFocusAreaToggle = (area: string) => {
    const currentAreas = formData.focus_areas_covered || [];
    if (currentAreas.includes(area)) {
      handleArrayFieldChange('focus_areas_covered', currentAreas.filter(a => a !== area));
    } else {
      handleArrayFieldChange('focus_areas_covered', [...currentAreas, area]);
    }
  };

  const handleTargetRevenueToggle = (revenue: string) => {
    const currentRevenues = formData.target_revenue || [];
    if (currentRevenues.includes(revenue)) {
      handleArrayFieldChange('target_revenue', currentRevenues.filter(r => r !== revenue));
    } else {
      handleArrayFieldChange('target_revenue', [...currentRevenues, revenue]);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Map fields to match backend expectations
      const submissionData = {
        ...formData,
        // Map array fields to JSON strings
        notable_guests: safeJsonStringify(formData.notable_guests || []),
        topics: safeJsonStringify(formData.topics || []),
        testimonials: safeJsonStringify(formData.testimonials || []),
        focus_areas_covered: safeJsonStringify(formData.focus_areas_covered || []),
        // Keep original fields
        is_host: submissionType === 'host',
        status: 'pending_review'
      };

      await podcastApi.create(submissionData);
      
      // Redirect to success page
      router.push('/podcast/form/success');
    } catch (err: any) {
      setError(err.message || 'Failed to submit podcast. Please try again.');
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Podcast Information';
      case 2:
        return 'Target Audience & Focus Areas';
      case 3:
        return 'Episode Details & Content';
      case 4:
        return 'Contact Information';
      default:
        return '';
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 1:
        return <Mic className="h-6 w-6 text-white" />;
      case 2:
        return <Target className="h-6 w-6 text-white" />;
      case 3:
        return <Headphones className="h-6 w-6 text-white" />;
      case 4:
        return <User className="h-6 w-6 text-white" />;
      default:
        return <Mic className="h-6 w-6 text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-power100-black">Podcast Submission</h1>
            <span className="text-sm text-power100-grey">
              Step {currentStep} of {totalSteps}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-power100-green h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Form Card */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-8">
            {/* Step Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
                {getStepIcon()}
              </div>
              <h2 className="text-xl font-semibold text-power100-black">
                {getStepTitle()}
              </h2>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-600">{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Podcast Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title">Podcast Name *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Enter the name of your podcast"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="host">Host Name(s) *</Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) => handleFieldChange('host', e.target.value)}
                    placeholder="Enter the host name(s)"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Podcast Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Describe your podcast and its value to contractors (2-3 paragraphs)"
                    className="mt-1 min-h-[150px]"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="website">Podcast Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    placeholder="https://yourpodcast.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Podcast Cover Image</Label>
                  <div className="mt-2">
                    <LogoManager
                      entityType="podcast"
                      entityName={formData.title || 'podcast'}
                      currentLogoUrl={formData.logo_url}
                      onLogoChange={(url) => handleFieldChange('logo_url', url)}
                      label="Upload Cover Image"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Target Audience & Focus Areas */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-lg font-semibold">What contractor challenges does your podcast address? *</Label>
                  <p className="text-sm text-power100-grey mb-4">
                    Select all the business challenges and focus areas your podcast episodes help contractors overcome
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {FOCUS_AREAS.map(area => (
                      <div
                        key={area.value}
                        className={`
                          border rounded-lg p-3 cursor-pointer transition-all
                          ${formData.focus_areas_covered?.includes(area.value)
                            ? 'border-power100-green bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                        onClick={() => handleFocusAreaToggle(area.value)}
                      >
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={area.value}
                            checked={formData.focus_areas_covered?.includes(area.value) || false}
                            onCheckedChange={() => handleFocusAreaToggle(area.value)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={area.value}
                              className="font-medium cursor-pointer block"
                            >
                              {area.label}
                            </Label>
                            <p className="text-xs text-gray-600 mt-1">
                              {area.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Target Revenue Range</Label>
                  <p className="text-sm text-power100-grey mb-3">
                    Select the revenue ranges your content is most relevant for
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {TARGET_REVENUE_OPTIONS.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.value}
                          checked={formData.target_revenue?.includes(option.value) || false}
                          onCheckedChange={() => handleTargetRevenueToggle(option.value)}
                        />
                        <Label
                          htmlFor={option.value}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Textarea
                    id="target_audience"
                    value={formData.target_audience}
                    onChange={(e) => handleFieldChange('target_audience', e.target.value)}
                    placeholder="Describe your ideal listener (e.g., contractors with 10-50 employees looking to scale)"
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Episode Details & Content */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="format">Podcast Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(value) => handleFieldChange('format', value)}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue placeholder="Select podcast format" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Interview">Interview</SelectItem>
                      <SelectItem value="Solo">Solo</SelectItem>
                      <SelectItem value="Co-hosted">Co-hosted</SelectItem>
                      <SelectItem value="Panel">Panel</SelectItem>
                      <SelectItem value="Narrative">Narrative</SelectItem>
                      <SelectItem value="Educational">Educational</SelectItem>
                      <SelectItem value="Mixed">Mixed Format</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="frequency">Episode Frequency</Label>
                    <select
                      id="frequency"
                      value={formData.frequency}
                      onChange={(e) => handleFieldChange('frequency', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="">Select frequency</option>
                      {EPISODE_FREQUENCY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="average_episode_length">Average Episode Length</Label>
                    <Select
                      value={formData.average_episode_length}
                      onValueChange={(value) => handleFieldChange('average_episode_length', value)}
                    >
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue placeholder="Select episode length" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="< 15 minutes">Under 15 minutes</SelectItem>
                        <SelectItem value="15-30 minutes">15-30 minutes</SelectItem>
                        <SelectItem value="30-45 minutes">30-45 minutes</SelectItem>
                        <SelectItem value="45-60 minutes">45-60 minutes</SelectItem>
                        <SelectItem value="60+ minutes">Over 60 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="total_episodes">Total Episodes Published</Label>
                  <Input
                    id="total_episodes"
                    type="number"
                    value={formData.total_episodes}
                    onChange={(e) => handleFieldChange('total_episodes', parseInt(e.target.value) || 0)}
                    placeholder="Number of episodes"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="subscriber_count">Subscriber Count</Label>
                    <Input
                      id="subscriber_count"
                      type="number"
                      value={formData.subscriber_count}
                      onChange={(e) => handleFieldChange('subscriber_count', parseInt(e.target.value) || 0)}
                      placeholder="e.g., 5000"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="download_average">Average Downloads per Episode</Label>
                    <Input
                      id="download_average"
                      type="number"
                      value={formData.download_average}
                      onChange={(e) => handleFieldChange('download_average', parseInt(e.target.value) || 0)}
                      placeholder="e.g., 1500"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Platform Links</Label>
                  <div className="space-y-3 mt-2">
                    <Input
                      placeholder="Spotify URL"
                      value={formData.spotify_url}
                      onChange={(e) => handleFieldChange('spotify_url', e.target.value)}
                    />
                    <Input
                      placeholder="Apple Podcasts URL"
                      value={formData.apple_podcasts_url}
                      onChange={(e) => handleFieldChange('apple_podcasts_url', e.target.value)}
                    />
                    <Input
                      placeholder="YouTube URL"
                      value={formData.youtube_url}
                      onChange={(e) => handleFieldChange('youtube_url', e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Other Platform URLs (LinkedIn, Instagram, TikTok, etc.)"
                      value={formData.other_platform_urls}
                      onChange={(e) => handleFieldChange('other_platform_urls', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Notable Guests</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List notable guests who have appeared on your podcast
                  </p>
                  <SimpleDynamicList
                    items={formData.notable_guests || []}
                    onItemsChange={(items) => handleArrayFieldChange('notable_guests', items)}
                    placeholder="Enter guest name and episode"
                    buttonText="Add Guest"
                  />
                </div>

                <div>
                  <Label>Key Topics</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List the main topics covered in your podcast
                  </p>
                  <SimpleDynamicList
                    items={formData.topics || []}
                    onItemsChange={(items) => handleArrayFieldChange('topics', items)}
                    placeholder="Enter a key topic"
                    buttonText="Add Topic"
                  />
                </div>

                <div>
                  <Label>Testimonials</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Add testimonials from listeners or guests
                  </p>
                  <SimpleDynamicList
                    items={formData.testimonials || []}
                    onItemsChange={(items) => handleArrayFieldChange('testimonials', items)}
                    placeholder="Enter a testimonial"
                    buttonText="Add Testimonial"
                  />
                </div>

                {/* Guest Management Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accepts_guest_requests"
                      checked={formData.accepts_guest_requests || false}
                      onCheckedChange={(checked) => handleFieldChange('accepts_guest_requests', checked)}
                    />
                    <Label htmlFor="accepts_guest_requests">I accept guest requests from contractors</Label>
                  </div>

                  {formData.accepts_guest_requests && (
                    <div className="space-y-4 ml-6">
                      <div>
                        <Label htmlFor="guest_requirements">Guest Requirements</Label>
                        <Textarea
                          id="guest_requirements"
                          value={formData.guest_requirements}
                          onChange={(e) => handleFieldChange('guest_requirements', e.target.value)}
                          placeholder="What are your requirements for potential guests?"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="typical_guest_profile">Typical Guest Profile</Label>
                        <Input
                          id="typical_guest_profile"
                          value={formData.typical_guest_profile}
                          onChange={(e) => handleFieldChange('typical_guest_profile', e.target.value)}
                          placeholder="e.g., Contractors with $5M+ revenue"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="booking_link">Guest Booking Link</Label>
                        <Input
                          id="booking_link"
                          value={formData.booking_link}
                          onChange={(e) => handleFieldChange('booking_link', e.target.value)}
                          placeholder="https://calendly.com/..."
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Contact Information */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <Label>Are you the host of this podcast?</Label>
                  <div className="flex gap-4 mt-2">
                    <Button
                      type="button"
                      variant={submissionType === 'host' ? 'default' : 'outline'}
                      onClick={() => setSubmissionType('host')}
                      className={submissionType === 'host' ? 'bg-power100-green' : ''}
                    >
                      Yes, I'm the Host
                    </Button>
                    <Button
                      type="button"
                      variant={submissionType === 'team_member' ? 'default' : 'outline'}
                      onClick={() => setSubmissionType('team_member')}
                      className={submissionType === 'team_member' ? 'bg-power100-green' : ''}
                    >
                      No, I'm Submitting on Behalf
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="submitter_name">Your Name *</Label>
                  <Input
                    id="submitter_name"
                    value={formData.submitter_name}
                    onChange={(e) => handleFieldChange('submitter_name', e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="submitter_email">Your Email *</Label>
                  <Input
                    id="submitter_email"
                    type="email"
                    value={formData.submitter_email}
                    onChange={(e) => handleFieldChange('submitter_email', e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="submitter_phone">Your Phone Number</Label>
                  <Input
                    id="submitter_phone"
                    type="tel"
                    value={formData.submitter_phone}
                    onChange={(e) => handleFieldChange('submitter_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="submitter_company">Your Company</Label>
                  <Input
                    id="submitter_company"
                    value={formData.submitter_company}
                    onChange={(e) => handleFieldChange('submitter_company', e.target.value)}
                    placeholder="Company name (if applicable)"
                    className="mt-1"
                  />
                </div>

                {/* Host Contact Information - Show for both host and team_member */}
                {(submissionType === 'host' || submissionType === 'team_member') && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold mb-4">Host Information</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="host_email">Host Email</Label>
                        <Input
                          id="host_email"
                          type="email"
                          value={formData.host_email}
                          onChange={(e) => handleFieldChange('host_email', e.target.value)}
                          placeholder="host@example.com"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="host_phone">Host Phone</Label>
                        <Input
                          id="host_phone"
                          value={formData.host_phone}
                          onChange={(e) => handleFieldChange('host_phone', e.target.value)}
                          placeholder="(555) 123-4567"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="host_linkedin">Host LinkedIn Profile</Label>
                        <Input
                          id="host_linkedin"
                          value={formData.host_linkedin}
                          onChange={(e) => handleFieldChange('host_linkedin', e.target.value)}
                          placeholder="https://linkedin.com/in/yourprofile"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="host_company">Host Company</Label>
                        <Input
                          id="host_company"
                          value={formData.host_company}
                          onChange={(e) => handleFieldChange('host_company', e.target.value)}
                          placeholder="Your company name"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="host_bio">Host Bio</Label>
                        <Textarea
                          id="host_bio"
                          value={formData.host_bio}
                          onChange={(e) => handleFieldChange('host_bio', e.target.value)}
                          placeholder="Tell us about yourself and your experience..."
                          className="mt-1"
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                onClick={handleBack}
                variant="outline"
                disabled={currentStep === 1}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  onClick={handleNext}
                  className="bg-power100-green hover:bg-green-700 text-white flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-power100-green hover:bg-green-700 text-white flex items-center gap-2"
                >
                  {loading ? 'Submitting...' : 'Submit Podcast'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}