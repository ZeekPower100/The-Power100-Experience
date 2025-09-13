'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  ArrowLeft 
} from 'lucide-react';
import BookForm from '@/components/admin/BookForm';
import { Book } from '@/lib/types/book';
import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../../../utils/jsonHelpers';

export default function BooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | undefined>(undefined);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      
      const response = await fetch('/api/books', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await handleApiResponse(response);
        setBooks(data);
      } else {
        console.error('Failed to fetch books:', response.status);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      const token = getFromStorage('authToken') || getFromStorage('adminToken');
      
      const response = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await fetchBooks();
      }
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const filteredBooks = books.filter(book => 
    book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showForm) {
    return (
      <BookForm
        book={selectedBook}
        onSuccess={() => {
          setShowForm(false);
          setSelectedBook(undefined);
          fetchBooks();
        }}
        onCancel={() => {
          setShowForm(false);
          setSelectedBook(undefined);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-power100-bg-grey p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/admindashboard')}
              className="hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-power100-black">Books Management</h1>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-power100-green hover:bg-green-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Book
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search books by title, author, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-power100-green"></div>
            <p className="mt-4 text-power100-grey">Loading books...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No books found matching your search.' : 'No books added yet.'}
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-power100-green hover:bg-green-600 text-white"
              >
                Add First Book
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map(book => (
              <Card key={book.id} className="bg-white hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{book.title || 'Untitled'}</CardTitle>
                      <p className="text-sm text-power100-grey mt-1">by {book.author || 'Unknown Author'}</p>
                    </div>
                    <Badge 
                      variant={
                        book.status === 'draft' 
                          ? 'outline' 
                          : book.is_active 
                            ? 'default' 
                            : 'secondary'
                      }
                    >
                      {book.status === 'draft' 
                        ? 'Draft' 
                        : book.is_active 
                          ? 'Active' 
                          : 'Inactive'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {book.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{book.description}</p>
                  )}
                  
                  {book.focus_areas_covered && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Focus Areas:</p>
                      <div className="flex flex-wrap gap-1">
                        {book.focus_areas_covered.split(',').slice(0, 3).map((area, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {area.trim()}
                          </Badge>
                        ))}
                        {book.focus_areas_covered.split(',').length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{book.focus_areas_covered.split(',').length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBook(book);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {book.amazon_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(book.amazon_url, '_blank')}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => book.id && handleDelete(book.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}