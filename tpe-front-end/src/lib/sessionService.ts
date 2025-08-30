import { Contractor } from './types/contractor';

const SESSION_TOKEN_KEY = 'tpe_contractor_session';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? '/api'  // Use relative path in production
    : 'http://localhost:5000/api'); // Use localhost for development

export interface SessionData {
  token: string;
  contractor: Partial<Contractor>;
  currentStep: number;
  expiresAt: string;
}

export class SessionService {
  
  // Save session token to localStorage
  static saveSession(token: string, contractor: Partial<Contractor>, step: number): void {
    try {
      const sessionData: SessionData = {
        token,
        contractor,
        currentStep: step,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
      
      localStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  // Get session from localStorage
  static getSession(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem(SESSION_TOKEN_KEY);
      if (!sessionStr) return null;

      const session: SessionData = JSON.parse(sessionStr);
      
      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      this.clearSession();
      return null;
    }
  }

  // Clear session from localStorage
  static clearSession(): void {
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  // Create a new contractor session
  static async createSession(contractorId: string, step: number = 1): Promise<SessionData | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractorId, step }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      
      if (data.success) {
        // Save to localStorage
        this.saveSession(data.token, data.contractor, step);
        
        return {
          token: data.token,
          contractor: data.contractor,
          currentStep: step,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  }

  // Restore session from token
  static async restoreSession(token?: string): Promise<{ contractor: Partial<Contractor>; currentStep: number } | null> {
    try {
      // Use provided token or get from localStorage
      const sessionToken = token || this.getSession()?.token;
      
      if (!sessionToken) {
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/session/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: sessionToken }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.clearSession();
        }
        return null;
      }

      const data = await response.json();
      
      if (data.success && data.sessionValid) {
        // Update localStorage with fresh data
        this.saveSession(sessionToken, data.contractor, data.currentStep);
        
        return {
          contractor: data.contractor,
          currentStep: data.currentStep
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to restore session:', error);
      this.clearSession();
      return null;
    }
  }

  // Refresh session token
  static async refreshSession(): Promise<string | null> {
    try {
      const session = this.getSession();
      if (!session) return null;

      const response = await fetch(`${API_BASE_URL}/session/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: session.token }),
      });

      if (!response.ok) {
        this.clearSession();
        return null;
      }

      const data = await response.json();
      
      if (data.success) {
        // Update localStorage with new token
        this.saveSession(data.token, session.contractor, session.currentStep);
        return data.token;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return null;
    }
  }

  // Check if user has an active session
  static hasActiveSession(): boolean {
    const session = this.getSession();
    return session !== null;
  }

  // Update session step
  static updateSessionStep(step: number): void {
    try {
      const session = this.getSession();
      if (session) {
        this.saveSession(session.token, session.contractor, step);
      }
    } catch (error) {
      console.error('Failed to update session step:', error);
    }
  }

  // Update contractor data in session
  static updateSessionContractor(contractor: Partial<Contractor>): void {
    try {
      const session = this.getSession();
      if (session) {
        const updatedContractor = { ...session.contractor, ...contractor };
        this.saveSession(session.token, updatedContractor, session.currentStep);
      }
    } catch (error) {
      console.error('Failed to update session contractor:', error);
    }
  }
}

export default SessionService;