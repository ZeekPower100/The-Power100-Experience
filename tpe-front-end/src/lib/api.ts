// API Service Layer for The Power100 Experience
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api';

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
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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

  // Get partner matches
  getMatches: (contractorId: string) =>
    apiRequest(`/contractors/${contractorId}/matches`),

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

  // Get contractor stats
  getStats: () => apiRequest('/contractors/stats/overview'),
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