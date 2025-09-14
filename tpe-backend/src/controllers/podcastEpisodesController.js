const PodcastEpisodes = require('../models/podcastEpisodes');

exports.create = async (req, res) => {
  try {
    const episode = await PodcastEpisodes.create(req.body);
    res.status(201).json({ success: true, data: episode });
  } catch (error) {
    console.error('Error creating podcast episode:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const episode = await PodcastEpisodes.findById(req.params.id);
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Podcast episode not found' });
    }
    res.json({ success: true, data: episode });
  } catch (error) {
    console.error('Error fetching podcast episode:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getByShowId = async (req, res) => {
  try {
    const episodes = await PodcastEpisodes.findByShowId(req.params.showId);
    res.json({ success: true, data: episodes });
  } catch (error) {
    console.error('Error fetching episodes by show:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRecent = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const episodes = await PodcastEpisodes.findRecent(limit);
    res.json({ success: true, data: episodes });
  } catch (error) {
    console.error('Error fetching recent episodes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getByGuest = async (req, res) => {
  try {
    const episodes = await PodcastEpisodes.findByGuest(req.params.guestId);
    res.json({ success: true, data: episodes });
  } catch (error) {
    console.error('Error fetching episodes by guest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const episode = await PodcastEpisodes.update(req.params.id, req.body);
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Podcast episode not found' });
    }
    res.json({ success: true, data: episode });
  } catch (error) {
    console.error('Error updating podcast episode:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const episode = await PodcastEpisodes.delete(req.params.id);
    if (!episode) {
      return res.status(404).json({ success: false, error: 'Podcast episode not found' });
    }
    res.json({ success: true, data: episode });
  } catch (error) {
    console.error('Error deleting podcast episode:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};