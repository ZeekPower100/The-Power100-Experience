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
import { Mic, Headphones, Users, BarChart, Phone, X } from 'lucide-react';
import { Podcast } from '@/lib/types/podcast';
import LogoManager from '@/components/admin/LogoManager';

interface PodcastFormProps {
  podcast?: Podcast;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Same focus areas for consistency
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

export default function PodcastForm({ podcast, onSuccess, onCancel }: PodcastFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionType, setSubmissionType] = useState<'host' | 'team_member'>('team_member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data state
  const [formData, setFormData] = useState<Podcast>({
    title: podcast?.title || '',
    host: podcast?.host || '',
    frequency: podcast?.frequency || '',
    description: podcast?.description || '',
    website: podcast?.website || '',
    logo_url: podcast?.logo_url || '',
    target_audience: podcast?.target_audience || '',
    topics: podcast?.topics || '',
    
    // New fields
    episode_count: podcast?.episode_count || '',
    average_episode_length: podcast?.average_episode_length || '',
    format: podcast?.format || '',
    
    // Host info
    host_email: podcast?.host_email || '',
    host_phone: podcast?.host_phone || '',
    host_linkedin: podcast?.host_linkedin || '',
    host_company: podcast?.host_company || '',
    host_bio: podcast?.host_bio || '',
    
    // Platforms
    spotify_url: podcast?.spotify_url || '',
    apple_podcasts_url: podcast?.apple_podcasts_url || '',
    youtube_url: podcast?.youtube_url || '',
    other_platform_urls: podcast?.other_platform_urls || '',
    
    // Guest opportunities
    accepts_guest_requests: podcast?.accepts_guest_requests || false,
    guest_requirements: podcast?.guest_requirements || '',
    typical_guest_profile: podcast?.typical_guest_profile || '',
    booking_link: podcast?.booking_link || '',
    
    // Success metrics
    subscriber_count: podcast?.subscriber_count || '',
    download_average: podcast?.download_average || '',
    notable_guests: podcast?.notable_guests || '',
    testimonials: podcast?.testimonials || '',
    
    // Submitter information
    submitter_name: podcast?.submitter_name || '',
    submitter_email: podcast?.submitter_email || '',
    submitter_phone: podcast?.submitter_phone || '',
    submitter_company: podcast?.submitter_company || '',
    is_host: podcast?.is_host || false,
    
    // Additional fields
    target_revenue: podcast?.target_revenue || '',
    total_episodes: podcast?.total_episodes || '',
    
    is_active: podcast?.is_active !== undefined ? podcast.is_active : true,
  });

  // Selected focus areas (for multi-select)
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(
    podcast?.focus_areas_covered ? podcast.focus_areas_covered.split(',').map(f => f.trim()) : []
  );

  // Notable guests and key topics (array fields)
  const [notableGuests, setNotableGuests] = useState<string[]>(
    podcast?.notable_guests ? 
      (typeof podcast.notable_guests === 'string' ? 
        (podcast.notable_guests.startsWith('[') ? JSON.parse(podcast.notable_guests) : podcast.notable_guests.split(',').map(g => g.trim())) : 
        Array.isArray(podcast.notable_guests) ? podcast.notable_guests : []
      ) : []
  );

  const [keyTopics, setKeyTopics] = useState<string[]>(
    podcast?.topics ? 
      (typeof podcast.topics === 'string' ? 
        (podcast.topics.startsWith('[') ? JSON.parse(podcast.topics) : podcast.topics.split(',').map(t => t.trim())) : 
        Array.isArray(podcast.topics) ? podcast.topics : []
      ) : []
  );

  const [targetRevenue, setTargetRevenue] = useState<string[]>(
    podcast?.target_revenue ? 
      (typeof podcast.target_revenue === 'string' ? 
        (podcast.target_revenue.startsWith('[') ? JSON.parse(podcast.target_revenue) : podcast.target_revenue.split(',').map(r => r.trim())) : 
        Array.isArray(podcast.target_revenue) ? podcast.target_revenue : []
      ) : []
  );

  const [testimonials, setTestimonials] = useState<string[]>(
    podcast?.testimonials ? 
      (typeof podcast.testimonials === 'string' ? 
        (podcast.testimonials.startsWith('[') ? JSON.parse(podcast.testimonials) : podcast.testimonials.split(',').map(t => t.trim())) : 
        Array.isArray(podcast.testimonials) ? podcast.testimonials : []
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

  const handleSubmit = async (isDraft = false) => {
    setLoading(true);
    setError(null);

    try {
      // Prepare data for submission
      const dataToSubmit = {
        ...formData,
        focus_areas_covered: selectedFocusAreas.join(', '),
        notable_guests: JSON.stringify(notableGuests.filter(g => g.trim())),
        topics: JSON.stringify(keyTopics.filter(t => t.trim())),
        target_revenue: JSON.stringify(targetRevenue.filter(r => r.trim())),
        testimonials: JSON.stringify(testimonials.filter(t => t.trim())),
        submission_type: submissionType,
        // Set status based on whether it's a draft save or submission
        // If saving as draft, mark as 'draft'
        // If submitting (not draft), always mark as 'published' (even if it was previously a draft)
        status: isDraft ? 'draft' : 'published',
      };

      // Remove empty fields to keep data clean
      Object.keys(dataToSubmit).forEach(key => {
        if (dataToSubmit[key as keyof Podcast] === '' || dataToSubmit[key as keyof Podcast] === undefined) {
          delete dataToSubmit[key as keyof Podcast];
        }
      });

      const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
      
      const response = await fetch(`/api/podcasts${podcast?.id ? `/${podcast.id}` : ''}`, {
        method: podcast?.id ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });

      if (!response.ok) {
        throw new Error('Failed to save podcast');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/admindashboard/podcasts');
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
                  <Mic className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Podcast Information</h2>
              <p className="text-power100-grey mt-2">
                The more information you provide, the better we can match your podcast with interested contractors.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Podcast Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter podcast title"
                />
                <p className="text-sm text-power100-grey mt-1">This is how contractors will find your podcast</p>
              </div>

              <div>
                <Label htmlFor="host">Host Name <span className="text-red-500">*</span></Label>
                <Input
                  id="host"
                  name="host"
                  value={formData.host}
                  onChange={handleInputChange}
                  placeholder="Host or hosts"
                />
                <p className="text-sm text-power100-grey mt-1">Builds credibility and personal connection</p>
              </div>

              <div>
                <Label htmlFor="format">Podcast Format</Label>
                <Select 
                  value={formData.format} 
                  onValueChange={(value) => handleSelectChange('format', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Interview">Interview</SelectItem>
                    <SelectItem value="Solo">Solo</SelectItem>
                    <SelectItem value="Panel">Panel Discussion</SelectItem>
                    <SelectItem value="Educational">Educational</SelectItem>
                    <SelectItem value="Q&A">Q&A</SelectItem>
                    <SelectItem value="Mixed">Mixed Format</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="frequency">Release Frequency</Label>
                <Select 
                  value={formData.frequency} 
                  onValueChange={(value) => handleSelectChange('frequency', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Twice Weekly">Twice Weekly</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Biweekly">Biweekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Seasonal">Seasonal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-power100-grey mt-1">Helps contractors plan their listening schedule</p>
              </div>

              <div>
                <Label htmlFor="description">Podcast Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="What does your podcast cover? What value does it provide?"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="average_episode_length">Average Episode Length</Label>
                <Select 
                  value={formData.average_episode_length} 
                  onValueChange={(value) => handleSelectChange('average_episode_length', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select length" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="< 15 minutes">Under 15 minutes</SelectItem>
                    <SelectItem value="15-30 minutes">15-30 minutes</SelectItem>
                    <SelectItem value="30-45 minutes">30-45 minutes</SelectItem>
                    <SelectItem value="45-60 minutes">45-60 minutes</SelectItem>
                    <SelectItem value="60+ minutes">Over 60 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-power100-grey mt-1">Helps contractors fit podcasts into their schedule</p>
              </div>

              <div>
                <Label htmlFor="total_episodes">Total Episodes Published</Label>
                <Input
                  id="total_episodes"
                  type="number"
                  value={formData.total_episodes}
                  onChange={(e) => handleFieldChange('total_episodes', e.target.value)}
                  placeholder="e.g., 150"
                />
                <p className="text-sm text-power100-grey mt-1">Number of episodes published to date</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subscriber_count">Subscriber Count</Label>
                  <Input
                    id="subscriber_count"
                    type="number"
                    value={formData.subscriber_count}
                    onChange={(e) => handleFieldChange('subscriber_count', e.target.value)}
                    placeholder="e.g., 5000"
                  />
                  <p className="text-sm text-power100-grey mt-1">Total subscribers across platforms</p>
                </div>

                <div>
                  <Label htmlFor="download_average">Average Downloads</Label>
                  <Input
                    id="download_average"
                    type="number"
                    value={formData.download_average}
                    onChange={(e) => handleFieldChange('download_average', e.target.value)}
                    placeholder="e.g., 1500"
                  />
                  <p className="text-sm text-power100-grey mt-1">Average downloads per episode</p>
                </div>
              </div>

              <div>
                <Label>Podcast Logo</Label>
                <p className="text-sm text-power100-grey mb-3">Upload a logo for your podcast</p>
                <LogoManager
                  currentLogoUrl={formData.logo_url}
                  onLogoChange={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
                  entityType="podcast"
                  entityName={formData.title || 'podcast'}
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
                  <Headphones className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Platform & Distribution</h2>
              <p className="text-power100-grey mt-2">
                Where can contractors find and listen to your podcast?
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="website">Podcast Website</Label>
                <Input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com/podcast"
                />
              </div>

              <div>
                <Label htmlFor="spotify_url">Spotify URL</Label>
                <Input
                  id="spotify_url"
                  name="spotify_url"
                  value={formData.spotify_url}
                  onChange={handleInputChange}
                  placeholder="https://open.spotify.com/show/..."
                />
                <p className="text-sm text-power100-grey mt-1">Most popular podcast platform</p>
              </div>

              <div>
                <Label htmlFor="apple_podcasts_url">Apple Podcasts URL</Label>
                <Input
                  id="apple_podcasts_url"
                  name="apple_podcasts_url"
                  value={formData.apple_podcasts_url}
                  onChange={handleInputChange}
                  placeholder="https://podcasts.apple.com/..."
                />
              </div>

              <div>
                <Label htmlFor="youtube_url">YouTube URL</Label>
                <Input
                  id="youtube_url"
                  name="youtube_url"
                  value={formData.youtube_url}
                  onChange={handleInputChange}
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div>
                <Label htmlFor="other_platform_urls">Other Platforms</Label>
                <Textarea
                  id="other_platform_urls"
                  name="other_platform_urls"
                  value={formData.other_platform_urls}
                  onChange={handleInputChange}
                  placeholder="List any other platforms where your podcast is available"
                  rows={2}
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
              <h2 className="text-2xl font-bold text-power100-black">Audience & Topics</h2>
              <p className="text-power100-grey mt-2">
                Define your target audience and key topics
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>What contractor challenges does your podcast address?</Label>
                <p className="text-sm text-power100-grey mb-3">Ensures your podcast reaches the right contractors</p>
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
                <Label htmlFor="target_audience">Target Audience</Label>
                <Textarea
                  id="target_audience"
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleInputChange}
                  placeholder="Who is your ideal listener? (e.g., HVAC contractors with 10+ employees looking to scale)"
                  rows={3}
                />
                <p className="text-sm text-power100-grey mt-1">Helps us match with appropriate contractors</p>
              </div>

              <div>
                <Label>Target Revenue Range</Label>
                <p className="text-sm text-power100-grey mb-2">Select contractor revenue ranges your content targets</p>
                <SimpleDynamicList
                  items={targetRevenue}
                  onItemsChange={setTargetRevenue}
                  placeholder="e.g., 5-10 Million"
                  buttonText="Add Revenue Range"
                />
              </div>

              <div>
                <Label>Key Topics Covered</Label>
                <p className="text-sm text-power100-grey mb-2">List the main topics you regularly discuss</p>
                <SimpleDynamicList
                  items={keyTopics}
                  onItemsChange={setKeyTopics}
                  placeholder="Enter a key topic"
                  buttonText="Add Topic"
                />
              </div>

              <div>
                <Label>Notable Past Guests</Label>
                <p className="text-sm text-power100-grey mb-2">List notable industry leaders or successful contractors you've interviewed</p>
                <SimpleDynamicList
                  items={notableGuests}
                  onItemsChange={setNotableGuests}
                  placeholder="Enter guest name and episode"
                  buttonText="Add Guest"
                />
              </div>

              <div>
                <Label>Testimonials</Label>
                <p className="text-sm text-power100-grey mb-2">Add testimonials from listeners or guests</p>
                <SimpleDynamicList
                  items={testimonials}
                  onItemsChange={setTestimonials}
                  placeholder="Enter a testimonial"
                  buttonText="Add Testimonial"
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
              <h2 className="text-2xl font-bold text-power100-black">Host Information</h2>
              <p className="text-power100-grey mt-2">
                Contact details for partnerships and guest opportunities
              </p>
            </div>

            <div className="mb-4">
              <Label>Who is submitting this podcast?</Label>
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
                  variant={submissionType === 'host' ? 'default' : 'outline'}
                  onClick={() => setSubmissionType('host')}
                  className={submissionType === 'host' ? 'bg-power100-green' : ''}
                >
                  Podcast Host
                </Button>
              </div>
            </div>

            {/* Submitter Information Section */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold mb-3">Submitter Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="submitter_name">Submitter Name</Label>
                  <Input
                    id="submitter_name"
                    name="submitter_name"
                    value={formData.submitter_name}
                    onChange={handleInputChange}
                    placeholder="Name of person who submitted"
                  />
                </div>
                
                <div>
                  <Label htmlFor="submitter_email">Submitter Email</Label>
                  <Input
                    id="submitter_email"
                    name="submitter_email"
                    type="email"
                    value={formData.submitter_email}
                    onChange={handleInputChange}
                    placeholder="submitter@email.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="submitter_phone">Submitter Phone</Label>
                  <Input
                    id="submitter_phone"
                    name="submitter_phone"
                    value={formData.submitter_phone}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                  />
                </div>
                
                <div>
                  <Label htmlFor="submitter_company">Submitter Company</Label>
                  <Input
                    id="submitter_company"
                    name="submitter_company"
                    value={formData.submitter_company}
                    onChange={handleInputChange}
                    placeholder="Company name"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_host"
                    checked={formData.is_host}
                    onCheckedChange={(checked) => handleCheckboxChange('is_host', checked as boolean)}
                  />
                  <Label htmlFor="is_host" className="font-normal">
                    Submitter is the host
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="host_email">
                  Host Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="host_email"
                  name="host_email"
                  type="email"
                  value={formData.host_email}
                  onChange={handleInputChange}
                  placeholder="host@example.com"
                  required={submissionType === 'host'}
                />
                <p className="text-sm text-power100-grey mt-1">For partnership and guest opportunities</p>
              </div>

              <div>
                <Label htmlFor="host_phone">Host Phone</Label>
                <Input
                  id="host_phone"
                  name="host_phone"
                  value={formData.host_phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="host_linkedin">Host LinkedIn</Label>
                <Input
                  id="host_linkedin"
                  name="host_linkedin"
                  value={formData.host_linkedin}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <div>
                <Label htmlFor="host_company">Host Company</Label>
                <Input
                  id="host_company"
                  name="host_company"
                  value={formData.host_company}
                  onChange={handleInputChange}
                  placeholder="Company or organization"
                />
              </div>

              <div>
                <Label htmlFor="host_bio">Host Bio</Label>
                <Textarea
                  id="host_bio"
                  name="host_bio"
                  value={formData.host_bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about the host's background and experience..."
                  rows={4}
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="accepts_guests"
                    checked={formData.accepts_guest_requests}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, accepts_guest_requests: checked as boolean }))
                    }
                  />
                  <Label htmlFor="accepts_guests">I accept guest requests from contractors</Label>
                </div>

                {formData.accepts_guest_requests && (
                  <div className="space-y-4 ml-6">
                    <div>
                      <Label htmlFor="guest_requirements">Guest Requirements</Label>
                      <Textarea
                        id="guest_requirements"
                        name="guest_requirements"
                        value={formData.guest_requirements}
                        onChange={handleInputChange}
                        placeholder="What are your requirements for potential guests?"
                      />
                    </div>
                    <div>
                      <Label htmlFor="typical_guest_profile">Typical Guest Profile</Label>
                      <Input
                        id="typical_guest_profile"
                        name="typical_guest_profile"
                        value={formData.typical_guest_profile}
                        onChange={handleInputChange}
                        placeholder="e.g., Contractors with $5M+ revenue"
                      />
                    </div>
                    <div>
                      <Label htmlFor="booking_link">Guest Booking Link</Label>
                      <Input
                        id="booking_link"
                        name="booking_link"
                        value={formData.booking_link}
                        onChange={handleInputChange}
                        placeholder="https://calendly.com/..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-green-800 font-semibold mb-2">Podcasts that accept guests get 4x more engagement</p>
                <p className="text-green-700 text-sm">Contractors love sharing their success stories</p>
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
            onClick={onCancel || (() => router.push('/admindashboard/podcasts'))}
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
                  disabled={loading || (submissionType === 'host' && !formData.host_email)}
                  className="flex-1 bg-power100-green hover:bg-green-600 text-white font-semibold"
                >
                  {loading ? 'Submitting...' : 'Submit Podcast'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={loading || (submissionType === 'host' && !formData.host_email)}
                  className="bg-white border-2 border-power100-green text-power100-green hover:bg-green-50"
                >
                  {loading ? 'Saving...' : 'Save as Draft'}
                </Button>
              </>
            )}
          </div>

          {/* Skip to host info option on first page */}
          {currentStep === 1 && (
            <div className="text-center mt-4">
              <Button
                type="button"
                variant="link"
                onClick={() => setCurrentStep(4)}
                className="text-power100-grey hover:text-power100-black"
              >
                Skip to Host Info →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}