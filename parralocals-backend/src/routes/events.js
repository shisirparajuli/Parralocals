const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const {
  listEvents, getEventBySlug, createEvent, updateEvent,
} = require('../controllers/eventsController');
const { listRegistrationsForEvent } = require('../controllers/registrationsController');
const { createRegistration } = require('../controllers/registrationsController');

const router = express.Router();

// Public
router.get('/events', listEvents);
router.get('/events/:slug', getEventBySlug);
router.post('/events/:id/register', createRegistration);

// Admin (protected) — mounted here for convenience, guarded by requireAdmin
router.post('/admin/events', requireAdmin, createEvent);
router.put('/admin/events/:id', requireAdmin, updateEvent);
router.get('/admin/events/:id/registrations', requireAdmin, listRegistrationsForEvent);

module.exports = router;
