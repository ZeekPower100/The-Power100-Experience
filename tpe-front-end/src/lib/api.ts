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
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  // Use appropriate token based on endpoint context
  let token = null;
  
  // Check if this is an admin/auth endpoint
  const isAdminEndpoint = endpoint.includes('/admin') || 
                          endpoint.includes('/auth') || 
                          endpoint.includes('/partners-enhanced') ||
                          endpoint.includes('/contractors-enhanced');
  
  if (isAdminEndpoint) {
    // For admin endpoints, only use admin tokens
    token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  } else {
    // For contractor endpoints, check contractor session first
    const sessionData = localStorage.getItem('tpe_contractor_session');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        token = parsed.token;
      } catch (e) {
        // Fall back to admin token if session parse fails
        token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
      }
    } else {
      // No contractor session, use admin token if available
      token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
    }
  }
  
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    // Uncomment for debugging API requests
    // console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
    // console.log(`📡 Auth token: ${config.headers?.['Authorization'] ? 'Present' : 'Missing'}`);
    
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
    body: JSON.stringify(data)
  }),

  // Verify SMS code
  verifyCode: (contractorId: string, code: string) => 
    apiRequest('/contractors/verify-code', {
      method: 'POST',
      body: JSON.stringify({ contractor_id: contractorId, code })
    }),

  // Update contractor profile
  updateProfile: (contractorId: string, data: Record<string, unknown>) =>
    apiRequest(`/contractors/${contractorId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Update contractor (admin)
  update: (contractorId: string, data: Record<string, unknown>) =>
    apiRequest(`/contractors/${contractorId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
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
      body: JSON.stringify({ selected_partner_id: selectedPartnerId })
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
      body: JSON.stringify(params)
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
    body: JSON.stringify(data)
  }),

  // Update partner (admin)
  update: (id: string, data: Record<string, unknown>) => apiRequest(`/partners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
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
      body: JSON.stringify(params)
    }),

  // Get pending partners (admin)
  getPendingPartners: () => apiRequest('/partners/pending/list'),

  // Approve partner (admin)
  approvePartner: (id: string) => apiRequest(`/partners/${id}/approve`, {
    method: 'PUT'
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
    body: JSON.stringify(data)
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
      body: JSON.stringify({ email, password })
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
      body: JSON.stringify({ currentPassword, newPassword })
    }),
};

// Admin API
export const adminApi = {
  // Get dashboard stats
  getDashboard: () => apiRequest('/admin/dashboard'),

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
      body: JSON.stringify({ contractor_ids: ids, updates: updateData })
    }),

  // Bulk delete contractors
  deleteContractors: (ids: string[]) =>
    apiRequest('/bulk/contractors/delete', {
      method: 'POST',
      body: JSON.stringify({ contractor_ids: ids })
    }),

  // Bulk update partners
  updatePartners: (ids: string[], updateData: Record<string, any>) =>
    apiRequest('/bulk/partners/update', {
      method: 'POST',
      body: JSON.stringify({ partner_ids: ids, updates: updateData })
    }),

  // Bulk toggle partner status (partners don't support delete - use toggle status instead)
  togglePartnerStatus: (ids: string[]) =>
    apiRequest('/bulk/partners/toggle-status', {
      method: 'POST',
      body: JSON.stringify({ partner_ids: ids })
    }),

  // Export bulk data
  exportContractors: (params: { contractor_ids?: string[]; format?: string } | string[]) => {
    // Handle both array of IDs and params object
    const requestBody = Array.isArray(params) 
      ? { contractor_ids: params, format: 'csv' }
      : { contractor_ids: params.contractor_ids || [], format: params.format || 'csv' };
    
    return apiRequest('/bulk/contractors/export', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },

  exportPartners: (params: { partner_ids?: string[]; format?: string } | string[]) => {
    // Handle both array of IDs and params object
    const requestBody = Array.isArray(params) 
      ? { partner_ids: params, format: 'csv' }
      : { partner_ids: params.partner_ids || [], format: params.format || 'csv' };
    
    return apiRequest('/bulk/partners/export', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },
};

// Utility functions
export const apiUtils = {
  // Store auth token
  setAuthToken: (token: string) => {
    localStorage.setItem('authToken', token);
  },

  // Remove auth token
  removeAuthToken: () => {
    localStorage.removeItem('authToken');
  },

  // Get auth token
  getAuthToken: () => {
    return localStorage.getItem('authToken');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
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
      body: JSON.stringify(data)
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    });
  },
  
  // Update book
  update: (id: string, data: any) => apiRequest(`/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
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
      body: JSON.stringify(data)
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    });
  },
  
  // Update podcast
  update: (id: string, data: any) => apiRequest(`/podcasts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
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
      body: JSON.stringify(data)
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    });
  },
  
  // Update event
  update: (id: string, data: any) => apiRequest(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // Delete event
  delete: (id: string) => apiRequest(`/events/${id}`, { method: 'DELETE' }),
  
  // Approve event
  approve: (id: string) => apiRequest(`/events/${id}/approve`, { method: 'PUT' })
};