'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BookForm from '@/components/admin/BookForm';
import { BookOpen, ArrowLeft, Edit, User, Calendar, Link } from 'lucide-react';
import { bookApi } from '@/lib/api';

export default function BookDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchBook();
    }
  }, [params.id]);

  const fetchBook = async () => {
    try {
      const data = await bookApi.get(params.id as string);
      setBook(data);
    } catch (error) {
      console.error('Error fetching book:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = () => {
    fetchBook();
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <p>Loading book details...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <p>Book not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (editMode) {
    return (
      <div className="min-h-screen bg-power100-bg-grey p-8">
        <div className="max-w-7xl mx-auto">
          <BookForm 
            book={book} 
            onSuccess={handleUpdate}
            onCancel={() => setEditMode(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => setEditMode(true)} className="bg-power100-green">
            <Edit className="mr-2 h-4 w-4" />
            Edit Book
          </Button>
        </div>

        {/* Main Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {book.book_cover_url && (
                  <img src={book.book_cover_url} alt={book.title} className="w-24 h-32 object-cover rounded" />
                )}
                <div>
                  <CardTitle className="text-2xl">{book.title}</CardTitle>
                  <p className="text-gray-600">by {book.author}</p>
                  <Badge className={book.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {book.status || 'pending_review'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {book.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-600">{book.description}</p>
              </div>
            )}
            
            {book.amazon_url && (
              <div>
                <h3 className="font-semibold mb-2">Amazon Link</h3>
                <a href={book.amazon_url} target="_blank" rel="noopener noreferrer" className="text-power100-red hover:underline">
                  {book.amazon_url}
                </a>
              </div>
            )}

            {book.focus_areas && (() => {
              let areas = [];
              try {
                areas = Array.isArray(book.focus_areas) ? book.focus_areas : 
                        typeof book.focus_areas === 'string' ? JSON.parse(book.focus_areas) : [];
              } catch (e) {
                areas = [];
              }
              return areas.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-2">Focus Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {areas.map((area: string) => (
                      <Badge key={area} variant="secondary">
                        {area.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {book.key_takeaways && (() => {
              let takeaways = [];
              try {
                takeaways = Array.isArray(book.key_takeaways) ? book.key_takeaways : 
                           typeof book.key_takeaways === 'string' ? JSON.parse(book.key_takeaways) : [];
              } catch (e) {
                takeaways = [];
              }
              return takeaways.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-2">Key Takeaways</h3>
                  <ul className="list-disc list-inside text-gray-600">
                    {takeaways.map((takeaway: string, index: number) => (
                      <li key={index}>{takeaway}</li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}
          </CardContent>
        </Card>

        {/* Submitter Info Card */}
        {book.submitter_name && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submitter Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Name:</strong> {book.submitter_name}</p>
              <p><strong>Email:</strong> {book.submitter_email}</p>
              {book.submitter_phone && <p><strong>Phone:</strong> {book.submitter_phone}</p>}
              {book.submitter_company && <p><strong>Company:</strong> {book.submitter_company}</p>}
              <p><strong>Is Author:</strong> {book.is_author ? 'Yes' : 'No'}</p>
              {book.created_at && (
                <p><strong>Submitted:</strong> {new Date(book.created_at).toLocaleDateString()}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}