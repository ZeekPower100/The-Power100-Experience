'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, MapPin, Users, DollarSign, Phone, X } from 'lucide-react';
import { Event } from '@/lib/types/event';
import LogoManager from '@/components/admin/LogoManager';

interface EventFormProps {
  event?: Event;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Same focus areas as partners and books for consistency
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

export default function EventForm({ event, onSuccess, onCancel }: EventFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionType, setSubmissionType] = useState<'organizer' | 'team_member'>('team_member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data state
  const [formData, setFormData] = useState<Event>({
    name: event?.name || '',
    date: event?.date || '',
    registration_deadline: event?.registration_deadline || '',
    location: event?.location || '',
    format: event?.format || '',
    description: event?.description || '',
    expected_attendees: event?.expected_attendees || '',
    website: event?.website || '',
    logo_url: event?.logo_url || '',
    
    // New fields
    target_audience: event?.target_audience || '',
    topics: event?.topics || '',
    price_range: event?.price_range || '',
    registration_url: event?.registration_url || '',
    
    // Organizer info
    organizer_name: event?.organizer_name || '',
    organizer_email: event?.organizer_email || '',
    organizer_phone: event?.organizer_phone || '',
    organizer_company: event?.organizer_company || '',
    
    // Event details
    event_type: event?.event_type || '',
    duration: event?.duration || '',
    
    // Success metrics
    past_attendee_testimonials: event?.past_attendee_testimonials || '',
    success_metrics: event?.success_metrics || '',
    speaker_profiles: event?.speaker_profiles || '',
    networking_quality_score: event?.networking_quality_score || '',
    
    is_active: event?.is_active !== undefined ? event.is_active : true,
  });

  // Selected focus areas (for multi-select)
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(
    event?.focus_areas_covered ? event.focus_areas_covered.split(',').map(f => f.trim()) : []
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFocusAreaToggle = (area: string) => {
    setSelectedFocusAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const handleSubmit = async (isDraft = false) => {
    setLoading(true);
    setError(null);

    try {
      // Prepare data for submission
      const dataToSubmit = {
        ...formData,
        focus_areas_covered: selectedFocusAreas.join(', '),
        submission_type: submissionType,
        // Set status based on whether it's a draft save or submission
        // If saving as draft, mark as 'draft'
        // If submitting (not draft), always mark as 'published' (even if it was previously a draft)
        status: isDraft ? 'draft' : 'published',
      };

      // Remove empty fields to keep data clean
      Object.keys(dataToSubmit).forEach(key => {
        if (dataToSubmit[key as keyof Event] === '' || dataToSubmit[key as keyof Event] === undefined) {
          delete dataToSubmit[key as keyof Event];
        }
      });

      const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/events${event?.id ? `/${event.id}` : ''}`, {
        method: event?.id ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        throw new Error('Failed to save event');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/admindashboard/events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Event Information</h2>
              <p className="text-power100-grey mt-2">
                The more information you provide, the better we can match your event with interested contractors.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Event Name (optional)</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter event name"
                />
                <p className="text-sm text-power100-grey mt-1">This is how contractors will find your event</p>
              </div>

              <div>
                <Label htmlFor="event_type">Event Type (optional)</Label>
                <Select 
                  value={formData.event_type} 
                  onValueChange={(value) => handleSelectChange('event_type', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Conference">Conference</SelectItem>
                    <SelectItem value="Workshop">Workshop</SelectItem>
                    <SelectItem value="Summit">Summit</SelectItem>
                    <SelectItem value="Bootcamp">Bootcamp</SelectItem>
                    <SelectItem value="Seminar">Seminar</SelectItem>
                    <SelectItem value="Networking">Networking Event</SelectItem>
                    <SelectItem value="Training">Training Program</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Event Date (optional)</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="registration_deadline">Registration Deadline (optional)</Label>
                  <Input
                    id="registration_deadline"
                    name="registration_deadline"
                    type="date"
                    value={formData.registration_deadline}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="duration">Duration (optional)</Label>
                <Select 
                  value={formData.duration} 
                  onValueChange={(value) => handleSelectChange('duration', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Half day">Half Day</SelectItem>
                    <SelectItem value="1 day">1 Day</SelectItem>
                    <SelectItem value="2 days">2 Days</SelectItem>
                    <SelectItem value="3 days">3 Days</SelectItem>
                    <SelectItem value="1 week">1 Week</SelectItem>
                    <SelectItem value="Multiple weeks">Multiple Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Event Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of what the event covers"
                  rows={4}
                />
              </div>

              <div>
                <Label>Event Logo (optional)</Label>
                <p className="text-sm text-power100-grey mb-3">Upload a logo for your event</p>
                <LogoManager
                  currentLogoUrl={formData.logo_url}
                  onLogoChange={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
                  entityType="event"
                  entityName={formData.name || 'event'}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-power100-green rounded-full flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Location & Format</h2>
              <p className="text-power100-grey mt-2">
                Help contractors understand how and where to attend
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="City, State or Virtual"
                />
                <p className="text-sm text-power100-grey mt-1">Physical location or "Virtual" for online events</p>
              </div>

              <div>
                <Label htmlFor="format">Event Format (optional)</Label>
                <Select 
                  value={formData.format} 
                  onValueChange={(value) => handleSelectChange('format', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="In-person">In-person</SelectItem>
                    <SelectItem value="Virtual">Virtual</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="expected_attendees">Expected Attendees (optional)</Label>
                <Select 
                  value={formData.expected_attendees} 
                  onValueChange={(value) => handleSelectChange('expected_attendees', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select expected attendance" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="1-50">1-50</SelectItem>
                    <SelectItem value="51-100">51-100</SelectItem>
                    <SelectItem value="101-250">101-250</SelectItem>
                    <SelectItem value="251-500">251-500</SelectItem>
                    <SelectItem value="500+">500+</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-power100-grey mt-1">Helps set expectations for networking opportunities</p>
              </div>

              <div>
                <Label htmlFor="price_range">Price Range (optional)</Label>
                <Input
                  id="price_range"
                  name="price_range"
                  value={formData.price_range}
                  onChange={handleInputChange}
                  placeholder="e.g., $299-$499 or Free"
                />
                <p className="text-sm text-power100-grey mt-1">Investment required to attend</p>
              </div>

              <div>
                <Label htmlFor="registration_url">Registration URL (optional)</Label>
                <Input
                  id="registration_url"
                  name="registration_url"
                  value={formData.registration_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/register"
                />
                <p className="text-sm text-power100-grey mt-1">Direct link for contractors to register</p>
              </div>

              <div>
                <Label htmlFor="website">Event Website (optional)</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Target Audience & Focus</h2>
              <p className="text-power100-grey mt-2">
                Define who should attend and what they'll learn
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>What contractor challenges does this event address? (optional)</Label>
                <p className="text-sm text-power100-grey mb-3">Ensures your event reaches the right contractors</p>
                <div className="grid grid-cols-2 gap-3">
                  {FOCUS_AREAS.map(area => (
                    <div key={area.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={area.value}
                        checked={selectedFocusAreas.includes(area.value)}
                        onCheckedChange={() => handleFocusAreaToggle(area.value)}
                      />
                      <Label htmlFor={area.value} className="font-normal cursor-pointer">
                        {area.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="target_audience">Target Audience (optional)</Label>
                <Textarea
                  id="target_audience"
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleInputChange}
                  placeholder="Who should attend this event? (e.g., contractors with $5M-$20M revenue looking to scale)"
                  rows={3}
                />
                <p className="text-sm text-power100-grey mt-1">Helps us match with appropriate contractors</p>
              </div>

              <div>
                <Label htmlFor="topics">Key Topics Covered (optional)</Label>
                <Textarea
                  id="topics"
                  name="topics"
                  value={formData.topics}
                  onChange={handleInputChange}
                  placeholder="List the main topics, sessions, or speakers"
                  rows={3}
                />
                <p className="text-sm text-power100-grey mt-1">Specific topics help contractors evaluate relevance</p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-power100-green rounded-full flex items-center justify-center">
                  <Phone className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Organizer Information</h2>
              <p className="text-power100-grey mt-2">
                Contact details for questions and partnerships
              </p>
            </div>

            <div className="mb-4">
              <Label>Who is submitting this event?</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  type="button"
                  variant={submissionType === 'team_member' ? 'default' : 'outline'}
                  onClick={() => setSubmissionType('team_member')}
                  className={submissionType === 'team_member' ? 'bg-power100-green' : ''}
                >
                  Team Member
                </Button>
                <Button
                  type="button"
                  variant={submissionType === 'organizer' ? 'default' : 'outline'}
                  onClick={() => setSubmissionType('organizer')}
                  className={submissionType === 'organizer' ? 'bg-power100-green' : ''}
                >
                  Event Organizer
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="organizer_name">Organizer Name (optional)</Label>
                <Input
                  id="organizer_name"
                  name="organizer_name"
                  value={formData.organizer_name}
                  onChange={handleInputChange}
                  placeholder="Primary contact name"
                />
              </div>

              <div>
                <Label htmlFor="organizer_email">
                  Organizer Email {submissionType === 'organizer' && '(required)'}
                </Label>
                <Input
                  id="organizer_email"
                  name="organizer_email"
                  type="email"
                  value={formData.organizer_email}
                  onChange={handleInputChange}
                  placeholder="organizer@example.com"
                  required={submissionType === 'organizer'}
                />
                <p className="text-sm text-power100-grey mt-1">For partnership opportunities</p>
              </div>

              <div>
                <Label htmlFor="organizer_phone">Organizer Phone (optional)</Label>
                <Input
                  id="organizer_phone"
                  name="organizer_phone"
                  value={formData.organizer_phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="organizer_company">Organizing Company (optional)</Label>
                <Input
                  id="organizer_company"
                  name="organizer_company"
                  value={formData.organizer_company}
                  onChange={handleInputChange}
                  placeholder="Company or organization name"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-green-800 font-semibold mb-2">Events with complete profiles get 3x more visibility</p>
                <p className="text-green-700 text-sm">You can always enhance the profile later with success stories and testimonials</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey flex items-center justify-center py-8">
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 relative">
          {/* Cancel button */}
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel || (() => router.push('/admindashboard/events'))}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100"
            aria-label="Cancel"
          >
            <X className="h-8 w-8" />
          </Button>

          {/* Progress indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4].map(step => (
                <React.Fragment key={step}>
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      step === currentStep 
                        ? 'bg-power100-green text-white' 
                        : step < currentStep 
                        ? 'bg-power100-green/20 text-power100-green'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-12 h-1 ${
                      step < currentStep ? 'bg-power100-green/20' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {renderStepContent()}

          {/* Navigation buttons */}
          <div className="flex gap-4 mt-8">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex-1 bg-white border-2 border-gray-200 text-power100-black hover:bg-gray-50"
              >
                Back
              </Button>
            )}
            
            {currentStep < 4 ? (
              <>
                <Button
                  type="button"
                  className="flex-1 bg-power100-green hover:bg-green-600 text-white font-semibold"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                >
                  Continue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="bg-white border-2 border-power100-green text-power100-green hover:bg-green-50"
                >
                  {loading ? 'Saving...' : 'Save as Draft'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={loading || (submissionType === 'organizer' && !formData.organizer_email)}
                  className="flex-1 bg-power100-green hover:bg-green-600 text-white font-semibold"
                >
                  {loading ? 'Submitting...' : 'Submit Event'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={loading || (submissionType === 'organizer' && !formData.organizer_email)}
                  className="bg-white border-2 border-power100-green text-power100-green hover:bg-green-50"
                >
                  {loading ? 'Saving...' : 'Save as Draft'}
                </Button>
              </>
            )}
          </div>

          {/* Skip to contact info option on first page */}
          {currentStep === 1 && (
            <div className="text-center mt-4">
              <Button
                type="button"
                variant="link"
                onClick={() => setCurrentStep(4)}
                className="text-power100-grey hover:text-power100-black"
              >
                Skip to Organizer Info →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}