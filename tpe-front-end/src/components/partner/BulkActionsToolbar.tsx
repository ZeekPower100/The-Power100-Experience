'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  X,
  CheckSquare,
  Download,
  RefreshCw,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  onBulkStatusUpdate: (newStatus: string) => void;
  onExport: () => void;
}

const STAGE_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'nurturing', label: 'Nurturing' },
];

export default function BulkActionsToolbar({
  selectedCount,
  totalCount,
  onClearSelection,
  onBulkStatusUpdate,
  onExport
}: BulkActionsToolbarProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 px-8 py-4">
        <div className="flex items-center gap-6">
          {/* Selection Count */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-power100-red to-red-600 rounded-xl flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {selectedCount} of {totalCount} selected
              </p>
              <p className="text-xs text-gray-500">
                Bulk actions available
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-200"></div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Status Update */}
            <div className="relative">
              <Button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Update Status
              </Button>

              {/* Status Dropdown */}
              {showStatusMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-2xl border-2 border-gray-200 py-2 min-w-[200px] z-50">
                  <div className="px-3 py-2 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Change Status To</p>
                  </div>
                  {STAGE_OPTIONS.map((stage) => (
                    <button
                      key={stage.value}
                      onClick={() => {
                        onBulkStatusUpdate(stage.value);
                        setShowStatusMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 hover:text-power100-red"
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export */}
            <Button
              onClick={onExport}
              className="bg-gradient-to-r from-power100-green to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>

            {/* Clear Selection */}
            <Button
              onClick={onClearSelection}
              variant="outline"
              className="px-6 py-3 rounded-xl border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 font-semibold transition-all duration-300 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Click outside to close status menu */}
      {showStatusMenu && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowStatusMenu(false)}
        ></div>
      )}
    </div>
  );
}
