const express = require('express');
const stripe = require('../utils/stripe');
const pool = require('../config/db');

const router = express.Router();

// POST /webhooks/stripe
// NOTE: this route must receive the RAW request body (not JSON-parsed) so
// Stripe's signature check works — see server.js for how it's mounted.
router.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await pool.query(
        `UPDATE registrations
         SET payment_status = 'paid', stripe_payment_intent = $1, updated_at = now()
         WHERE stripe_session_id = $2`,
        [session.payment_intent, session.id]
      );
      console.log(`✅ Registration marked paid for session ${session.id}`);
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      await pool.query(
        `UPDATE registrations
         SET payment_status = 'cancelled', updated_at = now()
         WHERE stripe_session_id = $1`,
        [session.id]
      );
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

module.exports = router;
