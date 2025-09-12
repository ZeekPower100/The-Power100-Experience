'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SimpleDynamicList } from '@/components/ui/simple-dynamic-list';
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

const NETWORKING_QUALITY_OPTIONS = [
  { value: 'excellent', label: 'Excellent (9-10)' },
  { value: 'very_good', label: 'Very Good (7-8)' },
  { value: 'good', label: 'Good (5-6)' },
  { value: 'fair', label: 'Fair (3-4)' },
  { value: 'poor', label: 'Poor (1-2)' }
];

export default function EventForm({ event, onSuccess, onCancel }: EventFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionType, setSubmissionType] = useState<'organizer' | 'team_member'>('team_member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debug logging
  if (event) {
    console.log('EventForm received event:', event);
    console.log('Event date raw:', event.date);
    console.log('Event end_date raw:', event.end_date);
    console.log('Event registration_deadline raw:', event.registration_deadline);
  }
  
  // Helper function to format date for input field
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return '';
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.log(`Date ${dateString} is already in correct format`);
      return dateString;
    }
    // Otherwise, parse and format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.log(`Could not parse date: ${dateString}`);
      return '';
    }
    const formatted = date.toISOString().split('T')[0];
    console.log(`Formatted date from ${dateString} to ${formatted}`);
    return formatted;
  };
  
  // Form data state
  const [isMultiDay, setIsMultiDay] = useState(!!event?.end_date);
  const [formData, setFormData] = useState<Event>({
    name: event?.name || '',
    date: formatDateForInput(event?.date),
    end_date: formatDateForInput(event?.end_date),
    registration_deadline: formatDateForInput(event?.registration_deadline),
    location: event?.location || '',
    format: event?.format || '',
    description: event?.description || '',
    expected_attendance: event?.expected_attendance || '',
    website: event?.website || '',
    logo_url: event?.logo_url || '',
    
    // New fields
    target_audience: event?.target_audience || '',
    target_revenue: event?.target_revenue || '',
    topics: event?.topics || '',
    price_range: event?.price_range || '',
    registration_url: event?.registration_url || '',
    hotel_block_url: event?.hotel_block_url || '',
    
    // Organizer info
    organizer_name: event?.organizer_name || '',
    organizer_email: event?.organizer_email || '',
    organizer_phone: event?.organizer_phone || '',
    organizer_company: event?.organizer_company || '',
    
    // POC Fields (NEW from Greg)
    poc_customer_name: event?.poc_customer_name || '',
    poc_customer_email: event?.poc_customer_email || '',
    poc_customer_phone: event?.poc_customer_phone || '',
    poc_media_name: event?.poc_media_name || '',
    poc_media_email: event?.poc_media_email || '',
    poc_media_phone: event?.poc_media_phone || '',
    
    // Event details
    event_type: event?.event_type || '',
    duration: event?.duration || '',
    
    // Success metrics
    past_attendee_testimonials: event?.past_attendee_testimonials || '',
    success_metrics: event?.success_metrics || '',
    speaker_profiles: event?.speaker_profiles || '',
    sponsors: event?.sponsors || '',
    pre_registered_attendees: event?.pre_registered_attendees || '',
    networking_opportunities: event?.networking_opportunities || '',
    networking_quality_score: event?.networking_quality_score || '',
    session_recordings: event?.session_recordings || false,
    post_event_support: event?.post_event_support || '',
    implementation_support: event?.implementation_support || false,
    follow_up_resources: event?.follow_up_resources || '',
    
    is_active: event?.is_active !== undefined ? event.is_active : true,
  });

  // Selected focus areas (for multi-select)
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(
    event?.focus_areas_covered ? event.focus_areas_covered.split(',').map(f => f.trim()) : []
  );

  // Selected target revenue (for multi-select)
  const [selectedTargetRevenue, setSelectedTargetRevenue] = useState<string[]>(() => {
    if (event?.target_revenue) {
      try {
        const parsed = JSON.parse(event.target_revenue);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return event.target_revenue.split(',').map(r => r.trim());
      }
    }
    return [];
  });

  // Dynamic list fields
  const [speakers, setSpeakers] = useState<string[]>(
    event?.speaker_profiles ? 
      (typeof event.speaker_profiles === 'string' ? 
        (event.speaker_profiles.startsWith('[') ? JSON.parse(event.speaker_profiles) : event.speaker_profiles.split(',').map(s => s.trim())) : 
        Array.isArray(event.speaker_profiles) ? event.speaker_profiles : []
      ) : []
  );

  const [agendaHighlights, setAgendaHighlights] = useState<string[]>(
    event?.agenda_highlights ? 
      (typeof event.agenda_highlights === 'string' ? 
        (event.agenda_highlights.startsWith('[') ? JSON.parse(event.agenda_highlights) : event.agenda_highlights.split(',').map(a => a.trim())) : 
        Array.isArray(event.agenda_highlights) ? event.agenda_highlights : []
      ) : []
  );

  const [testimonials, setTestimonials] = useState<string[]>(
    event?.past_attendee_testimonials ? 
      (typeof event.past_attendee_testimonials === 'string' ? 
        (event.past_attendee_testimonials.startsWith('[') ? JSON.parse(event.past_attendee_testimonials) : event.past_attendee_testimonials.split(',').map(t => t.trim())) : 
        Array.isArray(event.past_attendee_testimonials) ? event.past_attendee_testimonials : []
      ) : []
  );

  const [sponsors, setSponsors] = useState<string[]>(
    event?.sponsors ? 
      (typeof event.sponsors === 'string' ? 
        (event.sponsors.startsWith('[') ? JSON.parse(event.sponsors) : event.sponsors.split(',').map(s => s.trim())) : 
        Array.isArray(event.sponsors) ? event.sponsors : []
      ) : []
  );

  const [preRegisteredAttendees, setPreRegisteredAttendees] = useState<string[]>(
    event?.pre_registered_attendees ? 
      (typeof event.pre_registered_attendees === 'string' ? 
        (event.pre_registered_attendees.startsWith('[') ? JSON.parse(event.pre_registered_attendees) : event.pre_registered_attendees.split(',').map(a => a.trim())) : 
        Array.isArray(event.pre_registered_attendees) ? event.pre_registered_attendees : []
      ) : []
  );

  const [selectedNetworkingOpportunities, setSelectedNetworkingOpportunities] = useState<string[]>(
    event?.networking_opportunities ? 
      (typeof event.networking_opportunities === 'string' ? 
        JSON.parse(event.networking_opportunities) : 
        Array.isArray(event.networking_opportunities) ? event.networking_opportunities : []
      ) : []
  );

  const [followUpResources, setFollowUpResources] = useState<string[]>(
    event?.follow_up_resources ? 
      (typeof event.follow_up_resources === 'string' ? 
        JSON.parse(event.follow_up_resources) : 
        Array.isArray(event.follow_up_resources) ? event.follow_up_resources : []
      ) : []
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

  const handleTargetRevenueToggle = (revenue: string) => {
    setSelectedTargetRevenue(prev => 
      prev.includes(revenue) 
        ? prev.filter(r => r !== revenue)
        : [...prev, revenue]
    );
  };

  const handleNetworkingToggle = (opportunity: string) => {
    setSelectedNetworkingOpportunities(prev => 
      prev.includes(opportunity) 
        ? prev.filter(o => o !== opportunity)
        : [...prev, opportunity]
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
        target_revenue: JSON.stringify(selectedTargetRevenue),
        speaker_profiles: JSON.stringify(speakers.filter(s => s.trim())),
        agenda_highlights: JSON.stringify(agendaHighlights.filter(a => a.trim())),
        past_attendee_testimonials: JSON.stringify(testimonials.filter(t => t.trim())),
        sponsors: JSON.stringify(sponsors.filter(s => s.trim())),
        pre_registered_attendees: JSON.stringify(preRegisteredAttendees.filter(a => a.trim())),
        networking_opportunities: JSON.stringify(selectedNetworkingOpportunities),
        follow_up_resources: JSON.stringify(followUpResources.filter(r => r.trim())),
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
                <Label htmlFor="name">Event Name <span className="text-red-500">*</span></Label>
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
                <Label htmlFor="event_type">Event Type</Label>
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
                    <SelectItem value="Seminar">Seminar</SelectItem>
                    <SelectItem value="Webinar">Webinar</SelectItem>
                    <SelectItem value="Networking">Networking Event</SelectItem>
                    <SelectItem value="Training">Training Program</SelectItem>
                    <SelectItem value="Summit">Summit</SelectItem>
                    <SelectItem value="Bootcamp">Bootcamp</SelectItem>
                    <SelectItem value="Retreat">Retreat</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="multi_day"
                    checked={isMultiDay}
                    onCheckedChange={(checked) => {
                      setIsMultiDay(checked as boolean);
                      if (!checked) {
                        setFormData(prev => ({ ...prev, end_date: '' }));
                      }
                    }}
                  />
                  <Label htmlFor="multi_day">Multi-day event</Label>
                </div>

                {!isMultiDay ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Event Date <span className="text-red-500">*</span></Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="registration_deadline">Registration Deadline</Label>
                      <Input
                        id="registration_deadline"
                        name="registration_deadline"
                        type="date"
                        value={formData.registration_deadline}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="date">Start Date <span className="text-red-500">*</span></Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end_date">End Date <span className="text-red-500">*</span></Label>
                      <Input
                        id="end_date"
                        name="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="registration_deadline">Registration Deadline</Label>
                      <Input
                        id="registration_deadline"
                        name="registration_deadline"
                        type="date"
                        value={formData.registration_deadline}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="duration">Duration</Label>
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
                <Label htmlFor="description">Event Description</Label>
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
                <Label>Event Logo</Label>
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
                <Label htmlFor="location">Location</Label>
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
                <Label htmlFor="format">Event Format</Label>
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
                <Label htmlFor="expected_attendance">Expected Attendance</Label>
                <Select 
                  value={formData.expected_attendance} 
                  onValueChange={(value) => handleSelectChange('expected_attendance', value)}
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
                <Label htmlFor="price_range">Price Range</Label>
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
                <Label htmlFor="registration_url">Registration URL</Label>
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
                <Label htmlFor="hotel_block_url">Hotel Block URL</Label>
                <Input
                  id="hotel_block_url"
                  name="hotel_block_url"
                  value={formData.hotel_block_url}
                  onChange={handleInputChange}
                  placeholder="Hotel booking link (if available)"
                />
                <p className="text-sm text-power100-grey mt-1">Special rate hotel booking link</p>
              </div>

              <div>
                <Label htmlFor="website">Event Website</Label>
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
                <Label>What contractor challenges does this event address?</Label>
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
                <Label>Target Revenue Range</Label>
                <p className="text-sm text-power100-grey mb-3">What revenue ranges should attendees be in?</p>
                <div className="grid grid-cols-2 gap-3">
                  {TARGET_REVENUE_OPTIONS.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`revenue-${option.value}`}
                        checked={selectedTargetRevenue.includes(option.value)}
                        onCheckedChange={() => handleTargetRevenueToggle(option.value)}
                      />
                      <Label htmlFor={`revenue-${option.value}`} className="font-normal cursor-pointer">
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
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleInputChange}
                  placeholder="Who should attend this event? (e.g., contractors with $5M-$20M revenue looking to scale)"
                  rows={3}
                />
                <p className="text-sm text-power100-grey mt-1">Helps us match with appropriate contractors</p>
              </div>

              <div>
                <Label htmlFor="topics">Key Topics Covered</Label>
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

              <div>
                <Label>Speakers & Presenters</Label>
                <p className="text-sm text-power100-grey mb-2">List notable speakers or presenters</p>
                <SimpleDynamicList
                  items={speakers}
                  onItemsChange={setSpeakers}
                  placeholder="Enter speaker name and title"
                  buttonText="Add Speaker"
                />
              </div>

              <div>
                <Label>Agenda Highlights</Label>
                <p className="text-sm text-power100-grey mb-2">List key sessions or agenda items</p>
                <SimpleDynamicList
                  items={agendaHighlights}
                  onItemsChange={setAgendaHighlights}
                  placeholder="Enter agenda highlight"
                  buttonText="Add Highlight"
                />
              </div>

              <div>
                <Label>Past Attendee Testimonials</Label>
                <p className="text-sm text-power100-grey mb-2">Add testimonials from past attendees</p>
                <SimpleDynamicList
                  items={testimonials}
                  onItemsChange={setTestimonials}
                  placeholder="Enter testimonial"
                  buttonText="Add Testimonial"
                />
              </div>

              <div>
                <Label htmlFor="success_metrics">Success Metrics</Label>
                <Textarea
                  id="success_metrics"
                  name="success_metrics"
                  value={formData.success_metrics}
                  onChange={handleInputChange}
                  placeholder="How do you measure event success? (e.g., connections made, deals closed, satisfaction ratings)"
                  rows={3}
                />
                <p className="text-sm text-power100-grey mt-1">Metrics help demonstrate ROI to contractors</p>
              </div>

              <div>
                <Label>Event Sponsors</Label>
                <p className="text-sm text-power100-grey mb-2">List sponsors or partners</p>
                <SimpleDynamicList
                  items={sponsors}
                  onItemsChange={setSponsors}
                  placeholder="Enter sponsor name"
                  buttonText="Add Sponsor"
                />
              </div>

              <div>
                <Label>Pre-Registered Attendees</Label>
                <p className="text-sm text-power100-grey mb-2">Notable companies or individuals already registered</p>
                <SimpleDynamicList
                  items={preRegisteredAttendees}
                  onItemsChange={setPreRegisteredAttendees}
                  placeholder="Enter attendee name/company"
                  buttonText="Add Attendee"
                />
              </div>

              <div>
                <Label>Networking Opportunities</Label>
                <p className="text-sm text-power100-grey mb-2">Select all networking formats available</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {NETWORKING_OPTIONS.map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`networking-${option.value}`}
                        checked={selectedNetworkingOpportunities.includes(option.value)}
                        onCheckedChange={() => handleNetworkingToggle(option.value)}
                      />
                      <Label htmlFor={`networking-${option.value}`} className="font-normal cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="networking_quality_score">Networking Quality Score (Admin Only)</Label>
                <Select 
                  value={formData.networking_quality_score} 
                  onValueChange={(value) => handleSelectChange('networking_quality_score', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select quality score" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {NETWORKING_QUALITY_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-power100-grey mt-1">TPE assessment based on past events</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="session_recordings"
                  checked={formData.session_recordings || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, session_recordings: checked as boolean }))}
                />
                <Label htmlFor="session_recordings" className="cursor-pointer">
                  Session recordings will be available after the event
                </Label>
              </div>

              <div>
                <Label htmlFor="post_event_support">Post-Event Support</Label>
                <Textarea
                  id="post_event_support"
                  name="post_event_support"
                  value={formData.post_event_support}
                  onChange={handleInputChange}
                  placeholder="Describe any support or follow-up provided after the event"
                  rows={3}
                />
                <p className="text-sm text-power100-grey mt-1">What support do attendees receive after the event?</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="implementation_support"
                  checked={formData.implementation_support || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, implementation_support: checked as boolean }))}
                />
                <Label htmlFor="implementation_support" className="cursor-pointer">
                  Implementation support is provided after the event
                </Label>
              </div>

              <div>
                <Label>Follow-Up Resources</Label>
                <p className="text-sm text-power100-grey mb-2">Resources provided to attendees after the event</p>
                <SimpleDynamicList
                  items={followUpResources}
                  onItemsChange={setFollowUpResources}
                  placeholder="e.g., Templates, guides, recordings"
                  buttonText="Add Resource"
                />
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
                <Label htmlFor="organizer_name">Organizer Name</Label>
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
                  Organizer Email {submissionType === 'organizer' && <span className="text-red-500">*</span>}
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
                <Label htmlFor="organizer_phone">Organizer Phone</Label>
                <Input
                  id="organizer_phone"
                  name="organizer_phone"
                  value={formData.organizer_phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="organizer_company">Organizing Company</Label>
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

            {/* POC Customer Experience Fields */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-power100-black mb-4">Customer Experience POC</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="poc_customer_name">POC Name</Label>
                  <Input
                    id="poc_customer_name"
                    name="poc_customer_name"
                    value={formData.poc_customer_name}
                    onChange={handleInputChange}
                    placeholder="Customer experience contact name"
                  />
                </div>
                <div>
                  <Label htmlFor="poc_customer_email">POC Email</Label>
                  <Input
                    id="poc_customer_email"
                    name="poc_customer_email"
                    type="email"
                    value={formData.poc_customer_email}
                    onChange={handleInputChange}
                    placeholder="customer.poc@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="poc_customer_phone">POC Phone</Label>
                  <Input
                    id="poc_customer_phone"
                    name="poc_customer_phone"
                    value={formData.poc_customer_phone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            {/* POC Media Fields */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-power100-black mb-4">Media/Promotion/Social POC</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="poc_media_name">POC Name</Label>
                  <Input
                    id="poc_media_name"
                    name="poc_media_name"
                    value={formData.poc_media_name}
                    onChange={handleInputChange}
                    placeholder="Media contact name"
                  />
                </div>
                <div>
                  <Label htmlFor="poc_media_email">POC Email</Label>
                  <Input
                    id="poc_media_email"
                    name="poc_media_email"
                    type="email"
                    value={formData.poc_media_email}
                    onChange={handleInputChange}
                    placeholder="media.poc@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="poc_media_phone">POC Phone</Label>
                  <Input
                    id="poc_media_phone"
                    name="poc_media_phone"
                    value={formData.poc_media_phone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                  />
                </div>
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