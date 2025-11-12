import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '../utils/jsonHelpers';

// API Service Layer for The Power100 Experience - Updated for port 5000
// Use relative URL in production if NEXT_PUBLIC_API_URL is not set
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? '/api'  // Use relative path in production
    : 'http://localhost:5000/api'); // Use localhost for development

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Defensive check: ensure endpoint is valid
  if (!endpoint || typeof endpoint !== 'string') {
    throw new Error('Invalid endpoint provided to apiRequest');
  }

  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  // IMPORTANT: We need to determine which token to use based on the current page context
  let token = null;

  // Check what page we're on to determine which token to use
  const currentPath = typeof window !== 'undefined' ? (window.location?.pathname || '') : '';
  const isAdminPage = currentPath && (currentPath.includes('/admindashboard') ||
                      currentPath.includes('/admin'));
  const isPartnerPage = currentPath && currentPath.includes('/partner');
  const isContractorFlow = currentPath && (currentPath.includes('/contractorflow') ||
                           currentPath.includes('/focus') ||
                           currentPath.includes('/profile') ||
                           currentPath.includes('/matching') ||
                           currentPath.includes('/ai-concierge'));

  // Priority order for token selection based on context:
  if (isAdminPage) {
    // On admin pages, ALWAYS use admin token only
    token = getFromStorage('authToken') || getFromStorage('adminToken');
  } else if (isPartnerPage) {
    // On partner pages, use partner token
    token = getFromStorage('partnerToken');
  } else if (isContractorFlow) {
    // On contractor flow pages, use contractor token or session
    // First check for direct contractor token (for authenticated contractors)
    token = getFromStorage('contractorToken');
    console.log('🔍 AI Concierge - contractorToken:', token ? 'Found' : 'Not found');

    // If no direct token, check for contractor session (for flow completion)
    if (!token) {
      const sessionData = getFromStorage('tpe_contractor_session');
      console.log('🔍 AI Concierge - sessionData:', sessionData ? 'Found' : 'Not found');
      if (sessionData) {
        try {
          const parsed = safeJsonParse(sessionData);
          token = parsed.token;
          console.log('🔍 AI Concierge - session token:', token ? 'Extracted' : 'Not found in session');
        } catch (e) {
          console.error('Failed to parse contractor session:', e);
        }
      }
    }
  } else {
    // For other pages or API calls without clear context,
    // check endpoint patterns to determine which token to use
    const isAdminEndpoint = endpoint && (endpoint.includes('/contractors') ||
                            endpoint.includes('/partners') ||
                            endpoint.includes('/bookings') ||
                            endpoint.includes('/events') ||
                            endpoint.includes('/books') ||
                            endpoint.includes('/podcasts') ||
                            endpoint.includes('/admin') ||
                            endpoint.includes('/auth') ||
                            endpoint.includes('/partners-enhanced') ||
                            endpoint.includes('/contractors-enhanced'));

    if (isAdminEndpoint) {
      // Admin API endpoints need admin token
      token = getFromStorage('authToken') || getFromStorage('adminToken');
    } else {
      // Check for contractor endpoints (ai-concierge, etc.)
      const isContractorEndpoint = endpoint && endpoint.includes('/ai-concierge');

      if (isContractorEndpoint) {
        // For contractor endpoints, try contractor token first
        token = getFromStorage('contractorToken');
      }

      // If no contractor token, check for contractor session
      if (!token) {
        const sessionData = getFromStorage('tpe_contractor_session');
        if (sessionData) {
          try {
            const parsed = safeJsonParse(sessionData);
            token = parsed.token;
          } catch (e) {
            // Fall back to admin token if session parse fails
            token = getFromStorage('authToken') || getFromStorage('adminToken');
          }
        } else {
          // No contractor session, use admin token if available
          token = getFromStorage('authToken') || getFromStorage('adminToken');
        }
      }
    }
  }
  
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    // Debug logging for token authentication
    console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
    console.log(`📡 Current page: ${currentPath}`);
    console.log(`📡 Token source: ${isAdminPage ? 'Admin' : isPartnerPage ? 'Partner' : isContractorFlow ? 'Contractor' : 'Auto-detected'}`);
    console.log(`📡 Auth token: ${config.headers?.['Authorization'] ? 'Present' : 'Missing'}`);
    if (token) {
      console.log(`📡 Token (first 20 chars): ${token.substring(0, 20)}...`);
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorData: any = {};
      const contentType = response.headers.get('content-type');

      // Only try to parse JSON if the response is actually JSON
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('Failed to parse error response as JSON');
        }
      }
      
      console.error(`❌ API Error Response:`, response.status, errorData);
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

// Contractor API
export const contractorApi = {
  // Start verification process
  startVerification: (data: {
    name: string;
    email: string;
    phone: string;
    company_name: string;
    company_website?: string;
  }) => apiRequest('/contractors/verify-start', {
    method: 'POST',
    body: safeJsonStringify(data)
  }),

  // Verify SMS code
  verifyCode: (contractorId: string, code: string) => 
    apiRequest('/contractors/verify-code', {
      method: 'POST',
      body: safeJsonStringify({ contractor_id: contractorId, code })
    }),

  // Update contractor profile
  updateProfile: (contractorId: string, data: Record<string, unknown>) =>
    apiRequest(`/contractors/${contractorId}/profile`, {
      method: 'PUT',
      body: safeJsonStringify(data)
    }),

  // Update contractor (admin)
  update: (contractorId: string, data: Record<string, unknown>) =>
    apiRequest(`/contractors/${contractorId}`, {
      method: 'PUT',
      body: safeJsonStringify(data)
    }),

  // Get partner matches
  getMatches: (contractorId: string, focusAreaIndex: number = 0) =>
    apiRequest(`/contractors/${contractorId}/matches?focusAreaIndex=${focusAreaIndex}`),

  // Get all matched content (books, podcasts, events, partners)
  getAllMatches: (contractorId: string) =>
    apiRequest(`/matching/contractors/${contractorId}/matches/all`),

  // Complete contractor flow
  completeFlow: (contractorId: string, selectedPartnerId?: string) =>
    apiRequest(`/contractors/${contractorId}/complete`, {
      method: 'POST',
      body: safeJsonStringify({ selected_partner_id: selectedPartnerId })
    }),

  // Get all contractors (admin)
  getAll: (params?: { stage?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.stage) searchParams.set('stage', params.stage);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    const query = searchParams.toString();
    return apiRequest(`/contractors${query ? `?${query}` : ''}`);
  },

  // Get single contractor (admin)
  getById: (id: string) => apiRequest(`/contractors/${id}`),

  // Get contractor stats
  getStats: () => apiRequest('/contractors/stats/overview'),

  // Search contractors with advanced filters
  search: (params: Record<string, any>) => 
    apiRequest('/contractors/search', {
      method: 'POST',
      body: safeJsonStringify(params)
    }),

  // Delete contractor (admin)
  delete: (id: string) => apiRequest(`/contractors/${id}`, {
    method: 'DELETE'
  }),
};

// Partner API
export const partnerApi = {
  // Get active partners (public)
  getActive: () => apiRequest('/partners/active'),

  // Get all partners (admin)
  getAll: (params?: { active?: boolean; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.active !== undefined) searchParams.set('active', params.active.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    const query = searchParams.toString();
    return apiRequest(`/partners${query ? `?${query}` : ''}`);
  },

  // Get single partner
  getById: (id: string) => apiRequest(`/partners/${id}`),

  // Create partner (admin)
  create: (data: Record<string, unknown>) => apiRequest('/partners', {
    method: 'POST',
    body: safeJsonStringify(data)
  }),

  // Update partner (admin)
  update: (id: string, data: Record<string, unknown>) => apiRequest(`/partners/${id}`, {
    method: 'PUT',
    body: safeJsonStringify(data)
  }),

  // Delete partner (admin)
  delete: (id: string) => apiRequest(`/partners/${id}`, {
    method: 'DELETE'
  }),

  // Toggle partner status (admin)
  toggleStatus: (id: string) => apiRequest(`/partners/${id}/toggle-status`, {
    method: 'PUT'
  }),

  // Get partner stats
  getStats: () => apiRequest('/partners/stats/overview'),

  // Search partners with advanced filters
  search: (params: Record<string, any>) =>
    apiRequest('/partners/search', {
      method: 'POST',
      body: safeJsonStringify(params)
    }),

  // Partner self-service profile update (uses partner JWT or admin JWT with partnerId in body)
  updateProfile: (data: Record<string, unknown>) => apiRequest('/partner-portal/profile', {
    method: 'PUT',
    body: safeJsonStringify(data)
  }),

  // Get pending partners (admin)
  getPendingPartners: () => apiRequest('/partners/pending/list'),

  // Approve partner (admin)
  approvePartner: (id: string) => apiRequest(`/partners/${id}/approve`, {
    method: 'PUT'
  }),

  // Phase 3: Lead Management
  // Get partner's leads with optional filters
  getLeads: (params?: {
    engagement_stage?: string;
    status?: string;
    min_score?: number;
    max_score?: number;
    search?: string;
    primary_only?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.engagement_stage) searchParams.set('engagement_stage', params.engagement_stage);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.min_score) searchParams.set('min_score', params.min_score.toString());
    if (params?.max_score) searchParams.set('max_score', params.max_score.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.primary_only) searchParams.set('primary_only', 'true');
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    return apiRequest(`/partner-portal/leads${queryString ? `?${queryString}` : ''}`);
  },

  // Get lead statistics
  getLeadStats: () => apiRequest('/partner-portal/leads/stats'),

  // Get specific lead details
  getLeadDetails: (leadId: string | number) => apiRequest(`/partner-portal/leads/${leadId}`),

  // Update lead status
  updateLeadStatus: (leadId: string | number, data: {
    engagement_stage?: string;
    status?: string;
    next_follow_up_date?: string | null;
  }) => apiRequest(`/partner-portal/leads/${leadId}/status`, {
    method: 'PUT',
    body: safeJsonStringify(data)
  }),

  // Add note to lead
  addLeadNote: (leadId: string | number, data: {
    note_type?: string;
    content: string;
  }) => apiRequest(`/partner-portal/leads/${leadId}/notes`, {
    method: 'POST',
    body: safeJsonStringify(data)
  }),
};

// Booking API
export const bookingApi = {
  // Get all bookings (admin)
  getAll: (params?: { status?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    
    const query = searchParams.toString();
    return apiRequest(`/bookings${query ? `?${query}` : ''}`);
  },

  // Get single booking (admin)
  getById: (id: string) => apiRequest(`/bookings/${id}`),

  // Update booking (admin)
  update: (id: string, data: Record<string, unknown>) => apiRequest(`/bookings/${id}`, {
    method: 'PUT',
    body: safeJsonStringify(data)
  }),

  // Delete booking (admin)
  delete: (id: string) => apiRequest(`/bookings/${id}`, {
    method: 'DELETE'
  }),

  // Get booking stats
  getStats: () => apiRequest('/bookings/stats/overview'),
};

// Auth API
export const authApi = {
  // Login
  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: safeJsonStringify({ email, password })
    }),

  // Logout
  logout: () => apiRequest('/auth/logout', {
    method: 'POST'
  }),

  // Get current user
  getMe: () => apiRequest('/auth/me'),

  // Update password
  updatePassword: (currentPassword: string, newPassword: string) =>
    apiRequest('/auth/update-password', {
      method: 'PUT',
      body: safeJsonStringify({ currentPassword, newPassword })
    }),
};

// Admin API
export const adminApi = {
  // Get dashboard stats
  getDashboard: () => apiRequest('/admin/dashboard'),

  // Routing metrics endpoints
  getRoutingMetricsRealtime: () => apiRequest('/admin/routing-metrics/realtime'),

  getRoutingMetricsHistorical: (hours: number = 24) =>
    apiRequest(`/admin/routing-metrics/historical?hours=${hours}`),

  resetRoutingMetrics: () => apiRequest('/admin/routing-metrics/reset', {
    method: 'POST'
  }),

  // Export data
  exportContractors: (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params || {});
    return apiRequest(`/admin/export/contractors?${searchParams.toString()}`);
  },

  exportPartners: (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params || {});
    return apiRequest(`/admin/export/partners?${searchParams.toString()}`);
  },

  exportBookings: (params?: Record<string, string>) => {
    const searchParams = new URLSearchParams(params || {});
    return apiRequest(`/admin/export/bookings?${searchParams.toString()}`);
  },
};

// Bulk Operations API
export const bulkApi = {
  // Bulk update contractors
  updateContractors: (ids: string[], updateData: Record<string, any>) =>
    apiRequest('/bulk/contractors/update', {
      method: 'POST',
      body: safeJsonStringify({ contractor_ids: ids, updates: updateData })
    }),

  // Bulk delete contractors
  deleteContractors: (ids: string[]) =>
    apiRequest('/bulk/contractors/delete', {
      method: 'POST',
      body: safeJsonStringify({ contractor_ids: ids })
    }),

  // Bulk update partners
  updatePartners: (ids: string[], updateData: Record<string, any>) =>
    apiRequest('/bulk/partners/update', {
      method: 'POST',
      body: safeJsonStringify({ partner_ids: ids, updates: updateData })
    }),

  // Bulk toggle partner status (partners don't support delete - use toggle status instead)
  togglePartnerStatus: (ids: string[]) =>
    apiRequest('/bulk/partners/toggle-status', {
      method: 'POST',
      body: safeJsonStringify({ partner_ids: ids })
    }),

  // Export bulk data
  exportContractors: (params: { contractor_ids?: string[]; format?: string } | string[]) => {
    // Handle both array of IDs and params object
    const requestBody = Array.isArray(params) 
      ? { contractor_ids: params, format: 'csv' }
      : { contractor_ids: params.contractor_ids || [], format: params.format || 'csv' };
    
    return apiRequest('/bulk/contractors/export', {
      method: 'POST',
      body: safeJsonStringify(requestBody)
    });
  },

  exportPartners: (params: { partner_ids?: string[]; format?: string } | string[]) => {
    // Handle both array of IDs and params object
    const requestBody = Array.isArray(params) 
      ? { partner_ids: params, format: 'csv' }
      : { partner_ids: params.partner_ids || [], format: params.format || 'csv' };
    
    return apiRequest('/bulk/partners/export', {
      method: 'POST',
      body: safeJsonStringify(requestBody)
    });
  },
};

// Utility functions
export const apiUtils = {
  // Store auth token
  setAuthToken: (token: string) => {
    setToStorage('authToken', token);
  },

  // Remove auth token
  removeAuthToken: () => {
    localStorage.removeItem('authToken');
  },

  // Get auth token
  getAuthToken: () => {
    return getFromStorage('authToken');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!getFromStorage('authToken');
  },
};

// Book API
export const bookApi = {
  // Get all books
  getAll: () => apiRequest('/books'),
  
  // Get pending books
  getPending: () => apiRequest('/books/pending'),
  
  // Get single book
  get: (id: string) => apiRequest(`/books/${id}`),
  
  // Create book (public submission - no auth)
  create: (data: any) => {
    // Make direct fetch without auth for public submission
    const url = `${API_BASE_URL}/books/submit`;
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: safeJsonStringify(data)
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    });
  },
  
  // Update book
  update: (id: string, data: any) => apiRequest(`/books/${id}`, {
    method: 'PUT',
    body: safeJsonStringify(data)
  }),
  
  // Delete book
  delete: (id: string) => apiRequest(`/books/${id}`, { method: 'DELETE' }),
  
  // Approve book
  approve: (id: string) => apiRequest(`/books/${id}/approve`, { method: 'PUT' })
};

// Podcast API
export const podcastApi = {
  // Get all podcasts
  getAll: () => apiRequest('/podcasts'),
  
  // Get pending podcasts
  getPending: () => apiRequest('/podcasts/pending'),
  
  // Get single podcast
  get: (id: string) => apiRequest(`/podcasts/${id}`),
  
  // Create podcast (public submission - no auth)
  create: (data: any) => {
    // Make direct fetch without auth for public submission
    const url = `${API_BASE_URL}/podcasts/submit`;
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: safeJsonStringify(data)
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    });
  },
  
  // Update podcast
  update: (id: string, data: any) => apiRequest(`/podcasts/${id}`, {
    method: 'PUT',
    body: safeJsonStringify(data)
  }),
  
  // Delete podcast
  delete: (id: string) => apiRequest(`/podcasts/${id}`, { method: 'DELETE' }),
  
  // Approve podcast
  approve: (id: string) => apiRequest(`/podcasts/${id}/approve`, { method: 'PUT' })
};


// Event API
export const eventApi = {
  // Get all events
  getAll: () => apiRequest('/events'),
  
  // Get pending events
  getPending: () => apiRequest('/events/pending'),
  
  // Get single event
  get: (id: string) => apiRequest(`/events/${id}`),
  
  // Create event (public submission - no auth)
  create: (data: any) => {
    // Make direct fetch without auth for public submission
    const url = `${API_BASE_URL}/events/submit`;
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: safeJsonStringify(data)
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    });
  },
  
  // Update event
  update: (id: string, data: any) => apiRequest(`/events/${id}`, {
    method: 'PUT',
    body: safeJsonStringify(data)
  }),
  
  // Delete event
  delete: (id: string) => apiRequest(`/events/${id}`, { method: 'DELETE' }),
  
  // Approve event
  approve: (id: string) => apiRequest(`/events/${id}/approve`, { method: 'PUT' })
};

// AI Concierge API
export const aiConciergeApi = {
  // Send message to AI Concierge
  sendMessage: async (content: string, conversationId?: string, mediaFile?: File) => {
    const formData = new FormData();
    formData.append('content', content);
    if (conversationId) {
      formData.append('conversationId', conversationId);
    }
    if (mediaFile) {
      formData.append('media', mediaFile);
      formData.append('mediaType', mediaFile.type.split('/')[0]);
    }

    return fetch(`${API_BASE_URL}/ai-concierge/message`, {
      method: 'POST',
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
        'Authorization': `Bearer ${getFromStorage('contractorToken') || getFromStorage('authToken')}`
      },
      body: formData
    }).then(handleApiResponse);
  },

  // Get conversation history
  getConversations: () => apiRequest('/ai-concierge/conversations'),

  // Get specific conversation
  getConversation: (id: string) => apiRequest(`/ai-concierge/conversations/${id}`),

  // Provide feedback on AI response
  provideFeedback: (messageId: string, feedback: { helpful: boolean; rating?: number; feedback?: string }) =>
    apiRequest(`/ai-concierge/feedback/${messageId}`, {
      method: 'POST',
      body: safeJsonStringify(feedback)
    }),

  // Check AI Concierge access
  checkAccess: () => apiRequest('/ai-concierge/access-status')
};

// Admin Controls API - Event Control Center
// DATABASE-CHECKED: events, admin_sms_commands, event_messages columns verified on 2025-10-03
export const adminControlsApi = {
  // Get active events
  getActiveEvents: () =>
    apiRequest('/admin-controls/active-events'),

  // Get event message statistics
  getEventMessageStats: () =>
    apiRequest('/admin-controls/event-message-stats'),

  // Get recent SMS commands
  getRecentSMSCommands: (limit: number = 20) =>
    apiRequest(`/admin-controls/recent-commands?limit=${limit}`),

  // Event Detail Page APIs
  // Get comprehensive event details
  getEventDetails: (eventId: number) =>
    apiRequest(`/admin-controls/event/${eventId}`),

  // Get message history/timeline
  getEventMessageHistory: (eventId: number, limit: number = 50) =>
    apiRequest(`/admin-controls/event/${eventId}/messages?limit=${limit}`),

  // Get upcoming scheduled messages
  getUpcomingMessages: (eventId: number, limit: number = 10) =>
    apiRequest(`/admin-controls/event/${eventId}/upcoming?limit=${limit}`),

  // Get failed messages
  getFailedMessages: (eventId: number) =>
    apiRequest(`/admin-controls/event/${eventId}/failed`)
};

// Partner Portal API - Partner Self-Service
// DATABASE-CHECKED: strategic_partners columns verified on 2025-11-11
export const partnerPortalApi = {
  // Get own profile
  getProfile: () =>
    apiRequest('/partner-portal/profile'),

  // Update own profile
  updateProfile: (profileData: any) =>
    apiRequest('/partner-portal/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    }),

  // Get dashboard data (already exists)
  getDashboard: () =>
    apiRequest('/partner-portal/dashboard'),

  // Analytics endpoints (already exist)
  getQuarterlyAnalytics: () =>
    apiRequest('/partner-portal/analytics/quarterly'),

  getCategoryPerformance: () =>
    apiRequest('/partner-portal/analytics/categories'),

  getFeedbackSummary: () =>
    apiRequest('/partner-portal/analytics/feedback'),

  getContractorStats: () =>
    apiRequest('/partner-portal/analytics/contractor-stats')
};