const router = require('express').Router();
const eventAgendaController = require('../src/controllers/eventAgendaController');
const { adminOnly } = require('../src/middleware/auth');

/**
 * Event Agenda Routes
 * Separate agenda management from event creation
 */

// Get agenda for an event
router.get('/event/:event_id',
  adminOnly,
  eventAgendaController.getEventAgenda
);

// Create single agenda item
router.post('/item',
  adminOnly,
  eventAgendaController.createAgendaItem
);

// Update agenda item
router.put('/item/:id',
  adminOnly,
  eventAgendaController.updateAgendaItem
);

// Delete agenda item
router.delete('/item/:id',
  adminOnly,
  eventAgendaController.deleteAgendaItem
);

// Bulk create agenda items
router.post('/bulk',
  adminOnly,
  eventAgendaController.bulkCreateAgendaItems
);

// Confirm entire agenda
router.post('/confirm/:event_id',
  adminOnly,
  eventAgendaController.confirmAgenda
);

// Clone agenda from another event
router.post('/clone',
  adminOnly,
  eventAgendaController.cloneAgenda
);

module.exports = router;