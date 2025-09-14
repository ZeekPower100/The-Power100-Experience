const EpisodeHighlights = require('../models/episodeHighlights');

exports.create = async (req, res) => {
  try {
    const highlight = await EpisodeHighlights.create(req.body);
    res.status(201).json({ success: true, data: highlight });
  } catch (error) {
    console.error('Error creating episode highlight:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const highlight = await EpisodeHighlights.findById(req.params.id);
    if (!highlight) {
      return res.status(404).json({ success: false, error: 'Episode highlight not found' });
    }
    res.json({ success: true, data: highlight });
  } catch (error) {
    console.error('Error fetching episode highlight:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getByEpisodeId = async (req, res) => {
  try {
    const highlights = await EpisodeHighlights.findByEpisodeId(req.params.episodeId);
    res.json({ success: true, data: highlights });
  } catch (error) {
    console.error('Error fetching highlights by episode:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getByType = async (req, res) => {
  try {
    const highlights = await EpisodeHighlights.findByType(req.params.type);
    res.json({ success: true, data: highlights });
  } catch (error) {
    console.error('Error fetching highlights by type:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTop = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const highlights = await EpisodeHighlights.findTop(limit);
    res.json({ success: true, data: highlights });
  } catch (error) {
    console.error('Error fetching top highlights:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const highlight = await EpisodeHighlights.update(req.params.id, req.body);
    if (!highlight) {
      return res.status(404).json({ success: false, error: 'Episode highlight not found' });
    }
    res.json({ success: true, data: highlight });
  } catch (error) {
    console.error('Error updating episode highlight:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const highlight = await EpisodeHighlights.delete(req.params.id);
    if (!highlight) {
      return res.status(404).json({ success: false, error: 'Episode highlight not found' });
    }
    res.json({ success: true, data: highlight });
  } catch (error) {
    console.error('Error deleting episode highlight:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};