const EpisodeTopics = require('../models/episodeTopics');

exports.create = async (req, res) => {
  try {
    const episodeTopic = await EpisodeTopics.create(req.body);
    res.status(201).json({ success: true, data: episodeTopic });
  } catch (error) {
    console.error('Error creating episode topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const episodeTopic = await EpisodeTopics.findById(req.params.id);
    if (!episodeTopic) {
      return res.status(404).json({ success: false, error: 'Episode topic not found' });
    }
    res.json({ success: true, data: episodeTopic });
  } catch (error) {
    console.error('Error fetching episode topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getByEpisodeId = async (req, res) => {
  try {
    const episodeTopics = await EpisodeTopics.findByEpisodeId(req.params.episodeId);
    res.json({ success: true, data: episodeTopics });
  } catch (error) {
    console.error('Error fetching episode topics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getByRelevance = async (req, res) => {
  try {
    const { episodeId, minRelevance } = req.query;
    const episodeTopics = await EpisodeTopics.findByRelevance(episodeId, minRelevance);
    res.json({ success: true, data: episodeTopics });
  } catch (error) {
    console.error('Error fetching episode topics by relevance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const episodeTopic = await EpisodeTopics.update(req.params.id, req.body);
    if (!episodeTopic) {
      return res.status(404).json({ success: false, error: 'Episode topic not found' });
    }
    res.json({ success: true, data: episodeTopic });
  } catch (error) {
    console.error('Error updating episode topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const episodeTopic = await EpisodeTopics.delete(req.params.id);
    if (!episodeTopic) {
      return res.status(404).json({ success: false, error: 'Episode topic not found' });
    }
    res.json({ success: true, data: episodeTopic });
  } catch (error) {
    console.error('Error deleting episode topic:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};