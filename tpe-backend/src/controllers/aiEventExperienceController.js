const AiEventExperience = require('../models/aiEventExperience');

const aiEventExperienceController = {
  // Create or get event experience
  async createOrGet(req, res) {
    try {
      const { eventId, contractorId } = req.params;

      // Check if experience exists
      let experience = await AiEventExperience.findByEventAndContractor(eventId, contractorId);

      if (!experience) {
        // Create new experience
        experience = await AiEventExperience.create({
          event_id: eventId,
          contractor_id: contractorId
        });
      }

      res.json({ success: true, data: experience });
    } catch (error) {
      console.error('Error creating/getting event experience:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create/get event experience'
      });
    }
  },

  // Get experience by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const experience = await AiEventExperience.findById(id);

      if (!experience) {
        return res.status(404).json({
          success: false,
          error: 'Experience not found'
        });
      }

      res.json({ success: true, data: experience });
    } catch (error) {
      console.error('Error fetching experience:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch experience'
      });
    }
  },

  // Get experiences for contractor
  async getByContractor(req, res) {
    try {
      const { contractorId } = req.params;
      const experiences = await AiEventExperience.findByContractor(contractorId);

      res.json({ success: true, data: experiences });
    } catch (error) {
      console.error('Error fetching contractor experiences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contractor experiences'
      });
    }
  },

  // Get experiences for event
  async getByEvent(req, res) {
    try {
      const { eventId } = req.params;
      const experiences = await AiEventExperience.findByEvent(eventId);

      res.json({ success: true, data: experiences });
    } catch (error) {
      console.error('Error fetching event experiences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch event experiences'
      });
    }
  },

  // Update pre-event data
  async updatePreEvent(req, res) {
    try {
      const { id } = req.params;
      const preEventData = req.body;

      const experience = await AiEventExperience.updatePreEvent(id, preEventData);

      res.json({ success: true, data: experience });
    } catch (error) {
      console.error('Error updating pre-event data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update pre-event data'
      });
    }
  },

  // Add session attended
  async addSession(req, res) {
    try {
      const { id } = req.params;
      const sessionData = req.body;

      const experience = await AiEventExperience.addSessionAttended(id, sessionData);

      res.json({ success: true, data: experience });
    } catch (error) {
      console.error('Error adding session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add session'
      });
    }
  },

  // Add note
  async addNote(req, res) {
    try {
      const { id } = req.params;
      const note = req.body;

      const experience = await AiEventExperience.addNote(id, note);

      res.json({ success: true, data: experience });
    } catch (error) {
      console.error('Error adding note:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add note'
      });
    }
  },

  // Add real-time insight
  async addInsight(req, res) {
    try {
      const { id } = req.params;
      const insight = req.body;

      const experience = await AiEventExperience.addRealTimeInsight(id, insight);

      res.json({ success: true, data: experience });
    } catch (error) {
      console.error('Error adding insight:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add insight'
      });
    }
  },

  // Update post-event data
  async updatePostEvent(req, res) {
    try {
      const { id } = req.params;
      const postEventData = req.body;

      const experience = await AiEventExperience.updatePostEvent(id, postEventData);

      res.json({ success: true, data: experience });
    } catch (error) {
      console.error('Error updating post-event data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update post-event data'
      });
    }
  },

  // Send speaker alert
  async sendSpeakerAlert(req, res) {
    try {
      const { id } = req.params;

      const experience = await AiEventExperience.incrementSpeakerAlerts(id);

      // Here you would trigger the actual alert sending
      // For now, we'll just increment the counter

      res.json({
        success: true,
        data: experience,
        message: 'Speaker alert sent'
      });
    } catch (error) {
      console.error('Error sending speaker alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send speaker alert'
      });
    }
  },

  // Get high engagement experiences
  async getHighEngagement(req, res) {
    try {
      const { minScore = 80, limit = 20 } = req.query;
      const experiences = await AiEventExperience.getHighEngagementExperiences(minScore, limit);

      res.json({ success: true, data: experiences });
    } catch (error) {
      console.error('Error fetching high engagement experiences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch high engagement experiences'
      });
    }
  },

  // Get event statistics
  async getEventStats(req, res) {
    try {
      const { eventId } = req.params;
      const stats = await AiEventExperience.getEventStats(eventId);

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Error fetching event stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch event stats'
      });
    }
  },

  // Get contractor event history
  async getContractorHistory(req, res) {
    try {
      const { contractorId } = req.params;
      const history = await AiEventExperience.getContractorEventHistory(contractorId);

      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Error fetching contractor event history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contractor event history'
      });
    }
  }
};

module.exports = aiEventExperienceController;