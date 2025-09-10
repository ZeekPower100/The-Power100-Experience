'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Trash2, BookOpen } from 'lucide-react';
import { bookApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface PendingBook {
  id: number;
  title: string;
  author: string;
  submitter_name?: string;
  submitter_email?: string;
  status: string;
  created_at: string;
  is_author: boolean;
  description?: string;
  focus_areas?: string[];
}

export default function PendingBooks() {
  const [books, setBooks] = useState<PendingBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPendingBooks();
  }, []);

  const fetchPendingBooks = async () => {
    try {
      const data = await bookApi.getPending();
      setBooks(data.books || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const approveBook = async (bookId: number) => {
    if (!confirm('Are you sure you want to approve this book?')) {
      return;
    }

    try {
      await bookApi.approve(bookId.toString());
      
      // Refresh the list
      await fetchPendingBooks();
      alert('Book approved successfully!');
    } catch (err: any) {
      alert(`Error approving book: ${err.message}`);
    }
  };

  const deleteBook = async (bookId: number, bookTitle: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${bookTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await bookApi.delete(bookId.toString());
      
      // Refresh the list
      await fetchPendingBooks();
      alert('Book deleted successfully!');
    } catch (err: any) {
      alert(`Error deleting book: ${err.message}`);
    }
  };

  const viewBook = (bookId: number) => {
    router.push(`/admindashboard/books/${bookId}`);
  };

  const getSubmitterInfo = (book: PendingBook) => {
    if (book.is_author) {
      return <span className="text-xs text-green-600">Submitted by Author</span>;
    }
    return <span className="text-xs text-gray-600">Submitted by: {book.submitter_name || 'Unknown'}</span>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Pending Books
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading pending books...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Pending Books
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">Error loading books: {error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Pending Books
          {books.length > 0 && (
            <Badge className="ml-2">{books.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {books.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pending books at this time
          </div>
        ) : (
          <div className="space-y-4">
            {books.map((book) => (
              <div
                key={book.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-power100-black">
                        {book.title}
                      </h3>
                      <Badge className="bg-blue-100 text-blue-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending Review
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      By {book.author}
                    </p>
                    
                    {getSubmitterInfo(book)}
                    
                    {book.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {book.description}
                      </p>
                    )}
                    
                    {book.focus_areas && book.focus_areas.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {book.focus_areas.slice(0, 3).map((area) => (
                          <Badge key={area} variant="secondary" className="text-xs">
                            {area.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {book.focus_areas.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{book.focus_areas.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Submitted: {new Date(book.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewBook(book.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="bg-power100-green hover:bg-green-700 text-white flex items-center gap-1"
                      onClick={() => approveBook(book.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteBook(book.id, book.title)}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}