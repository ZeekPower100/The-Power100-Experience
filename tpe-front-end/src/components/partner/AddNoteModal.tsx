'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  X,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle
} from 'lucide-react';

interface AddNoteModalProps {
  leadId: number | string;
  leadName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const NOTE_TYPES = [
  { value: 'call', label: 'Phone Call', icon: Phone, color: 'from-green-500 to-emerald-600' },
  { value: 'email', label: 'Email', icon: Mail, color: 'from-blue-500 to-cyan-600' },
  { value: 'meeting', label: 'Meeting', icon: Calendar, color: 'from-purple-500 to-violet-600' },
  { value: 'note', label: 'General Note', icon: FileText, color: 'from-gray-500 to-gray-600' },
];

export default function AddNoteModal({ leadId, leadName, onClose, onSuccess }: AddNoteModalProps) {
  const [noteType, setNoteType] = useState('call');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Please enter note content');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { partnerApi } = await import('@/lib/api');
      const response = await partnerApi.addLeadNote(leadId, {
        note_type: noteType,
        content: content.trim()
      });

      if (response.success) {
        onSuccess();
      } else {
        setError(response.message || 'Failed to add note');
      }
    } catch (err: any) {
      console.error('Error adding note:', err);
      setError(err.message || 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-cyan-50 px-8 py-6 border-b-2 border-blue-100">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-power100-red opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-xl">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="inline-block bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold mb-1">
                  ADD NOTE
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{leadName}</h2>
                <p className="text-sm text-gray-600">Record your interaction with this lead</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all duration-300 shadow-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Error Alert */}
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Note Type Selection */}
          <div>
            <Label className="text-base font-semibold text-gray-900 mb-3 block">
              Note Type
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {NOTE_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = noteType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setNoteType(type.value)}
                    className={`group relative p-4 rounded-xl border-2 transition-all duration-300 ${
                      isSelected
                        ? 'border-power100-red bg-red-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className={`inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br ${type.color} rounded-lg mb-2 ${
                      isSelected ? 'scale-110' : 'group-hover:scale-105'
                    } transition-transform`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className={`text-sm font-semibold ${
                      isSelected ? 'text-power100-red' : 'text-gray-700'
                    }`}>
                      {type.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note Content */}
          <div>
            <Label htmlFor="content" className="text-base font-semibold text-gray-900 mb-3 block">
              Note Details
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened during this interaction? Include key points, decisions, or next steps..."
              rows={8}
              className="w-full text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-300"
            />
            <p className="text-sm text-gray-500 mt-2">
              {content.length} characters
            </p>
          </div>
        </div>

        {/* Modern Action Buttons */}
        <div className="flex justify-end gap-4 px-8 pb-8">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
            className="px-8 py-6 rounded-full border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !content.trim()}
            className="group bg-gradient-to-r from-power100-green to-green-600 hover:from-green-600 hover:to-green-700 text-white px-10 py-6 rounded-full font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <MessageSquare className="h-5 w-5" />
                Save Note
                <CheckCircle className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
