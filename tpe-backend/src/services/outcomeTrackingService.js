const dataCollectionService = require('./dataCollectionService');

class OutcomeTrackingService {
  // Track when a contractor is matched with a partner
  async trackPartnerMatch(contractorId, partnerId, matchData) {
    return dataCollectionService.logInteraction({
      interaction_type: 'partner_match',
      user_id: contractorId,
      user_type: 'contractor',
      partner_id: partnerId,
      outcomes: {
        partner_matched: true,
        match_score: matchData.score,
        match_reasons: matchData.reasons,
        primary_match: matchData.isPrimary || false,
        podcast_matched: matchData.podcastMatched || false,
        event_matched: matchData.eventMatched || false,
        timestamp: new Date().toISOString()
      },
      metadata: {
        contractor_stage: matchData.contractorStage,
        focus_areas: matchData.focusAreas,
        revenue_tier: matchData.revenueTier
      }
    });
  }

  // Track when a demo is booked
  async trackDemoBooked(contractorId, partnerId, bookingDetails) {
    return dataCollectionService.logInteraction({
      interaction_type: 'demo_booking',
      user_id: contractorId,
      user_type: 'contractor',
      partner_id: partnerId,
      outcomes: {
        demo_booked: true,
        booking_date: bookingDetails.date,
        booking_time: bookingDetails.time,
        booking_type: bookingDetails.type || 'initial_demo',
        timestamp: new Date().toISOString()
      },
      metadata: {
        source: bookingDetails.source || 'contractor_flow',
        special_instructions: bookingDetails.instructions
      }
    });
  }

  // Track when a deal is closed (to be called later when we have this data)
  async trackDealClosed(contractorId, partnerId, dealDetails) {
    return dataCollectionService.logInteraction({
      interaction_type: 'deal_closed',
      user_id: contractorId,
      user_type: 'contractor',
      partner_id: partnerId,
      outcomes: {
        deal_closed: true,
        deal_value: dealDetails.value,
        deal_type: dealDetails.type,
        contract_length: dealDetails.contractLength,
        timestamp: new Date().toISOString()
      },
      metadata: {
        time_to_close_days: dealDetails.timeToClose,
        satisfaction_score: dealDetails.satisfactionScore
      }
    });
  }

  // Track contractor flow completion
  async trackFlowCompletion(contractorId, flowData) {
    return dataCollectionService.logInteraction({
      interaction_type: 'flow_completion',
      user_id: contractorId,
      user_type: 'contractor',
      outcomes: {
        flow_completed: true,
        completion_time_seconds: flowData.completionTime,
        steps_completed: flowData.stepsCompleted,
        abandoned_steps: flowData.abandonedSteps || [],
        timestamp: new Date().toISOString()
      },
      metadata: {
        device_type: flowData.deviceType,
        browser: flowData.browser,
        referrer: flowData.referrer
      }
    });
  }

  // Track feedback submission
  async trackFeedback(userId, userType, feedbackData) {
    return dataCollectionService.logInteraction({
      interaction_type: 'feedback_submission',
      user_id: userId,
      user_type: userType,
      feedback: {
        rating: feedbackData.rating,
        comments: feedbackData.comments,
        categories: feedbackData.categories,
        would_recommend: feedbackData.wouldRecommend,
        timestamp: new Date().toISOString()
      },
      metadata: {
        survey_version: feedbackData.surveyVersion || 'v1',
        collection_point: feedbackData.collectionPoint,
        session_duration: feedbackData.sessionDuration
      }
    });
  }

  // Track PowerConfidence score updates
  async trackPowerConfidenceUpdate(partnerId, scoreData) {
    return dataCollectionService.logInteraction({
      interaction_type: 'powerconfidence_update',
      user_id: partnerId,
      user_type: 'partner',
      outcomes: {
        previous_score: scoreData.previousScore,
        new_score: scoreData.newScore,
        score_change: scoreData.newScore - scoreData.previousScore,
        timestamp: new Date().toISOString()
      },
      metadata: {
        update_reason: scoreData.reason,
        data_points_used: scoreData.dataPoints,
        confidence_level: scoreData.confidenceLevel
      }
    });
  }

  // Track partner onboarding completion
  async trackPartnerOnboarding(partnerId, onboardingData) {
    return dataCollectionService.logInteraction({
      interaction_type: 'partner_onboarding',
      user_id: partnerId,
      user_type: 'partner',
      outcomes: {
        onboarding_completed: true,
        steps_completed: onboardingData.stepsCompleted,
        time_to_complete_minutes: onboardingData.completionTime,
        initial_powerconfidence_score: onboardingData.initialScore,
        timestamp: new Date().toISOString()
      },
      metadata: {
        validation_points_collected: onboardingData.validationPoints,
        documents_uploaded: onboardingData.documentsUploaded,
        employees_added: onboardingData.employeesAdded,
        customers_added: onboardingData.customersAdded
      }
    });
  }

  // Track AI Coach/Concierge interactions
  async trackAIInteraction(userId, interactionData) {
    return dataCollectionService.trackAIConversation({
      user_id: userId,
      user_type: interactionData.userType || 'contractor',
      conversation_id: interactionData.conversationId,
      messages: interactionData.messages,
      ai_metadata: {
        total_tokens: interactionData.totalTokens,
        cost: interactionData.cost,
        response_time_ms: interactionData.responseTime,
        helpful_rating: interactionData.helpfulRating
      },
      outcomes: {
        question_answered: interactionData.questionAnswered,
        action_taken: interactionData.actionTaken,
        follow_up_needed: interactionData.followUpNeeded
      }
    });
  }

  // Track validation data for PowerConfidence
  async trackValidationData(partnerId, validationType, validationData) {
    return dataCollectionService.trackPartnerValidation(validationType, {
      partner_id: partnerId,
      validation_data: validationData,
      metadata: {
        collector: validationData.collector,
        verified: validationData.verified || false,
        confidence_score: validationData.confidenceScore
      }
    });
  }

  // Track message consistency analysis results
  async trackMessageConsistency(partnerId, analysisResults) {
    return dataCollectionService.logInteraction({
      interaction_type: 'message_consistency_analysis',
      user_id: partnerId,
      user_type: 'partner',
      analysis: {
        overall_consistency: analysisResults.overallScore,
        ceo_employee_alignment: analysisResults.ceoEmployeeAlignment,
        ceo_customer_alignment: analysisResults.ceoCustomerAlignment,
        employee_customer_alignment: analysisResults.employeeCustomerAlignment,
        key_discrepancies: analysisResults.discrepancies,
        timestamp: new Date().toISOString()
      },
      metadata: {
        data_points_analyzed: analysisResults.dataPointsCount,
        analysis_version: analysisResults.version || 'v1',
        recommendations: analysisResults.recommendations
      }
    });
  }

  // Track A/B test participation
  async trackExperiment(userId, experimentData) {
    return dataCollectionService.logInteraction({
      interaction_type: 'experiment_participation',
      user_id: userId,
      user_type: experimentData.userType,
      experiment: {
        name: experimentData.name,
        variant: experimentData.variant,
        control_group: experimentData.isControl || false,
        timestamp: new Date().toISOString()
      },
      outcomes: {
        conversion: experimentData.converted || false,
        engagement_score: experimentData.engagementScore,
        time_to_action: experimentData.timeToAction
      }
    });
  }

  // Track podcast interactions
  async trackPodcastInteraction(contractorId, podcastId, interactionType, metadata = {}) {
    return dataCollectionService.logInteraction({
      interaction_type: 'podcast_interaction',
      user_id: contractorId,
      user_type: 'contractor',
      podcast_id: podcastId,
      action: interactionType, // 'viewed', 'clicked_link', 'visit_website'
      outcomes: {
        engaged_with_content: true,
        content_type: 'podcast',
        timestamp: new Date().toISOString()
      },
      metadata: {
        podcast_name: metadata.podcastName,
        host: metadata.host,
        frequency: metadata.frequency,
        match_score: metadata.matchScore,
        ...metadata
      }
    });
  }

  // Track event interactions
  async trackEventInteraction(contractorId, eventId, interactionType, metadata = {}) {
    return dataCollectionService.logInteraction({
      interaction_type: 'event_interaction',
      user_id: contractorId,
      user_type: 'contractor',
      event_id: eventId,
      action: interactionType, // 'viewed', 'registered', 'clicked_link'
      outcomes: {
        engaged_with_content: true,
        content_type: 'event',
        timestamp: new Date().toISOString()
      },
      metadata: {
        event_name: metadata.eventName,
        event_date: metadata.eventDate,
        location: metadata.location,
        format: metadata.format,
        match_score: metadata.matchScore,
        ...metadata
      }
    });
  }

  // Track CTA button clicks
  async trackCTAClick(contractorId, ctaType, targetId, metadata = {}) {
    return dataCollectionService.logInteraction({
      interaction_type: 'cta_click',
      user_id: contractorId,
      user_type: 'contractor',
      cta_type: ctaType, // 'quarterly_reports', 'customer_testimonials', 'schedule_intro', 'next_focus_area'
      target_id: targetId, // partner_id or other relevant ID
      outcomes: {
        user_engagement: true,
        click_intent: ctaType,
        timestamp: new Date().toISOString()
      },
      metadata: {
        target_type: metadata.targetType,
        target_name: metadata.targetName,
        placement: metadata.placement,
        ...metadata
      }
    });
  }
}

// Export singleton instance
module.exports = new OutcomeTrackingService();