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
import LogoManager from '@/components/admin/LogoManager';
import { eventApi } from '@/lib/api';
import { Calendar, User, Target, Sparkles, ArrowRight, ArrowLeft, AlertTriangle, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Event } from '@/lib/types/event';

// Focus areas for event matching
const FOCUS_AREAS = [
  { value: 'revenue_growth', label: 'Revenue Growth' },
  { value: 'team_building', label: 'Team Building' },
  { value: 'hiring', label: 'Hiring' },
  { value: 'operational_efficiency', label: 'Operational Efficiency' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'financial_management', label: 'Financial Management' },
  { value: 'technology_implementation', label: 'Technology Implementation' },
  { value: 'customer_experience', label: 'Customer Experience' },
  { value: 'strategic_planning', label: 'Strategic Planning' },
  { value: 'culture_development', label: 'Culture Development' },
  { value: 'leadership_development', label: 'Leadership Development' },
  { value: 'business_development', label: 'Business Development' },
  { value: 'talent_management', label: 'Talent Management' }
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

const EVENT_TYPE_OPTIONS = [
  { value: 'Conference', label: 'Conference' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Seminar', label: 'Seminar' },
  { value: 'Webinar', label: 'Webinar' },
  { value: 'Networking', label: 'Networking Event' },
  { value: 'Training', label: 'Training Program' },
  { value: 'Summit', label: 'Summit' },
  { value: 'Bootcamp', label: 'Bootcamp' },
  { value: 'Retreat', label: 'Retreat' },
  { value: 'Other', label: 'Other' }
];

const EVENT_FORMAT_OPTIONS = [
  { value: 'In-person', label: 'In-Person' },
  { value: 'Virtual', label: 'Virtual' },
  { value: 'Hybrid', label: 'Hybrid' }
];

const EXPECTED_ATTENDANCE_OPTIONS = [
  { value: '1-50', label: '1-50' },
  { value: '51-100', label: '51-100' },
  { value: '101-250', label: '101-250' },
  { value: '251-500', label: '251-500' },
  { value: '500+', label: '500+' }
];

const DURATION_OPTIONS = [
  { value: 'Half day', label: 'Half Day' },
  { value: '1 day', label: '1 Day' },
  { value: '2 days', label: '2 Days' },
  { value: '3 days', label: '3 Days' },
  { value: '1 week', label: '1 Week' },
  { value: 'Other', label: 'Other' }
];

const NETWORKING_OPTIONS = [
  { value: 'speed_networking', label: 'Structured Speed Networking' },
  { value: 'roundtables', label: 'Roundtable Discussions' },
  { value: 'one_on_ones', label: '1-on-1 Scheduled Meetings' },
  { value: 'open_networking', label: 'Open Networking Hours' },
  { value: 'meal_networking', label: 'Breakfast/Lunch/Dinner Networking' },
  { value: 'cocktail_reception', label: 'Cocktail Reception' },
  { value: 'breakout_sessions', label: 'Breakout Sessions' },
  { value: 'virtual_breakouts', label: 'Virtual Breakout Rooms' },
  { value: 'app_facilitated', label: 'Mobile App Connections' },
  { value: 'industry_meetups', label: 'Industry Meetups' },
  { value: 'vendor_exhibition', label: 'Vendor Exhibition Time' },
  { value: 'after_party', label: 'After-Party/Social Events' }
];

export default function EventOnboardingForm() {
  const router = useRouter();
  const totalSteps = 4;
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionType, setSubmissionType] = useState<'organizer' | 'team_member'>('organizer');

  // Form data state
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [formData, setFormData] = useState<Partial<Event>>({
    name: '',
    description: '',
    event_type: '',
    format: '',
    date: '',
    end_date: '',
    duration: '',
    location: '',
    website: '',
    registration_url: '',
    registration_deadline: '',
    hotel_block_url: '',
    focus_areas_covered: [],
    target_revenue: [],
    target_audience: '',
    speaker_profiles: [],
    agenda_highlights: [],
    past_attendee_testimonials: [],
    topics: '',
    success_metrics: '',
    sponsors: [],
    pre_registered_attendees: [],
    networking_opportunities: [],
    session_recordings: false,
    post_event_support: '',
    implementation_support: false,
    follow_up_resources: [],
    price_range: '',
    expected_attendance: '',
    event_image_url: '',
    organizer_name: '',
    organizer_email: '',
    organizer_phone: '',
    organizer_company: '',
    poc_customer_name: '',
    poc_customer_email: '',
    poc_customer_phone: '',
    poc_media_name: '',
    poc_media_email: '',
    poc_media_phone: '',
    is_organizer: false,
    status: 'pending_review'
  });

  const handleFieldChange = (field: keyof Event, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field: keyof Event, values: string[]) => {
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

  const handleNetworkingToggle = (opportunity: string) => {
    const currentOpportunities = formData.networking_opportunities || [];
    if (currentOpportunities.includes(opportunity)) {
      handleArrayFieldChange('networking_opportunities', currentOpportunities.filter(o => o !== opportunity));
    } else {
      handleArrayFieldChange('networking_opportunities', [...currentOpportunities, opportunity]);
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
        // Stringify array fields for database storage
        speaker_profiles: JSON.stringify(formData.speaker_profiles || []),
        past_attendee_testimonials: JSON.stringify(formData.past_attendee_testimonials || []),
        agenda_highlights: JSON.stringify(formData.agenda_highlights || []),
        sponsors: JSON.stringify(formData.sponsors || []),
        pre_registered_attendees: JSON.stringify(formData.pre_registered_attendees || []),
        networking_opportunities: JSON.stringify(formData.networking_opportunities || []),
        follow_up_resources: JSON.stringify(formData.follow_up_resources || []),
        target_revenue: JSON.stringify(formData.target_revenue || []),
        focus_areas_covered: formData.focus_areas_covered?.join(', ') || '',
        // Boolean fields
        session_recordings: formData.session_recordings || false,
        implementation_support: formData.implementation_support || false,
        // Text fields
        post_event_support: formData.post_event_support || '',
        expected_attendance: formData.expected_attendance || '',
        hotel_block_url: formData.hotel_block_url || '',
        // Map logo
        logo_url: formData.event_image_url,
        // Keep original fields too for compatibility
        is_organizer: submissionType === 'organizer',
        status: 'pending_review'
      };

      console.log('Sending event data:', submissionData);
      console.log('Critical fields check:');
      console.log('- event_type:', submissionData.event_type);
      console.log('- date:', submissionData.date);
      console.log('- expected_attendance:', submissionData.expected_attendance);
      console.log('- hotel_block_url:', submissionData.hotel_block_url);
      console.log('- target_revenue:', submissionData.target_revenue);
      console.log('- sponsors:', submissionData.sponsors);
      console.log('- networking_opportunities:', submissionData.networking_opportunities);
      console.log('- session_recordings:', submissionData.session_recordings);
      console.log('- POC fields:', {
        poc_customer_name: submissionData.poc_customer_name,
        poc_customer_email: submissionData.poc_customer_email,
        poc_media_name: submissionData.poc_media_name,
        poc_media_email: submissionData.poc_media_email
      });
      
      await eventApi.create(submissionData);
      
      // Redirect to success page
      router.push('/event/form/success');
    } catch (err: any) {
      setError(err.message || 'Failed to submit event. Please try again.');
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Event Information';
      case 2:
        return 'Target Audience & Focus Areas';
      case 3:
        return 'Event Details & Content';
      case 4:
        return 'Contact Information';
      default:
        return '';
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 1:
        return <Calendar className="h-6 w-6 text-white" />;
      case 2:
        return <Target className="h-6 w-6 text-white" />;
      case 3:
        return <Sparkles className="h-6 w-6 text-white" />;
      case 4:
        return <User className="h-6 w-6 text-white" />;
      default:
        return <Calendar className="h-6 w-6 text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-power100-black">Event Submission</h1>
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

            {/* Step 1: Event Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Enter the name of your event"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="organizer_company">Event Organizer *</Label>
                  <Input
                    id="organizer_company"
                    value={formData.organizer_company || ''}
                    onChange={(e) => handleFieldChange('organizer_company', e.target.value)}
                    placeholder="Enter the organizing company or individual"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Event Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Describe your event and its value to contractors (2-3 paragraphs)"
                    className="mt-1 min-h-[150px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="event_type">Event Type *</Label>
                    <select
                      id="event_type"
                      value={formData.event_type}
                      onChange={(e) => handleFieldChange('event_type', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                      required
                    >
                      <option value="">Select type</option>
                      {EVENT_TYPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="format">Event Format *</Label>
                    <select
                      id="format"
                      value={formData.format}
                      onChange={(e) => handleFieldChange('format', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                      required
                    >
                      <option value="">Select format</option>
                      {EVENT_FORMAT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Event Image</Label>
                  <div className="mt-2">
                    <LogoManager
                      entityType="event"
                      entityName={formData.name || 'event'}
                      currentLogoUrl={formData.event_image_url}
                      onLogoChange={(url) => handleFieldChange('event_image_url', url)}
                      label="Upload Event Image"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Target Audience & Focus Areas */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <Label>Business Focus Areas *</Label>
                  <p className="text-sm text-power100-grey mb-3">
                    Select the business areas your event addresses
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {FOCUS_AREAS.map(area => (
                      <div key={area.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={area.value}
                          checked={formData.focus_areas_covered?.includes(area.value) || false}
                          onCheckedChange={() => handleFocusAreaToggle(area.value)}
                        />
                        <Label
                          htmlFor={area.value}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {area.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Target Revenue Range</Label>
                  <p className="text-sm text-power100-grey mb-3">
                    Select the revenue ranges this event is most relevant for
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
                  <Label htmlFor="target_audience">Target Audience Description</Label>
                  <Textarea
                    id="target_audience"
                    value={formData.target_audience}
                    onChange={(e) => handleFieldChange('target_audience', e.target.value)}
                    placeholder="Who should attend this event? (e.g., contractors with $5M-$20M revenue looking to scale)"
                    rows={3}
                    className="mt-1"
                  />
                  <p className="text-sm text-power100-grey mt-1">
                    Helps us match with appropriate contractors
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Event Details & Content */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="multi_day"
                      checked={isMultiDay}
                      onCheckedChange={(checked) => {
                        setIsMultiDay(checked as boolean);
                        if (!checked) {
                          // Clear end_date if switching to single day
                          handleFieldChange('end_date', '');
                        }
                      }}
                    />
                    <Label htmlFor="multi_day">Multi-day event</Label>
                  </div>

                  {!isMultiDay ? (
                    <div>
                      <Label htmlFor="date">Event Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleFieldChange('date', e.target.value)}
                        className="mt-1"
                        required
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Start Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleFieldChange('date', e.target.value)}
                          className="mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_date">End Date *</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => handleFieldChange('end_date', e.target.value)}
                          className="mt-1"
                          required={isMultiDay}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    placeholder="City, State or Virtual"
                    className="mt-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price_range">Price Range</Label>
                    <Input
                      id="price_range"
                      value={formData.price_range}
                      onChange={(e) => handleFieldChange('price_range', e.target.value)}
                      placeholder="e.g., $299-$599"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expected_attendance">Expected Attendance</Label>
                    <select
                      id="expected_attendance"
                      value={formData.expected_attendance}
                      onChange={(e) => handleFieldChange('expected_attendance', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="">Select attendance range</option>
                      {EXPECTED_ATTENDANCE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="duration">Event Duration</Label>
                    <select
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => handleFieldChange('duration', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="">Select duration</option>
                      {DURATION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website">Event Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleFieldChange('website', e.target.value)}
                      placeholder="https://yourevent.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="registration_url">Registration Link</Label>
                    <Input
                      id="registration_url"
                      value={formData.registration_url}
                      onChange={(e) => handleFieldChange('registration_url', e.target.value)}
                      placeholder="Registration URL"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="registration_deadline">Registration Deadline</Label>
                    <Input
                      id="registration_deadline"
                      type="date"
                      value={formData.registration_deadline}
                      onChange={(e) => handleFieldChange('registration_deadline', e.target.value)}
                      placeholder="Registration deadline"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="hotel_block_url">Hotel Block Link</Label>
                    <Input
                      id="hotel_block_url"
                      value={formData.hotel_block_url}
                      onChange={(e) => handleFieldChange('hotel_block_url', e.target.value)}
                      placeholder="Hotel booking link (if available)"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Featured Speakers</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List notable speakers or presenters
                  </p>
                  <SimpleDynamicList
                    items={formData.speaker_profiles || []}
                    onItemsChange={(items) => handleArrayFieldChange('speaker_profiles', items)}
                    placeholder="Enter speaker name and title"
                    buttonText="Add Speaker"
                  />
                </div>

                <div>
                  <Label>Agenda Highlights</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List key sessions or agenda items
                  </p>
                  <SimpleDynamicList
                    items={formData.agenda_highlights || []}
                    onItemsChange={(items) => handleArrayFieldChange('agenda_highlights', items)}
                    placeholder="Enter agenda highlight"
                    buttonText="Add Highlight"
                  />
                </div>

                <div>
                  <Label>Testimonials</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Add testimonials from past attendees
                  </p>
                  <SimpleDynamicList
                    items={formData.past_attendee_testimonials || []}
                    onItemsChange={(items) => handleArrayFieldChange('past_attendee_testimonials', items)}
                    placeholder="Enter testimonial"
                    buttonText="Add Testimonial"
                  />
                </div>

                <div>
                  <Label htmlFor="topics">Key Topics Covered</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List the main topics, themes, or focus areas
                  </p>
                  <textarea
                    id="topics"
                    value={formData.topics}
                    onChange={(e) => handleFieldChange('topics', e.target.value)}
                    placeholder="e.g., Marketing strategies, Revenue growth, Team building"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="success_metrics">Success Metrics</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    How do you measure the success of this event?
                  </p>
                  <textarea
                    id="success_metrics"
                    value={formData.success_metrics}
                    onChange={(e) => handleFieldChange('success_metrics', e.target.value)}
                    placeholder="e.g., Number of connections made, deals closed, satisfaction ratings"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Event Sponsors</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List any sponsors or partners for this event
                  </p>
                  <SimpleDynamicList
                    items={formData.sponsors || []}
                    onItemsChange={(items) => handleArrayFieldChange('sponsors', items)}
                    placeholder="Enter sponsor name"
                    buttonText="Add Sponsor"
                  />
                </div>

                <div>
                  <Label>Pre-Registered Attendees</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Notable companies or individuals already registered
                  </p>
                  <SimpleDynamicList
                    items={formData.pre_registered_attendees || []}
                    onItemsChange={(items) => handleArrayFieldChange('pre_registered_attendees', items)}
                    placeholder="Enter attendee name/company"
                    buttonText="Add Attendee"
                  />
                </div>

                <div>
                  <Label>Networking Opportunities</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Select all networking formats available at your event
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {NETWORKING_OPTIONS.map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.value}
                          checked={formData.networking_opportunities?.includes(option.value) || false}
                          onCheckedChange={() => handleNetworkingToggle(option.value)}
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

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="session_recordings"
                    checked={formData.session_recordings || false}
                    onCheckedChange={(checked) => handleFieldChange('session_recordings', checked)}
                  />
                  <Label htmlFor="session_recordings" className="cursor-pointer">
                    Session recordings will be available after the event
                  </Label>
                </div>

                <div>
                  <Label htmlFor="post_event_support">Post-Event Support</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Describe any support or follow-up provided after the event
                  </p>
                  <textarea
                    id="post_event_support"
                    value={formData.post_event_support}
                    onChange={(e) => handleFieldChange('post_event_support', e.target.value)}
                    placeholder="e.g., Access to recordings, follow-up consultations, implementation guides"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="implementation_support"
                    checked={formData.implementation_support || false}
                    onCheckedChange={(checked) => handleFieldChange('implementation_support', checked)}
                  />
                  <Label htmlFor="implementation_support" className="cursor-pointer">
                    Implementation support is provided after the event
                  </Label>
                </div>

                <div>
                  <Label>Follow-Up Resources</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List resources provided to attendees after the event
                  </p>
                  <SimpleDynamicList
                    items={formData.follow_up_resources || []}
                    onItemsChange={(items) => handleArrayFieldChange('follow_up_resources', items)}
                    placeholder="e.g., Templates, guides, recordings"
                    buttonText="Add Resource"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Contact Information */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <Label>Are you the event organizer?</Label>
                  <div className="flex gap-4 mt-2">
                    <Button
                      type="button"
                      variant={submissionType === 'organizer' ? 'default' : 'outline'}
                      onClick={() => setSubmissionType('organizer')}
                      className={submissionType === 'organizer' ? 'bg-power100-green' : ''}
                    >
                      Yes, I'm the Organizer
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
                  <Label htmlFor="organizer_name">Your Name *</Label>
                  <Input
                    id="organizer_name"
                    value={formData.organizer_name}
                    onChange={(e) => handleFieldChange('organizer_name', e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="organizer_email">Your Email *</Label>
                  <Input
                    id="organizer_email"
                    type="email"
                    value={formData.organizer_email}
                    onChange={(e) => handleFieldChange('organizer_email', e.target.value)}
                    placeholder="your@email.com"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="organizer_phone">Your Phone Number</Label>
                  <Input
                    id="organizer_phone"
                    type="tel"
                    value={formData.organizer_phone}
                    onChange={(e) => handleFieldChange('organizer_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="organizer_company">Your Company</Label>
                  <Input
                    id="organizer_company"
                    value={formData.organizer_company}
                    onChange={(e) => handleFieldChange('organizer_company', e.target.value)}
                    placeholder="Company name (if applicable)"
                    className="mt-1"
                  />
                </div>

                {/* POC Fields */}
                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-4">Event Points of Contact</h3>
                  
                  <div className="space-y-6">
                    {/* Customer Experience POC */}
                    <div>
                      <h4 className="font-medium mb-3">Customer Experience POC</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="poc_customer_name">Name</Label>
                          <Input
                            id="poc_customer_name"
                            value={formData.poc_customer_name}
                            onChange={(e) => handleFieldChange('poc_customer_name', e.target.value)}
                            placeholder="POC name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="poc_customer_email">Email</Label>
                          <Input
                            id="poc_customer_email"
                            type="email"
                            value={formData.poc_customer_email}
                            onChange={(e) => handleFieldChange('poc_customer_email', e.target.value)}
                            placeholder="POC email"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="poc_customer_phone">Phone</Label>
                          <Input
                            id="poc_customer_phone"
                            value={formData.poc_customer_phone}
                            onChange={(e) => handleFieldChange('poc_customer_phone', e.target.value)}
                            placeholder="POC phone"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Media/Promotion POC */}
                    <div>
                      <h4 className="font-medium mb-3">Media/Promotion/Social POC</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="poc_media_name">Name</Label>
                          <Input
                            id="poc_media_name"
                            value={formData.poc_media_name}
                            onChange={(e) => handleFieldChange('poc_media_name', e.target.value)}
                            placeholder="POC name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="poc_media_email">Email</Label>
                          <Input
                            id="poc_media_email"
                            type="email"
                            value={formData.poc_media_email}
                            onChange={(e) => handleFieldChange('poc_media_email', e.target.value)}
                            placeholder="POC email"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="poc_media_phone">Phone</Label>
                          <Input
                            id="poc_media_phone"
                            value={formData.poc_media_phone}
                            onChange={(e) => handleFieldChange('poc_media_phone', e.target.value)}
                            placeholder="POC phone"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
                  {loading ? 'Submitting...' : 'Submit Event'}
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