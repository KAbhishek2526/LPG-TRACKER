const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
  // 🌐 PRODUCTION (Railway / Render / Supabase)
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  // 💻 LOCAL DEVELOPMENT
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD, // Using your existing dot-env constraint
    port: process.env.DB_PORT || 5432,
  });
}

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle pg client', err);
    process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
