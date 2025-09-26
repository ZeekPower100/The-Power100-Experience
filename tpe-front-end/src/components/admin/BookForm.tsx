'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleDynamicList } from '@/components/ui/simple-dynamic-list';
import { ArrowLeft, Save, BookOpen, User, Building, Quote, Target, Sparkles, X, Upload, Check } from 'lucide-react';
import { Book } from '@/lib/types/book';
import LogoManager from '@/components/admin/LogoManager';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../utils/jsonHelpers';

interface BookFormProps {
  book?: Book;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Focus areas aligned with contractor focus areas for consistency
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

export default function BookForm({ book, onSuccess, onCancel }: BookFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [submissionType, setSubmissionType] = useState<'author' | 'team_member'>('team_member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data state
  const [formData, setFormData] = useState<Book>({
    title: book?.title || '',
    author: book?.author || '',
    description: book?.description || '',
    amazon_url: book?.amazon_url || '',
    cover_image_url: book?.cover_image_url || '',
    publication_year: book?.publication_year || '',
    
    // Contact Info
    author_email: book?.author_email || '',
    author_phone: book?.author_phone || '',
    author_linkedin_url: book?.author_linkedin_url || '',
    author_website: book?.author_website || '',
    
    // EA Info
    has_executive_assistant: book?.has_executive_assistant || false,
    ea_name: book?.ea_name || '',
    ea_email: book?.ea_email || '',
    ea_phone: book?.ea_phone || '',
    ea_scheduling_link: book?.ea_scheduling_link || '',
    
    // Content
    focus_areas_covered: book?.focus_areas_covered || '',
    topics: book?.topics || '',
    target_audience: book?.target_audience || '',
    key_takeaways: book?.key_takeaways || '',
    testimonials: book?.testimonials || '',
    sample_chapter_link: book?.sample_chapter_link || '',
    table_of_contents: book?.table_of_contents || '',
    reading_time: book?.reading_time || '',
    difficulty_level: book?.difficulty_level || '',
    
    // Author's Story
    writing_influence: book?.writing_influence || '',
    intended_solutions: book?.intended_solutions || '',
    author_next_focus: book?.author_next_focus || '',
    book_goals: book?.book_goals || '',
    author_availability: book?.author_availability || '',
    
    // Submitter Information
    submitter_name: book?.submitter_name || '',
    submitter_email: book?.submitter_email || '',
    submitter_phone: book?.submitter_phone || '',
    submitter_company: book?.submitter_company || '',
    is_author: book?.is_author || false,
    
    // Additional URLs
    barnes_noble_url: book?.barnes_noble_url || '',
    author_website_purchase_url: book?.author_website_purchase_url || '',
    
    is_active: book?.is_active !== undefined ? book.is_active : true,
  });

  // Key citations state (managed separately as array)
  const [keyCitations, setKeyCitations] = useState<Array<{
    cited_person: string;
    their_expertise: string;
    citation_context: string;
  }>>(
    book?.key_citations ? safeJsonParse(book.key_citations) : [
      { cited_person: '', their_expertise: '', citation_context: '' }
    ]
  );

  // Selected focus areas (for multi-select)
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>(() => {
    if (!book?.focus_areas_covered) return [];
    try {
      // Parse JSON array if it's a string
      if (typeof book.focus_areas_covered === 'string') {
        return safeJsonParse(book.focus_areas_covered, []);
      }
      // If it's already an array, use it directly
      return Array.isArray(book.focus_areas_covered) ? book.focus_areas_covered : [];
    } catch {
      // Fallback for comma-separated values
      return book.focus_areas_covered.split(',').map(f => f.trim());
    }
  });

  // Key takeaways and testimonials (array fields)
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>(
    book?.key_takeaways ? 
      (typeof book.key_takeaways === 'string' ? 
        (book.key_takeaways.startsWith('[') ? safeJsonParse(book.key_takeaways) : book.key_takeaways.split(',').map(t => t.trim())) : 
        Array.isArray(book.key_takeaways) ? book.key_takeaways : []
      ) : []
  );

  const [testimonials, setTestimonials] = useState<string[]>(
    book?.testimonials ? 
      (typeof book.testimonials === 'string' ? 
        (book.testimonials.startsWith('[') ? safeJsonParse(book.testimonials) : book.testimonials.split(',').map(t => t.trim())) : 
        Array.isArray(book.testimonials) ? book.testimonials : []
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

  const addCitation = () => {
    setKeyCitations(prev => [...prev, { cited_person: '', their_expertise: '', citation_context: '' }]);
  };

  const removeCitation = (index: number) => {
    setKeyCitations(prev => prev.filter((_, i) => i !== index));
  };

  const updateCitation = (index: number, field: string, value: string) => {
    setKeyCitations(prev => prev.map((citation, i) => 
      i === index ? { ...citation, [field]: value } : citation
    ));
  };

  const handleSubmit = async (isDraft = false) => {
    setLoading(true);
    setError(null);

    try {
      // Prepare data for submission
      const dataToSubmit = {
        ...formData,
        focus_areas_covered: safeJsonStringify(selectedFocusAreas),
        key_citations: safeJsonStringify(keyCitations.filter(c => c.cited_person)),
        key_takeaways: safeJsonStringify(keyTakeaways.filter(t => t.trim())),
        testimonials: safeJsonStringify(testimonials.filter(t => t.trim())),
        submission_type: submissionType,
        // Set status based on whether it's a draft save or submission
        // If saving as draft, mark as 'draft'
        // If submitting (not draft), always mark as 'published' (even if it was previously a draft)
        status: isDraft ? 'draft' : 'published',
      };

      // Remove empty fields to keep data clean
      Object.keys(dataToSubmit).forEach(key => {
        if (dataToSubmit[key as keyof Book] === '' || dataToSubmit[key as keyof Book] === undefined) {
          delete dataToSubmit[key as keyof Book];
        }
      });

      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      
      const response = await fetch(`/api/books${book?.id ? `/${book.id}` : ''}`, {
        method: book?.id ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: safeJsonStringify(dataToSubmit),
      });

      if (!response.ok) {
        throw new Error('Failed to save book');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/admindashboard/books');
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
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Book Information</h2>
              <p className="text-power100-grey mt-2">
                The more information you provide, the better we can match your book with contractors who need it most.
              </p>
            </div>

            <div className="space-y-4">
              {/* Book Cover Upload */}
              <div>
                <Label>Book Cover Image</Label>
                <p className="text-sm text-power100-grey mb-3">Upload a cover image that will appear in search results</p>
                <LogoManager
                  currentLogoUrl={formData.cover_image_url}
                  onLogoChange={(url) => setFormData(prev => ({ ...prev, cover_image_url: url }))}
                  label="Book Cover"
                  uploadLabel="Upload Book Cover"
                  removeLabel="Remove Cover"
                  previewSize="h-48 w-36"
                  entityType="book"
                  entityName={formData.title || 'book'}
                />
              </div>

              <div>
                <Label htmlFor="title">Book Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter book title"
                />
                <p className="text-sm text-power100-grey mt-1">This is how contractors will find your book</p>
              </div>

              <div>
                <Label htmlFor="author">Author Name <span className="text-red-500">*</span></Label>
                <Input
                  id="author"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  placeholder="Full author name"
                />
                <p className="text-sm text-power100-grey mt-1">Builds credibility and personal brand</p>
              </div>

              <div>
                <Label htmlFor="description">Book Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of what the book covers"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="amazon_url">Amazon URL</Label>
                <Input
                  id="amazon_url"
                  name="amazon_url"
                  value={formData.amazon_url}
                  onChange={handleInputChange}
                  placeholder="https://amazon.com/..."
                />
                <p className="text-sm text-power100-grey mt-1">Direct path for contractors to get your book</p>
              </div>

              <div>
                <Label htmlFor="publication_year">Publication Year</Label>
                <Input
                  id="publication_year"
                  name="publication_year"
                  type="number"
                  value={formData.publication_year || ''}
                  onChange={handleInputChange}
                  placeholder="2024"
                />
                <p className="text-sm text-power100-grey mt-1">Shows the book's track record and relevance</p>
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
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Contact Information</h2>
              <p className="text-power100-grey mt-2">
                So we can contact you about opportunities
              </p>
            </div>

            <div className="mb-4">
              <Label>Who is submitting this book?</Label>
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
                  variant={submissionType === 'author' ? 'default' : 'outline'}
                  onClick={() => setSubmissionType('author')}
                  className={submissionType === 'author' ? 'bg-power100-green' : ''}
                >
                  Author
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
                    placeholder="Your name"
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
                    placeholder="your@email.com"
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
                
                <div
                  className="flex items-center space-x-2 cursor-pointer"
                  onClick={() => handleCheckboxChange('is_author', !formData.is_author)}
                >
                  <div
                    className={`
                      h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center
                      ${formData.is_author
                        ? 'bg-black border-black'
                        : 'border-gray-300 bg-white'
                      }
                    `}
                  >
                    {formData.is_author && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <Label htmlFor="is_author" className="font-normal">
                    Submitter is the author
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="author_email">
                  Author Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="author_email"
                  name="author_email"
                  type="email"
                  value={formData.author_email}
                  onChange={handleInputChange}
                  placeholder="author@example.com"
                  required={submissionType === 'author'}
                />
              </div>

              <div>
                <Label htmlFor="author_phone">Author Phone</Label>
                <Input
                  id="author_phone"
                  name="author_phone"
                  value={formData.author_phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                />
                <p className="text-sm text-power100-grey mt-1">For urgent partnership opportunities</p>
              </div>

              <div>
                <Label htmlFor="author_linkedin_url">LinkedIn Profile</Label>
                <Input
                  id="author_linkedin_url"
                  name="author_linkedin_url"
                  value={formData.author_linkedin_url}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/..."
                />
                <p className="text-sm text-power100-grey mt-1">Contractors often research authors before buying</p>
              </div>

              <div>
                <Label htmlFor="author_website">Personal/Business Website</Label>
                <Input
                  id="author_website"
                  name="author_website"
                  value={formData.author_website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
                <p className="text-sm text-power100-grey mt-1">Showcases your broader work and services</p>
              </div>

              <div className="border-t pt-4">
                <div
                  className="flex items-center space-x-2 mb-4 cursor-pointer"
                  onClick={() => setFormData(prev => ({ ...prev, has_executive_assistant: !prev.has_executive_assistant }))}
                >
                  <div
                    className={`
                      h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center
                      ${formData.has_executive_assistant
                        ? 'bg-black border-black'
                        : 'border-gray-300 bg-white'
                      }
                    `}
                  >
                    {formData.has_executive_assistant && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <Label htmlFor="has_ea">I have an executive assistant</Label>
                </div>

                {formData.has_executive_assistant && (
                  <div className="space-y-4 ml-6">
                    <div>
                      <Label htmlFor="ea_name">EA Name</Label>
                      <Input
                        id="ea_name"
                        name="ea_name"
                        value={formData.ea_name}
                        onChange={handleInputChange}
                        placeholder="Assistant's full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ea_email">EA Email</Label>
                      <Input
                        id="ea_email"
                        name="ea_email"
                        type="email"
                        value={formData.ea_email}
                        onChange={handleInputChange}
                        placeholder="assistant@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ea_phone">EA Phone</Label>
                      <Input
                        id="ea_phone"
                        name="ea_phone"
                        value={formData.ea_phone}
                        onChange={handleInputChange}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ea_scheduling_link">Scheduling Link</Label>
                      <Input
                        id="ea_scheduling_link"
                        name="ea_scheduling_link"
                        value={formData.ea_scheduling_link}
                        onChange={handleInputChange}
                        placeholder="https://calendly.com/..."
                      />
                    </div>
                  </div>
                )}
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
                  <Quote className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Content & Citations</h2>
              <p className="text-power100-grey mt-2">
                Share the key influences and focus areas of your book
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <Label>Who are the top people you cite in your book?</Label>
                <p className="text-sm text-power100-grey mb-3">Shows thought leadership and credibility</p>
                
                {keyCitations.map((citation, index) => (
                  <div key={index} className="border rounded-lg p-4 mb-4">
                    <div className="space-y-3">
                      <Input
                        placeholder="Person's name"
                        value={citation.cited_person}
                        onChange={(e) => updateCitation(index, 'cited_person', e.target.value)}
                      />
                      <Input
                        placeholder="What they're known for"
                        value={citation.their_expertise}
                        onChange={(e) => updateCitation(index, 'their_expertise', e.target.value)}
                      />
                      <Input
                        placeholder="How they influenced the book"
                        value={citation.citation_context}
                        onChange={(e) => updateCitation(index, 'citation_context', e.target.value)}
                      />
                      {keyCitations.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeCitation(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                
                {keyCitations.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCitation}
                  >
                    Add Another Citation
                  </Button>
                )}
              </div>

              <div>
                <Label>What contractor challenges does your book address?</Label>
                <p className="text-sm text-power100-grey mb-3">Ensures your book reaches the right contractors</p>
                <div className="grid grid-cols-2 gap-3">
                  {FOCUS_AREAS.map(area => (
                    <div
                      key={area.value}
                      className="flex items-center space-x-2 cursor-pointer"
                      onClick={() => handleFocusAreaToggle(area.value)}
                    >
                      <div
                        className={`
                          h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center
                          ${selectedFocusAreas.includes(area.value)
                            ? 'bg-black border-black'
                            : 'border-gray-300 bg-white'
                          }
                        `}
                      >
                        {selectedFocusAreas.includes(area.value) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
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
                  placeholder="Who should read this book?"
                  rows={2}
                />
                <p className="text-sm text-power100-grey mt-1">Helps us match with appropriate contractors</p>
              </div>

              <div>
                <Label htmlFor="difficulty_level">Reading Level</Label>
                <Select 
                  value={formData.difficulty_level} 
                  onValueChange={(value) => handleSelectChange('difficulty_level', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select reading level" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-power100-grey mt-1">Sets proper expectations for readers</p>
              </div>

              <div>
                <Label>Key Takeaways</Label>
                <p className="text-sm text-power100-grey mb-2">List the main lessons or insights from your book</p>
                <SimpleDynamicList
                  items={keyTakeaways}
                  onItemsChange={setKeyTakeaways}
                  placeholder="Enter a key takeaway"
                  buttonText="Add Takeaway"
                />
              </div>

              <div>
                <Label>Testimonials</Label>
                <p className="text-sm text-power100-grey mb-2">Add testimonials or endorsements for your book</p>
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
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Your Story</h2>
              <p className="text-power100-grey mt-2">
                These questions help contractors connect with your journey
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="writing_influence">What influenced you to write this book?</Label>
                <Textarea
                  id="writing_influence"
                  name="writing_influence"
                  value={formData.writing_influence}
                  onChange={handleInputChange}
                  placeholder="Share your inspiration..."
                  rows={3}
                />
                <p className="text-sm text-power100-grey mt-1">Your story resonates with contractors facing similar challenges</p>
              </div>

              <div>
                <Label htmlFor="intended_solutions">What solutions were you hoping to provide?</Label>
                <Textarea
                  id="intended_solutions"
                  name="intended_solutions"
                  value={formData.intended_solutions}
                  onChange={handleInputChange}
                  placeholder="Describe the problems you're solving..."
                  rows={3}
                />
                <p className="text-sm text-power100-grey mt-1">Directly connects to contractor pain points</p>
              </div>

              <div>
                <Label htmlFor="author_next_focus">What are you focused on for the next 12-18 months?</Label>
                <Textarea
                  id="author_next_focus"
                  name="author_next_focus"
                  value={formData.author_next_focus}
                  onChange={handleInputChange}
                  placeholder="Your upcoming focus areas..."
                  rows={3}
                />
                <p className="text-sm text-power100-grey mt-1">Identifies partnership and speaking opportunities</p>
              </div>

              <div>
                <Label htmlFor="book_goals">What are you hoping the book helps you accomplish?</Label>
                <Textarea
                  id="book_goals"
                  name="book_goals"
                  value={formData.book_goals}
                  onChange={handleInputChange}
                  placeholder="Your goals for the book..."
                  rows={3}
                />
                <p className="text-sm text-power100-grey mt-1">Aligns your goals with contractor success</p>
              </div>

              <div>
                <Label htmlFor="sample_chapter_link">Sample Chapter Link</Label>
                <Input
                  id="sample_chapter_link"
                  name="sample_chapter_link"
                  value={formData.sample_chapter_link}
                  onChange={handleInputChange}
                  placeholder="Link to a sample chapter or excerpt"
                />
                <p className="text-sm text-power100-grey mt-1">Gives contractors a preview of your content</p>
              </div>

              <div>
                <Label htmlFor="table_of_contents">Table of Contents</Label>
                <Textarea
                  id="table_of_contents"
                  name="table_of_contents"
                  value={formData.table_of_contents}
                  onChange={handleInputChange}
                  placeholder="Paste your table of contents here"
                  rows={4}
                />
                <p className="text-sm text-power100-grey mt-1">Helps contractors understand the book's structure</p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-power100-black">Engagement Options</h2>
              <p className="text-power100-grey mt-2">
                How else can contractors engage with you? (all optional)
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="author_availability">Author Availability</Label>
                <Select 
                  value={formData.author_availability} 
                  onValueChange={(value) => handleSelectChange('author_availability', value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select availability" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="actively_seeking">Actively Seeking Engagements</SelectItem>
                    <SelectItem value="selectively_available">Selectively Available</SelectItem>
                    <SelectItem value="not_available">Not Available</SelectItem>
                    <SelectItem value="through_company">Engage Through Company</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-power100-grey mt-1">Opens doors for live engagements</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-green-800 font-semibold mb-2">Books with engagement options generate 5x more partnerships</p>
                <p className="text-green-700 text-sm">Authors who share their story see 40% higher engagement</p>
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
            onClick={onCancel || (() => router.push('/admindashboard/books'))}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100"
            aria-label="Cancel"
          >
            <X className="h-8 w-8" />
          </Button>

          {/* Progress indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map(step => (
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
                  {step < 5 && (
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
            
            {currentStep < 5 ? (
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
                  disabled={loading || (submissionType === 'author' && !formData.author_email)}
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
                  disabled={loading || (submissionType === 'author' && !formData.author_email)}
                  className="flex-1 bg-power100-green hover:bg-green-600 text-white font-semibold"
                >
                  {loading ? 'Submitting...' : 'Submit Complete Profile'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(true)}
                  disabled={loading || (submissionType === 'author' && !formData.author_email)}
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
                onClick={() => setCurrentStep(2)}
                className="text-power100-grey hover:text-power100-black"
              >
                Skip to Contact Info →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}