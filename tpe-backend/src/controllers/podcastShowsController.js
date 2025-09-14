const PodcastShows = require('../models/podcastShows');

exports.create = async (req, res) => {
  try {
    const show = await PodcastShows.create(req.body);
    res.status(201).json({ success: true, data: show });
  } catch (error) {
    console.error('Error creating podcast show:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const show = await PodcastShows.findById(req.params.id);
    if (!show) {
      return res.status(404).json({ success: false, error: 'Podcast show not found' });
    }
    res.json({ success: true, data: show });
  } catch (error) {
    console.error('Error fetching podcast show:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const shows = await PodcastShows.findAll();
    res.json({ success: true, data: shows });
  } catch (error) {
    console.error('Error fetching podcast shows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getByCategory = async (req, res) => {
  try {
    const shows = await PodcastShows.findByCategory(req.params.category);
    res.json({ success: true, data: shows });
  } catch (error) {
    console.error('Error fetching shows by category:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const show = await PodcastShows.update(req.params.id, req.body);
    if (!show) {
      return res.status(404).json({ success: false, error: 'Podcast show not found' });
    }
    res.json({ success: true, data: show });
  } catch (error) {
    console.error('Error updating podcast show:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const show = await PodcastShows.delete(req.params.id);
    if (!show) {
      return res.status(404).json({ success: false, error: 'Podcast show not found' });
    }
    res.json({ success: true, data: show });
  } catch (error) {
    console.error('Error deleting podcast show:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};