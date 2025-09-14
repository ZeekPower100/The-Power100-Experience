const PodcastGuests = require('../models/podcastGuests');

exports.create = async (req, res) => {
  try {
    const guest = await PodcastGuests.create(req.body);
    res.status(201).json({ success: true, data: guest });
  } catch (error) {
    console.error('Error creating podcast guest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const guest = await PodcastGuests.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ success: false, error: 'Podcast guest not found' });
    }
    res.json({ success: true, data: guest });
  } catch (error) {
    console.error('Error fetching podcast guest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const guests = await PodcastGuests.findAll();
    res.json({ success: true, data: guests });
  } catch (error) {
    console.error('Error fetching podcast guests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.search = async (req, res) => {
  try {
    const { query } = req.query;
    const guests = await PodcastGuests.search(query);
    res.json({ success: true, data: guests });
  } catch (error) {
    console.error('Error searching podcast guests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getTop = async (req, res) => {
  try {
    const limit = req.query.limit || 10;
    const guests = await PodcastGuests.findTop(limit);
    res.json({ success: true, data: guests });
  } catch (error) {
    console.error('Error fetching top guests:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const guest = await PodcastGuests.update(req.params.id, req.body);
    if (!guest) {
      return res.status(404).json({ success: false, error: 'Podcast guest not found' });
    }
    res.json({ success: true, data: guest });
  } catch (error) {
    console.error('Error updating podcast guest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const guest = await PodcastGuests.delete(req.params.id);
    if (!guest) {
      return res.status(404).json({ success: false, error: 'Podcast guest not found' });
    }
    res.json({ success: true, data: guest });
  } catch (error) {
    console.error('Error deleting podcast guest:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};