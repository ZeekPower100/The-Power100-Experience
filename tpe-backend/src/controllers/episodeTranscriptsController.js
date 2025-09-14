const EpisodeTranscripts = require('../models/episodeTranscripts');

exports.create = async (req, res) => {
  try {
    const transcript = await EpisodeTranscripts.create(req.body);
    res.status(201).json({ success: true, data: transcript });
  } catch (error) {
    console.error('Error creating episode transcript:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const transcript = await EpisodeTranscripts.findById(req.params.id);
    if (!transcript) {
      return res.status(404).json({ success: false, error: 'Episode transcript not found' });
    }
    res.json({ success: true, data: transcript });
  } catch (error) {
    console.error('Error fetching episode transcript:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getByEpisodeId = async (req, res) => {
  try {
    const transcript = await EpisodeTranscripts.findByEpisodeId(req.params.episodeId);
    if (!transcript) {
      return res.status(404).json({ success: false, error: 'Episode transcript not found' });
    }
    res.json({ success: true, data: transcript });
  } catch (error) {
    console.error('Error fetching transcript by episode:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const transcript = await EpisodeTranscripts.updateStatus(req.params.id, status);
    if (!transcript) {
      return res.status(404).json({ success: false, error: 'Episode transcript not found' });
    }
    res.json({ success: true, data: transcript });
  } catch (error) {
    console.error('Error updating transcript status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.search = async (req, res) => {
  try {
    const { query, showId } = req.query;
    const transcripts = await EpisodeTranscripts.search(query, showId);
    res.json({ success: true, data: transcripts });
  } catch (error) {
    console.error('Error searching transcripts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const transcript = await EpisodeTranscripts.update(req.params.id, req.body);
    if (!transcript) {
      return res.status(404).json({ success: false, error: 'Episode transcript not found' });
    }
    res.json({ success: true, data: transcript });
  } catch (error) {
    console.error('Error updating episode transcript:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const transcript = await EpisodeTranscripts.delete(req.params.id);
    if (!transcript) {
      return res.status(404).json({ success: false, error: 'Episode transcript not found' });
    }
    res.json({ success: true, data: transcript });
  } catch (error) {
    console.error('Error deleting episode transcript:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};