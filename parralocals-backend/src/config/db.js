const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Uncomment if your host requires SSL (e.g. most managed Postgres in production)
  // ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = pool;
