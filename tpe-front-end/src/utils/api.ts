// Helper function for API calls
async function apiCall(url: string, method: string = 'GET', body?: any) {
  const token = localStorage.getItem('authToken') || localStorage.getItem('partnerToken') || localStorage.getItem('tpe_contractor_session');

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    ...(body && { body: JSON.stringify(body) })
  };

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Contractor Behavioral Tracking APIs
export const contractorBehavioralApi = {
  // Business Goals
  businessGoals: {
    create: (goal: any) => apiCall('/api/contractor-business-goals', 'POST', goal),
    getByContractor: (contractorId: string) => apiCall(`/api/contractor-business-goals/contractor/${contractorId}`),
    getById: (id: string) => apiCall(`/api/contractor-business-goals/${id}`),
    update: (id: string, data: any) => apiCall(`/api/contractor-business-goals/${id}`, 'PUT', data),
    updateProgress: (id: string, progress: number) => apiCall(`/api/contractor-business-goals/${id}/progress`, 'PUT', { progress }),
    delete: (id: string) => apiCall(`/api/contractor-business-goals/${id}`, 'DELETE'),
    getIncomplete: (contractorId: string) => apiCall(`/api/contractor-business-goals/contractor/${contractorId}/incomplete`)
  },

  // Challenges
  challenges: {
    create: (challenge: any) => apiCall('/api/contractor-challenges', 'POST', challenge),
    getByContractor: (contractorId: string) => apiCall(`/api/contractor-challenges/contractor/${contractorId}`),
    getById: (id: string) => apiCall(`/api/contractor-challenges/${id}`),
    update: (id: string, data: any) => apiCall(`/api/contractor-challenges/${id}`, 'PUT', data),
    resolve: (id: string) => apiCall(`/api/contractor-challenges/${id}/resolve`, 'PUT'),
    delete: (id: string) => apiCall(`/api/contractor-challenges/${id}`, 'DELETE'),
    getUnresolved: (contractorId: string) => apiCall(`/api/contractor-challenges/contractor/${contractorId}/unresolved`),
    addSolution: (id: string, solution: string) => apiCall(`/api/contractor-challenges/${id}/solution`, 'PUT', { solution })
  },

  // Communications
  communications: {
    create: (communication: any) => apiCall('/api/contractor-communications', 'POST', communication),
    getByContractor: (contractorId: string) => apiCall(`/api/contractor-communications/contractor/${contractorId}`),
    getById: (id: string) => apiCall(`/api/contractor-communications/${id}`),
    updateStatus: (id: string, status: string) => apiCall(`/api/contractor-communications/${id}/status`, 'PUT', { status }),
    getRecent: (contractorId: string, limit?: number) => apiCall(`/api/contractor-communications/contractor/${contractorId}/recent${limit ? `?limit=${limit}` : ''}`),
    getUnread: (contractorId: string) => apiCall(`/api/contractor-communications/contractor/${contractorId}/unread`),
    getStats: (contractorId: string) => apiCall(`/api/contractor-communications/contractor/${contractorId}/stats`),
    delete: (id: string) => apiCall(`/api/contractor-communications/${id}`, 'DELETE')
  },

  // Content Engagement
  contentEngagement: {
    create: (engagement: any) => apiCall('/api/contractor-content-engagement', 'POST', engagement),
    getByContractor: (contractorId: string) => apiCall(`/api/contractor-content-engagement/contractor/${contractorId}`),
    getById: (id: string) => apiCall(`/api/contractor-content-engagement/${id}`),
    update: (id: string, data: any) => apiCall(`/api/contractor-content-engagement/${id}`, 'PUT', data),
    updateProgress: (id: string, progress: number, timeSpent?: number) => apiCall(`/api/contractor-content-engagement/${id}/progress`, 'PUT', { progress, timeSpent }),
    addRating: (id: string, rating: number, notes?: string) => apiCall(`/api/contractor-content-engagement/${id}/rating`, 'PUT', { rating, notes }),
    getCompleted: (contractorId: string) => apiCall(`/api/contractor-content-engagement/contractor/${contractorId}/completed`),
    getStats: (contractorId: string) => apiCall(`/api/contractor-content-engagement/contractor/${contractorId}/stats`),
    delete: (id: string) => apiCall(`/api/contractor-content-engagement/${id}`, 'DELETE')
  },

  // Engagement Events
  engagementEvents: {
    create: (event: any) => apiCall('/api/contractor-engagement-events', 'POST', event),
    batchCreate: (events: any[]) => apiCall('/api/contractor-engagement-events/batch', 'POST', { events }),
    getByContractor: (contractorId: string) => apiCall(`/api/contractor-engagement-events/contractor/${contractorId}`),
    getByEventType: (contractorId: string, eventType: string) => apiCall(`/api/contractor-engagement-events/contractor/${contractorId}/type/${eventType}`),
    getBySession: (sessionId: string) => apiCall(`/api/contractor-engagement-events/session/${sessionId}`),
    getById: (id: string) => apiCall(`/api/contractor-engagement-events/${id}`),
    getRecent: (contractorId: string, limit?: number) => apiCall(`/api/contractor-engagement-events/contractor/${contractorId}/recent${limit ? `?limit=${limit}` : ''}`),
    getEventCounts: (contractorId: string) => apiCall(`/api/contractor-engagement-events/contractor/${contractorId}/counts`),
    getPatterns: (contractorId: string) => apiCall(`/api/contractor-engagement-events/contractor/${contractorId}/patterns`)
  },

  // Metrics History
  metricsHistory: {
    create: (metrics: any) => apiCall('/api/contractor-metrics-history', 'POST', metrics),
    batchCreate: (metrics: any[]) => apiCall('/api/contractor-metrics-history/batch', 'POST', { metrics }),
    getByContractor: (contractorId: string) => apiCall(`/api/contractor-metrics-history/contractor/${contractorId}`),
    getLatest: (contractorId: string) => apiCall(`/api/contractor-metrics-history/contractor/${contractorId}/latest`),
    getById: (id: string) => apiCall(`/api/contractor-metrics-history/${id}`),
    getTrend: (contractorId: string, limit?: number) => apiCall(`/api/contractor-metrics-history/contractor/${contractorId}/trend${limit ? `?limit=${limit}` : ''}`),
    getAtRisk: (threshold?: number) => apiCall(`/api/contractor-metrics-history/at-risk${threshold ? `?threshold=${threshold}` : ''}`),
    getHighPerformers: (threshold?: number) => apiCall(`/api/contractor-metrics-history/high-performers${threshold ? `?threshold=${threshold}` : ''}`),
    getAverage: (contractorId: string, days?: number) => apiCall(`/api/contractor-metrics-history/contractor/${contractorId}/average${days ? `?days=${days}` : ''}`),
    getChanges: (contractorId: string) => apiCall(`/api/contractor-metrics-history/contractor/${contractorId}/changes`)
  },

  // Recommendations
  recommendations: {
    create: (recommendation: any) => apiCall('/api/contractor-recommendations', 'POST', recommendation),
    batchCreate: (recommendations: any[]) => apiCall('/api/contractor-recommendations/batch', 'POST', { recommendations }),
    getByContractor: (contractorId: string) => apiCall(`/api/contractor-recommendations/contractor/${contractorId}`),
    getByEntityType: (contractorId: string, entityType: string) => apiCall(`/api/contractor-recommendations/contractor/${contractorId}/type/${entityType}`),
    getById: (id: string) => apiCall(`/api/contractor-recommendations/${id}`),
    update: (id: string, data: any) => apiCall(`/api/contractor-recommendations/${id}`, 'PUT', data),
    updateEngagement: (id: string, engagement: string) => apiCall(`/api/contractor-recommendations/${id}/engagement`, 'PUT', { engagement }),
    addFeedback: (id: string, feedback: string, outcome?: string) => apiCall(`/api/contractor-recommendations/${id}/feedback`, 'PUT', { feedback, outcome }),
    getPending: (contractorId: string) => apiCall(`/api/contractor-recommendations/contractor/${contractorId}/pending`),
    getStats: (contractorId: string) => apiCall(`/api/contractor-recommendations/contractor/${contractorId}/stats`),
    getConversionRate: (contractorId: string) => apiCall(`/api/contractor-recommendations/contractor/${contractorId}/conversion`),
    delete: (id: string) => apiCall(`/api/contractor-recommendations/${id}`, 'DELETE')
  }
};

// API utility for handling API calls in production
export function getApiUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // In production, use the full URL
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.origin}/${cleanPath}`;
  }
  
  // In development, use relative URL
  return `/${cleanPath}`;
}
