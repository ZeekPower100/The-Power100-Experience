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
import { bookApi } from '@/lib/api';
import { BookOpen, User, Building, Quote, Target, Sparkles, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Book } from '@/lib/types/book';

// Focus areas for book matching
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
    description: '',
    amazon_url: '',
    focus_areas: [],
    target_revenue: [],
    key_takeaways: [],
    testimonials: [],
    sample_chapter_link: '',
    table_of_contents: '',
    book_cover_url: '',
    submitter_name: '',
    submitter_email: '',
    submitter_phone: '',
    submitter_company: '',
    is_author: false,
    status: 'pending_review'
  });

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
      // Set submission type
      const submissionData = {
        ...formData,
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
                      currentLogoUrl={formData.book_cover_url}
                      onLogoChange={(url) => handleFieldChange('book_cover_url', url)}
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
                  <Label>Business Focus Areas *</Label>
                  <p className="text-sm text-power100-grey mb-3">
                    Select the business areas your book addresses
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