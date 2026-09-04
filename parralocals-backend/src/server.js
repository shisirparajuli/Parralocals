require('dotenv').config();
const express = require('express');
const cors = require('cors');

const eventsRoutes = require('./routes/events');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// Stripe webhook needs the RAW body to verify signatures, so it must be
// mounted BEFORE express.json() and given its own raw parser.
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/', webhookRoutes);

// Everything else uses normal JSON parsing
app.use(express.json());
app.use('/', eventsRoutes);
app.use('/', adminRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Parralocals API running on http://localhost:${PORT}`);
});
