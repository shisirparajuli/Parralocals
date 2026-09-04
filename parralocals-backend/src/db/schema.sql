-- Parralocals database schema

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  summary TEXT,
  description TEXT,
  location VARCHAR(255),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  price_cents INTEGER NOT NULL DEFAULT 0,       -- 0 = free event
  capacity INTEGER,                              -- NULL = unlimited
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_images (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  headcount INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | paid | free | cancelled | refunded
  stripe_session_id VARCHAR(255),
  stripe_payment_intent VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
