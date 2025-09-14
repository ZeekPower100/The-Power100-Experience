const PodcastTopics = require('../models/podcastTopics');

exports.create = async (req, res) => {
  try {
    const topic = await PodcastTopics.create(req.body);
    res.status(201).json({ success: true, data: topic });
  } catch (error) {
    console.error('Error creating podcast topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const topic = await PodcastTopics.findById(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Podcast topic not found' });
    }
    res.json({ success: true, data: topic });
  } catch (error) {
    console.error('Error fetching podcast topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const topics = await PodcastTopics.findAll();
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error('Error fetching podcast topics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTrending = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const topics = await PodcastTopics.findTrending(limit);
    res.json({ success: true, data: topics });
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const topic = await PodcastTopics.update(req.params.id, req.body);
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Podcast topic not found' });
    }
    res.json({ success: true, data: topic });
  } catch (error) {
    console.error('Error updating podcast topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const topic = await PodcastTopics.delete(req.params.id);
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Podcast topic not found' });
    }
    res.json({ success: true, data: topic });
  } catch (error) {
    console.error('Error deleting podcast topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};