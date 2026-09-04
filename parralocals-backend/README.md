# Parralocals Backend

Express + PostgreSQL API for events, registrations, and Stripe payments — with a protected admin API for managing events and viewing registrants.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL.** Easiest local option is Docker:
   ```bash
   docker run --name parralocals-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=parralocals -p 5432:5432 -d postgres:16
   ```
   Or use a free hosted Postgres (Render, Railway, Supabase — just use their connection string).

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Fill in `DATABASE_URL`, `JWT_SECRET` (any long random string), and your Stripe test keys from
   https://dashboard.stripe.com/test/apikeys.

4. **Run the migration** (creates tables):
   ```bash
   npm run migrate
   ```

5. **Seed an admin account + one sample event**:
   ```bash
   npm run seed
   ```

6. **Start the server**:
   ```bash
   npm run dev
   ```
   API runs at `http://localhost:4000`. Check `GET /health` to confirm it's up.

## Stripe webhook (local testing)

Use the Stripe CLI to forward webhook events to your local server:
```bash
stripe listen --forward-to localhost:4000/webhooks/stripe
```
This prints a `whsec_...` value — put that in `.env` as `STRIPE_WEBHOOK_SECRET`.

## API overview

**Public**
- `GET /events` — list published events
- `GET /events/:slug` — event detail, images, spots remaining
- `POST /events/:id/register` — register (returns a Stripe Checkout URL if the event is paid)

**Admin** (send `Authorization: Bearer <token>` from `/admin/login`)
- `POST /admin/login` — get a JWT
- `POST /admin/events` — create an event
- `PUT /admin/events/:id` — update an event
- `GET /admin/events/:id/registrations` — list registrants for an event

**Webhook**
- `POST /webhooks/stripe` — Stripe calls this on payment events; marks registrations paid/cancelled

## Next steps

- Build the React frontend against this API
- Add image upload (event cover photos / gallery) — S3 or Cloudinary recommended over storing files locally
- Add a "resend confirmation email" admin action (e.g. via Resend or SendGrid)
