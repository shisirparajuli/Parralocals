const pool = require('../config/db');
const stripe = require('../utils/stripe');

// POST /events/:id/register — public
// Creates a pending registration. If the event is paid, returns a Stripe
// Checkout URL for the frontend to redirect to. If free, marks it 'free' immediately.
async function createRegistration(req, res) {
  const client = await pool.connect();
  try {
    const { id: eventId } = req.params;
    const { full_name, email, phone, headcount = 1, notes } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ error: 'full_name and email are required' });
    }

    await client.query('BEGIN');

    const eventResult = await client.query(
      `SELECT * FROM events WHERE id = $1 AND is_published = true FOR UPDATE`,
      [eventId]
    );
    const event = eventResult.rows[0];
    if (!event) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.capacity !== null) {
      const taken = await client.query(
        `SELECT COALESCE(SUM(headcount), 0) AS total FROM registrations
         WHERE event_id = $1 AND payment_status IN ('paid', 'free', 'pending')`,
        [eventId]
      );
      const remaining = event.capacity - parseInt(taken.rows[0].total, 10);
      if (headcount > remaining) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Only ${remaining} spot(s) remaining` });
      }
    }

    const amountCents = event.price_cents * headcount;
    const initialStatus = amountCents === 0 ? 'free' : 'pending';

    const inserted = await client.query(
      `INSERT INTO registrations (event_id, full_name, email, phone, headcount, notes, amount_cents, payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [eventId, full_name, email, phone || null, headcount, notes || null, amountCents, initialStatus]
    );
    const registration = inserted.rows[0];

    if (amountCents === 0) {
      await client.query('COMMIT');
      return res.status(201).json({ registration, checkout_url: null });
    }

    // Paid event — create a Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: { name: `${event.title} — registration (${headcount} ${headcount === 1 ? 'person' : 'people'})` },
            unit_amount: event.price_cents,
          },
          quantity: headcount,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/events/${event.slug}?registration=success`,
      cancel_url: `${process.env.FRONTEND_URL}/events/${event.slug}?registration=cancelled`,
      metadata: { registration_id: String(registration.id) },
    });

    await client.query(
      `UPDATE registrations SET stripe_session_id = $1 WHERE id = $2`,
      [session.id, registration.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ registration, checkout_url: session.url });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create registration' });
  } finally {
    client.release();
  }
}

// GET /admin/events/:id/registrations — protected
async function listRegistrationsForEvent(req, res) {
  try {
    const { id: eventId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, full_name, email, phone, headcount, notes, amount_cents,
              payment_status, created_at
       FROM registrations
       WHERE event_id = $1
       ORDER BY created_at DESC`,
      [eventId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
}

module.exports = { createRegistration, listRegistrationsForEvent };
