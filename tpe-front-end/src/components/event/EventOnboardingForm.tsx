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
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'networking', label: 'Networking Event' },
  { value: 'training', label: 'Training Program' },
  { value: 'summit', label: 'Summit' },
  { value: 'retreat', label: 'Retreat' },
  { value: 'other', label: 'Other' }
];

const EVENT_FORMAT_OPTIONS = [
  { value: 'in_person', label: 'In-Person' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hybrid', label: 'Hybrid' }
];

export default function EventOnboardingForm() {
  const router = useRouter();
  const totalSteps = 4;
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionType, setSubmissionType] = useState<'organizer' | 'team_member'>('organizer');

  // Form data state
  const [formData, setFormData] = useState<Partial<Event>>({
    name: '',
    organizer: '',
    description: '',
    event_type: '',
    format: '',
    start_date: '',
    end_date: '',
    location: '',
    website_url: '',
    registration_url: '',
    focus_areas: [],
    target_revenue: [],
    speakers: [],
    agenda_highlights: [],
    past_attendees: [],
    testimonials: [],
    price_range: '',
    expected_attendance: 0,
    event_image_url: '',
    submitter_name: '',
    submitter_email: '',
    submitter_phone: '',
    submitter_company: '',
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
    const currentAreas = formData.focus_areas || [];
    if (currentAreas.includes(area)) {
      handleArrayFieldChange('focus_areas', currentAreas.filter(a => a !== area));
    } else {
      handleArrayFieldChange('focus_areas', [...currentAreas, area]);
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
        // Map organizer fields
        organizer_name: formData.submitter_name,
        organizer_email: formData.submitter_email,
        organizer_phone: formData.submitter_phone,
        organizer_company: formData.submitter_company,
        // Map field names to what backend expects
        speaker_profiles: JSON.stringify(formData.speakers || []),
        past_attendee_testimonials: JSON.stringify(formData.testimonials || []),
        agenda_highlights: JSON.stringify(formData.agenda_highlights || []),
        focus_areas_covered: formData.focus_areas?.join(', ') || '',
        logo_url: formData.event_image_url,
        expected_attendees: formData.expected_attendance,
        date: formData.start_date,
        registration_deadline: formData.end_date,
        // Remove original array fields to avoid conflicts
        speakers: undefined,
        testimonials: undefined,
        // Keep original fields too for compatibility
        is_organizer: submissionType === 'organizer',
        status: 'pending_review'
      };

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
                  <Label htmlFor="organizer">Event Organizer *</Label>
                  <Input
                    id="organizer"
                    value={formData.organizer}
                    onChange={(e) => handleFieldChange('organizer', e.target.value)}
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
                          checked={formData.focus_areas?.includes(area.value) || false}
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
              </div>
            )}

            {/* Step 3: Event Details & Content */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleFieldChange('start_date', e.target.value)}
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleFieldChange('end_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>
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
                    <Input
                      id="expected_attendance"
                      type="number"
                      value={formData.expected_attendance}
                      onChange={(e) => handleFieldChange('expected_attendance', parseInt(e.target.value) || 0)}
                      placeholder="Number of attendees"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website_url">Event Website</Label>
                    <Input
                      id="website_url"
                      value={formData.website_url}
                      onChange={(e) => handleFieldChange('website_url', e.target.value)}
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
                </div>

                <div>
                  <Label>Featured Speakers</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List notable speakers or presenters
                  </p>
                  <SimpleDynamicList
                    items={formData.speakers || []}
                    onItemsChange={(items) => handleArrayFieldChange('speakers', items)}
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
                    items={formData.testimonials || []}
                    onItemsChange={(items) => handleArrayFieldChange('testimonials', items)}
                    placeholder="Enter testimonial"
                    buttonText="Add Testimonial"
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