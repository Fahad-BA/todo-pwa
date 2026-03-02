import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL configuration
const pool = new Pool({
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'todo_app',
  password: process.env.PG_PASSWORD || 'password',
  port: process.env.PG_PORT || 5432,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
    return;
  }
  console.log('Connected to PostgreSQL successfully');
  release();
});

// Initialize database tables
const initDatabase = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT DEFAULT 'default-user',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
  `;

  try {
    const client = await pool.connect();
    await client.query(createTableQuery);
    console.log('Database tables initialized successfully');
    client.release();
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

// Export database functions
export { pool, initDatabase };