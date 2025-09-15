"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleDynamicList } from '@/components/ui/simple-dynamic-list';
import LogoManager from '@/components/admin/LogoManager';
import { bookApi } from '@/lib/api';
import { BookOpen, User, Building, Quote, Target, Sparkles, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Book } from '@/lib/types/book';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

// Focus areas for book matching - aligned with contractor focus areas
const FOCUS_AREAS = [
  { value: 'greenfield_growth', label: 'Market Expansion', description: 'Expanding into new markets and territories' },
  { value: 'closing_higher_percentage', label: 'Sales Conversion', description: 'Improving close rates and sales effectiveness' },
  { value: 'controlling_lead_flow', label: 'Lead Generation & Management', description: 'Managing and optimizing lead flow systems' },
  { value: 'installation_quality', label: 'Service Delivery Excellence', description: 'Enhancing installation and service quality' },
  { value: 'hiring_sales_leadership', label: 'Talent Acquisition', description: 'Recruiting sales teams and leadership' },
  { value: 'marketing_automation', label: 'Marketing Systems', description: 'Automating and streamlining marketing' },
  { value: 'customer_retention', label: 'Customer Success', description: 'Building long-term client relationships' },
  { value: 'operational_efficiency', label: 'Operations Optimization', description: 'Streamlining internal processes' },
  { value: 'technology_integration', label: 'Technology Solutions', description: 'Implementing new tech platforms' },
  { value: 'financial_management', label: 'Financial Performance', description: 'Improving cash flow and profitability' }
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

export default function BookOnboardingForm() {
  const router = useRouter();
  const totalSteps = 4;
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionType, setSubmissionType] = useState<'author' | 'team_member'>('author');

  // Form data state
  const [formData, setFormData] = useState<Partial<Book>>({
    title: '',
    author: '',
    author_email: '',
    author_phone: '',
    author_linkedin_url: '',
    author_website: '',
    publication_year: '',
    description: '',
    target_audience: '',
    difficulty_level: '',
    amazon_url: '',
    focus_areas: [],
    target_revenue: [],
    key_takeaways: [],
    testimonials: [],
    sample_chapter_link: '',
    table_of_contents: '',
    cover_image_url: '',
    has_executive_assistant: false,
    ea_name: '',
    ea_email: '',
    ea_phone: '',
    ea_scheduling_link: '',
    key_citations: [],
    writing_influence: '',
    intended_solutions: '',
    author_next_focus: '',
    book_goals: '',
    author_availability: '',
    submitter_name: '',
    submitter_email: '',
    submitter_phone: '',
    submitter_company: '',
    is_author: false,
    status: 'pending_review'
  });

  // Key citations state (managed separately as array of objects)
  const [keyCitations, setKeyCitations] = useState<Array<{
    cited_person: string;
    their_expertise: string;
    citation_context: string;
  }>>([
    { cited_person: '', their_expertise: '', citation_context: '' }
  ]);

  const handleFieldChange = (field: keyof Book, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayFieldChange = (field: keyof Book, values: string[]) => {
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

  const handleCitationChange = (index: number, field: 'cited_person' | 'their_expertise' | 'citation_context', value: string) => {
    const newCitations = [...keyCitations];
    newCitations[index] = { ...newCitations[index], [field]: value };
    setKeyCitations(newCitations);
  };

  const addCitation = () => {
    setKeyCitations([...keyCitations, { cited_person: '', their_expertise: '', citation_context: '' }]);
  };

  const removeCitation = (index: number) => {
    if (keyCitations.length > 1) {
      setKeyCitations(keyCitations.filter((_, i) => i !== index));
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
        key_takeaways: safeJsonStringify(formData.key_takeaways || []),
        testimonials: safeJsonStringify(formData.testimonials || []),
        key_citations: safeJsonStringify(keyCitations.filter(c => c.cited_person)),
        focus_areas_covered: safeJsonStringify(formData.focus_areas || []),
        target_revenue: formData.target_revenue?.join(', ') || '',
        cover_image_url: formData.cover_image_url,
        // Remove original array fields to avoid conflicts
        focus_areas: undefined,
        // Keep original fields
        is_author: submissionType === 'author',
        status: 'pending_review'
      };

      await bookApi.create(submissionData);
      
      // Redirect to success page
      router.push('/book/form/success');
    } catch (err: any) {
      setError(err.message || 'Failed to submit book. Please try again.');
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Book Information';
      case 2:
        return 'Target Audience & Focus Areas';
      case 3:
        return 'Additional Content';
      case 4:
        return 'Contact Information';
      default:
        return '';
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 1:
        return <BookOpen className="h-6 w-6 text-white" />;
      case 2:
        return <Target className="h-6 w-6 text-white" />;
      case 3:
        return <Sparkles className="h-6 w-6 text-white" />;
      case 4:
        return <User className="h-6 w-6 text-white" />;
      default:
        return <BookOpen className="h-6 w-6 text-white" />;
    }
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-power100-black">Book Submission</h1>
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

            {/* Step 1: Book Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="title">Book Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Enter the full title of your book"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="author">Author Name *</Label>
                  <Input
                    id="author"
                    value={formData.author}
                    onChange={(e) => handleFieldChange('author', e.target.value)}
                    placeholder="Enter the author's full name"
                    className="mt-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="author_email">Author Email</Label>
                    <Input
                      id="author_email"
                      type="email"
                      value={formData.author_email}
                      onChange={(e) => handleFieldChange('author_email', e.target.value)}
                      placeholder="author@example.com"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="author_phone">Author Phone</Label>
                    <Input
                      id="author_phone"
                      type="tel"
                      value={formData.author_phone}
                      onChange={(e) => handleFieldChange('author_phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="author_linkedin_url">Author LinkedIn Profile</Label>
                    <Input
                      id="author_linkedin_url"
                      type="url"
                      value={formData.author_linkedin_url}
                      onChange={(e) => handleFieldChange('author_linkedin_url', e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="author_website">Author Website</Label>
                    <Input
                      id="author_website"
                      type="url"
                      value={formData.author_website}
                      onChange={(e) => handleFieldChange('author_website', e.target.value)}
                      placeholder="https://authorwebsite.com"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="publication_year">Publication Year</Label>
                  <Input
                    id="publication_year"
                    type="number"
                    value={formData.publication_year}
                    onChange={(e) => handleFieldChange('publication_year', e.target.value)}
                    placeholder="2024"
                    min="1900"
                    max="2030"
                    className="mt-1"
                  />
                </div>

                {/* Executive Assistant Section */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_executive_assistant"
                      checked={formData.has_executive_assistant}
                      onCheckedChange={(checked) => handleFieldChange('has_executive_assistant', checked)}
                    />
                    <Label htmlFor="has_executive_assistant" className="text-sm font-medium cursor-pointer">
                      Does the author have an Executive Assistant (EA)?
                    </Label>
                  </div>

                  {formData.has_executive_assistant && (
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ea_name">EA Name</Label>
                          <Input
                            id="ea_name"
                            value={formData.ea_name}
                            onChange={(e) => handleFieldChange('ea_name', e.target.value)}
                            placeholder="Executive Assistant's name"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="ea_email">EA Email</Label>
                          <Input
                            id="ea_email"
                            type="email"
                            value={formData.ea_email}
                            onChange={(e) => handleFieldChange('ea_email', e.target.value)}
                            placeholder="ea@example.com"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ea_phone">EA Phone</Label>
                          <Input
                            id="ea_phone"
                            type="tel"
                            value={formData.ea_phone}
                            onChange={(e) => handleFieldChange('ea_phone', e.target.value)}
                            placeholder="(555) 123-4567"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="ea_scheduling_link">EA Scheduling Link</Label>
                          <Input
                            id="ea_scheduling_link"
                            type="url"
                            value={formData.ea_scheduling_link}
                            onChange={(e) => handleFieldChange('ea_scheduling_link', e.target.value)}
                            placeholder="https://calendly.com/..."
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Book Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Provide a compelling description of your book (2-3 paragraphs)"
                    className="mt-1 min-h-[150px]"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="target_audience">Target Audience</Label>
                  <Textarea
                    id="target_audience"
                    value={formData.target_audience}
                    onChange={(e) => handleFieldChange('target_audience', e.target.value)}
                    placeholder="Who is this book written for? (e.g., contractors with $5M-$20M revenue looking to scale)"
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="difficulty_level">Reading Level</Label>
                  <Select
                    value={formData.difficulty_level}
                    onValueChange={(value) => handleFieldChange('difficulty_level', value)}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue placeholder="Select reading level" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-power100-grey mt-1">
                    Sets proper expectations for readers
                  </p>
                </div>

                <div>
                  <Label htmlFor="amazon_url">Amazon Link</Label>
                  <Input
                    id="amazon_url"
                    value={formData.amazon_url}
                    onChange={(e) => handleFieldChange('amazon_url', e.target.value)}
                    placeholder="https://amazon.com/..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Book Cover</Label>
                  <div className="mt-2">
                    <LogoManager
                      entityType="book"
                      entityName={formData.title || 'book'}
                      currentLogoUrl={formData.cover_image_url}
                      onLogoChange={(url) => handleFieldChange('cover_image_url', url)}
                      label="Upload Book Cover"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Target Audience & Focus Areas */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <Label className="font-semibold text-base">What contractor challenges does your book address? *</Label>
                  <p className="text-sm text-power100-grey mb-3">
                    Select all the business challenges your book helps contractors solve
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {FOCUS_AREAS.map(area => (
                      <div
                        key={area.value}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          formData.focus_areas?.includes(area.value)
                            ? 'border-power100-red bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleFocusAreaToggle(area.value)}
                      >
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id={area.value}
                            checked={formData.focus_areas?.includes(area.value) || false}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={area.value}
                              className="font-medium cursor-pointer text-sm"
                            >
                              {area.label}
                            </Label>
                            <p className="text-xs text-power100-grey mt-0.5">
                              {area.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {formData.focus_areas && formData.focus_areas.length > 0 && (
                    <p className="text-sm text-power100-grey mt-2">
                      Selected: {formData.focus_areas.length} focus areas
                    </p>
                  )}
                </div>

                <div>
                  <Label>Target Revenue Range</Label>
                  <p className="text-sm text-power100-grey mb-3">
                    Select the revenue ranges this book is most relevant for
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

            {/* Step 3: Additional Content */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label>Key Takeaways</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    List the main lessons or insights from your book
                  </p>
                  <SimpleDynamicList
                    items={formData.key_takeaways || []}
                    onItemsChange={(items) => handleArrayFieldChange('key_takeaways', items)}
                    placeholder="Enter a key takeaway"
                    buttonText="Add Takeaway"
                  />
                </div>

                <div>
                  <Label>Testimonials</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Add testimonials or endorsements for your book
                  </p>
                  <SimpleDynamicList
                    items={formData.testimonials || []}
                    onItemsChange={(items) => handleArrayFieldChange('testimonials', items)}
                    placeholder="Enter a testimonial"
                    buttonText="Add Testimonial"
                  />
                </div>

                {/* Key Citations Section */}
                <div>
                  <Label>Who are the top people you cite in your book?</Label>
                  <p className="text-sm text-power100-grey mb-2">
                    Add the key people you reference and their expertise
                  </p>
                  <div className="space-y-4">
                    {keyCitations.map((citation, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium">Citation {index + 1}</span>
                          {keyCitations.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCitation(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor={`cited_person_${index}`}>Cited Person</Label>
                          <Input
                            id={`cited_person_${index}`}
                            value={citation.cited_person}
                            onChange={(e) => handleCitationChange(index, 'cited_person', e.target.value)}
                            placeholder="Name of the person being cited"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`their_expertise_${index}`}>Their Expertise</Label>
                          <Input
                            id={`their_expertise_${index}`}
                            value={citation.their_expertise}
                            onChange={(e) => handleCitationChange(index, 'their_expertise', e.target.value)}
                            placeholder="Their area of expertise or credentials"
                            className="mt-1"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`citation_context_${index}`}>Citation Context</Label>
                          <Textarea
                            id={`citation_context_${index}`}
                            value={citation.citation_context}
                            onChange={(e) => handleCitationChange(index, 'citation_context', e.target.value)}
                            placeholder="Context or quote from the citation"
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCitation}
                      className="w-full"
                    >
                      Add Another Citation
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="sample_chapter_link">Sample Chapter Link</Label>
                  <Input
                    id="sample_chapter_link"
                    value={formData.sample_chapter_link}
                    onChange={(e) => handleFieldChange('sample_chapter_link', e.target.value)}
                    placeholder="Link to a sample chapter or excerpt"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="table_of_contents">Table of Contents</Label>
                  <Textarea
                    id="table_of_contents"
                    value={formData.table_of_contents}
                    onChange={(e) => handleFieldChange('table_of_contents', e.target.value)}
                    placeholder="Paste your table of contents here"
                    className="mt-1 min-h-[150px]"
                  />
                </div>

                <div>
                  <Label htmlFor="writing_influence">What influenced you to write this book?</Label>
                  <Textarea
                    id="writing_influence"
                    value={formData.writing_influence}
                    onChange={(e) => handleFieldChange('writing_influence', e.target.value)}
                    placeholder="Describe what inspired or influenced you to write this book"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="intended_solutions">What solutions were you hoping to provide?</Label>
                  <Textarea
                    id="intended_solutions"
                    value={formData.intended_solutions}
                    onChange={(e) => handleFieldChange('intended_solutions', e.target.value)}
                    placeholder="Describe the problems you're solving and solutions you're offering"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="author_next_focus">What are you focused on for the next 12-18 months?</Label>
                  <Textarea
                    id="author_next_focus"
                    value={formData.author_next_focus}
                    onChange={(e) => handleFieldChange('author_next_focus', e.target.value)}
                    placeholder="Share your professional focus and goals for the next year and a half"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="book_goals">What are you hoping the book helps you accomplish?</Label>
                  <Textarea
                    id="book_goals"
                    value={formData.book_goals}
                    onChange={(e) => handleFieldChange('book_goals', e.target.value)}
                    placeholder="Describe your goals and what you hope to achieve through this book"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="author_availability">Author Availability</Label>
                  <Select 
                    value={formData.author_availability}
                    onValueChange={(value) => handleFieldChange('author_availability', value)}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue placeholder="Select your availability" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="actively_seeking">Actively Seeking Engagements</SelectItem>
                      <SelectItem value="selectively_available">Selectively Available</SelectItem>
                      <SelectItem value="not_available">Not Available</SelectItem>
                      <SelectItem value="through_company">Engage Through Company</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-power100-grey mt-1">
                    Let us know your availability for interviews, speaking engagements, or promotional activities
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Contact Information */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <Label>Are you the author of this book?</Label>
                  <div className="flex gap-4 mt-2">
                    <Button
                      type="button"
                      variant={submissionType === 'author' ? 'default' : 'outline'}
                      onClick={() => setSubmissionType('author')}
                      className={submissionType === 'author' ? 'bg-power100-green' : ''}
                    >
                      Yes, I'm the Author
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
                  {loading ? 'Submitting...' : 'Submit Book'}
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