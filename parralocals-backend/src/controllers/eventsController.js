const pool = require('../config/db');

// GET /events  — public, published events only, soonest first
async function listEvents(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, title, summary, location, start_at, end_at,
              price_cents, capacity, cover_image_url
       FROM events
       WHERE is_published = true
       ORDER BY start_at ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}

// GET /events/:slug — public event detail + images + spots remaining
async function getEventBySlug(req, res) {
  try {
    const { slug } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM events WHERE slug = $1 AND is_published = true`,
      [slug]
    );
    const event = rows[0];
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const images = await pool.query(
      `SELECT image_url, caption FROM event_images WHERE event_id = $1 ORDER BY sort_order ASC`,
      [event.id]
    );

    let spotsRemaining = null;
    if (event.capacity !== null) {
      const taken = await pool.query(
        `SELECT COALESCE(SUM(headcount), 0) AS total
         FROM registrations
         WHERE event_id = $1 AND payment_status IN ('paid', 'free', 'pending')`,
        [event.id]
      );
      spotsRemaining = event.capacity - parseInt(taken.rows[0].total, 10);
    }

    res.json({ ...event, images: images.rows, spots_remaining: spotsRemaining });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
}

// POST /admin/events — protected
async function createEvent(req, res) {
  try {
    const {
      slug, title, summary, description, location,
      start_at, end_at, price_cents, capacity,
      cover_image_url, is_published,
    } = req.body;

    if (!slug || !title || !start_at) {
      return res.status(400).json({ error: 'slug, title and start_at are required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO events
        (slug, title, summary, description, location, start_at, end_at, price_cents, capacity, cover_image_url, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [slug, title, summary, description, location, start_at, end_at || null,
       price_cents || 0, capacity || null, cover_image_url || null, !!is_published]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An event with that slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create event' });
  }
}

// PUT /admin/events/:id — protected
async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const fields = [
      'slug', 'title', 'summary', 'description', 'location',
      'start_at', 'end_at', 'price_cents', 'capacity',
      'cover_image_url', 'is_published',
    ];

    const updates = [];
    const values = [];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        values.push(req.body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE events SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    if (!rows[0]) return res.status(404).json({ error: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
}

module.exports = { listEvents, getEventBySlug, createEvent, updateEvent };
