require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

async function seed() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.');
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO admins (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      [email, hash]
    );
    console.log(`✅ Admin account ready: ${email}`);

    const sample = await pool.query(
      `INSERT INTO events (slug, title, summary, description, location, start_at, end_at, price_cents, capacity, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [
        'camping',
        'Camping with ParraLocals',
        'One-night community campout — trade the couch for a campfire.',
        'Meet at Jubilee Park, depart 7:30am. Breakfast, activities, swimming, camp set-up, fire and marshmallows, BBQ dinner, overnight stay, breakfast and pack-up the next morning.',
        'Jubilee Park (meet point) — camp location TBC',
        '2026-10-10T07:00:00+11:00',
        '2026-10-11T07:00:00+11:00',
        4500,
        30,
      ]
    );
    if (sample.rows[0]) {
      console.log(`✅ Sample event created (id ${sample.rows[0].id})`);
    } else {
      console.log('ℹ️ Sample event already existed, skipped.');
    }
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
