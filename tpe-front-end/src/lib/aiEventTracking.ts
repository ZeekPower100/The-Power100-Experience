import { aiTrackingApi } from './api';

/**
 * Utility for tracking AI engagement events throughout the contractor flow
 */
export class AIEventTracker {
  private static contractorId: string | null = null;

  /**
   * Initialize the tracker with a contractor ID
   */
  static setContractorId(id: string) {
    this.contractorId = id;
  }

  /**
   * Track a page view
   */
  static async trackPageView(page: string, additionalData: any = {}) {
    if (!this.contractorId) return;
    
    try {
      await aiTrackingApi.trackEvent(this.contractorId, {
        event_type: 'page_view',
        event_data: {
          page,
          timestamp: new Date().toISOString(),
          ...additionalData
        },
        channel: 'web'
      });
    } catch (error) {
      console.error('Failed to track page view:', error);
    }
  }

  /**
   * Track form submission
   */
  static async trackFormSubmit(formName: string, data: any = {}) {
    if (!this.contractorId) return;
    
    try {
      await aiTrackingApi.trackEvent(this.contractorId, {
        event_type: 'form_submit',
        event_data: {
          form: formName,
          timestamp: new Date().toISOString(),
          ...data
        },
        channel: 'web'
      });
    } catch (error) {
      console.error('Failed to track form submission:', error);
    }
  }

  /**
   * Track step completion
   */
  static async trackStepComplete(stepNumber: number, stepName: string, data: any = {}) {
    if (!this.contractorId) return;
    
    try {
      await aiTrackingApi.trackEvent(this.contractorId, {
        event_type: 'step_complete',
        event_data: {
          step_number: stepNumber,
          step_name: stepName,
          timestamp: new Date().toISOString(),
          ...data
        },
        channel: 'web'
      });
    } catch (error) {
      console.error('Failed to track step completion:', error);
    }
  }

  /**
   * Track partner match view
   */
  static async trackPartnerMatchView(partnerId: string, matchScore: number) {
    if (!this.contractorId) return;
    
    try {
      await aiTrackingApi.trackEvent(this.contractorId, {
        event_type: 'partner_match_view',
        event_data: {
          partner_id: partnerId,
          match_score: matchScore,
          timestamp: new Date().toISOString()
        },
        channel: 'web'
      });
    } catch (error) {
      console.error('Failed to track partner match view:', error);
    }
  }

  /**
   * Track demo booking
   */
  static async trackDemoBooking(partnerId: string) {
    if (!this.contractorId) return;
    
    try {
      await aiTrackingApi.trackEvent(this.contractorId, {
        event_type: 'demo_booking',
        event_data: {
          partner_id: partnerId,
          timestamp: new Date().toISOString()
        },
        channel: 'web'
      });
    } catch (error) {
      console.error('Failed to track demo booking:', error);
    }
  }

  /**
   * Track business goals
   */
  static async trackBusinessGoals(goals: string[]) {
    if (!this.contractorId) return;
    
    try {
      const goalsData = goals.map((goal, index) => ({
        goal,
        priority: 5 - index, // Higher priority for earlier goals
        timeline: '2025-12-31'
      }));
      
      await aiTrackingApi.trackBusinessGoals(this.contractorId, goalsData);
    } catch (error) {
      console.error('Failed to track business goals:', error);
    }
  }

  /**
   * Track challenges
   */
  static async trackChallenges(challenges: string[]) {
    if (!this.contractorId) return;
    
    try {
      const challengesData = challenges.map(challenge => ({
        challenge,
        severity: 'medium',
        open_to_solutions: true
      }));
      
      await aiTrackingApi.trackChallenges(this.contractorId, challengesData);
    } catch (error) {
      console.error('Failed to track challenges:', error);
    }
  }

  /**
   * Track flow completion
   */
  static async trackFlowComplete(selectedPartnerId?: string) {
    if (!this.contractorId) return;
    
    try {
      await aiTrackingApi.trackEvent(this.contractorId, {
        event_type: 'flow_complete',
        event_data: {
          selected_partner_id: selectedPartnerId,
          timestamp: new Date().toISOString()
        },
        channel: 'web'
      });
    } catch (error) {
      console.error('Failed to track flow completion:', error);
    }
  }

  /**
   * Track bulk events
   */
  static async trackBulkEvents(events: any[]) {
    if (!this.contractorId) return;
    
    try {
      await aiTrackingApi.trackBulkEvents(this.contractorId, events);
    } catch (error) {
      console.error('Failed to track bulk events:', error);
    }
  }
}