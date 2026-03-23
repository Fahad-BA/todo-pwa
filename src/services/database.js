/**
 * Unified Database Service Layer
 * Provides a single, clean interface for database operations
 * Supports both SQLite (for development) and PostgreSQL (for production)
 * 
 * @module services/database
 */

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sqlite3 = require('sqlite3');
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 'sqlite' or 'postgresql'
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'todo_app.sqlite');

// Database configuration for PostgreSQL
const PG_CONFIG = {
  user: process.env.PG_USER || 'postgres',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'todo_app',
  password: process.env.PG_PASSWORD || 'password',
  port: parseInt(process.env.PG_PORT) || 5432,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
};

class DatabaseService {
  constructor() {
    this.pool = null;
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize database based on configuration
   */
  async initialize() {
    if (this.initialized) return;

    if (DB_TYPE === 'postgresql') {
      await this.initializePostgreSQL();
    } else {
      await this.initializeSQLite();
    }

    this.initialized = true;
    console.log(`✅ ${DB_TYPE.toUpperCase()} database initialized successfully`);
  }

  /**
   * Initialize SQLite database
   */
  async initializeSQLite() {
    try {
      this.db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
      });

      // Create tasks table
      await this.db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          text TEXT NOT NULL,
          completed BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT DEFAULT 'default-user',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          priority BOOLEAN DEFAULT 0
        )
      `);

      // Create indexes for performance
      await this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed);
        CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority) WHERE priority = 1;
        CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
        CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
      `);

      // Create mock pool for compatibility
      this.pool = this.createSQLitePool();
    } catch (error) {
      console.error('❌ Error initializing SQLite database:', error);
      throw error;
    }
  }

  /**
   * Initialize PostgreSQL database
   */
  async initializePostgreSQL() {
    try {
      const { Pool } = await import('pg');
      this.pool = new Pool(PG_CONFIG);

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Create tasks table with optimized schema
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          text TEXT NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          user_id TEXT DEFAULT 'default-user',
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          priority BOOLEAN DEFAULT FALSE
        );

        -- Performance indexes
        CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed);
        CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority) WHERE priority = true;
        CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
        CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_user_created_at ON tasks(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_tasks_user_completed_created ON tasks(user_id, completed, created_at DESC);
      `;

      await this.pool.query(createTableQuery);
      
      // Analyze table to update statistics
      await this.pool.query('ANALYZE tasks');
    } catch (error) {
      console.error('❌ Error initializing PostgreSQL database:', error);
      throw error;
    }
  }

  /**
   * Create SQLite mock pool for compatibility
   */
  createSQLitePool() {
    return {
      query: async (queryText, params = []) => {
        try {
          if (queryText.trim().toUpperCase().startsWith('INSERT')) {
            const result = await this.db.run(queryText, params);
            return {
              rows: [{ id: result.lastID }],
              rowCount: result.changes
            };
          } else {
            const rows = await this.db.all(queryText, params);
            return { rows };
          }
        } catch (error) {
          console.error('❌ SQLite query error:', error);
          throw error;
        }
      },

      connect: async () => {
        return {
          query: async (queryText, params = []) => {
            return this.pool.query(queryText, params);
          },
          release: async () => {
            // No-op for SQLite
          }
        };
      }
    };
  }

  /**
   * Execute a query with the appropriate database driver
   */
  async query(queryText, params = []) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      return await this.pool.query(queryText, params);
    } catch (error) {
      console.error('❌ Query error:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction(queries) {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      
      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (DB_TYPE === 'sqlite') {
        const result = await this.db.get('SELECT sqlite_version() as version');
        console.log('✅ SQLite connection successful');
        console.log('📊 SQLite version:', result.version);
        return true;
      } else {
        const client = await this.pool.connect();
        const result = await client.query('SELECT version()');
        client.release();
        console.log('✅ PostgreSQL connection successful');
        console.log('📊 PostgreSQL version:', result.rows[0].version);
        return true;
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (DB_TYPE === 'sqlite') {
        const result = await this.db.get("SELECT COUNT(*) as task_count FROM tasks");
        return {
          task_count: result.task_count,
          database_type: 'sqlite'
        };
      } else {
        const result = await this.pool.query(`
          SELECT 
            schemaname,
            tablename,
            seq_scan,
            seq_tup_read,
            idx_scan,
            idx_tup_fetch,
            n_tup_ins,
            n_tup_upd,
            n_tup_del,
            n_tup_hot_upd,
            n_live_tup,
            n_dead_tup,
            last_vacuum,
            last_autovacuum,
            last_analyze,
            last_autoanalyze
          FROM pg_stat_user_tables 
          WHERE tablename = 'tasks'
        `);
        
        const stats = result.rows[0] || {};
        return {
          ...stats,
          database_type: 'postgresql'
        };
      }
    } catch (error) {
      console.error('❌ Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (DB_TYPE === 'postgresql' && this.pool) {
      await this.pool.end();
    }
    if (this.db) {
      await this.db.close();
    }
    console.log('✅ Database connections closed');
  }
}

// Create singleton instance
const databaseService = new DatabaseService();

// Export the service
export default databaseService;
export { databaseService, DB_TYPE, DB_PATH };

// Auto-initialize and test connection on module load
databaseService.testConnection().catch(console.error);

// Schedule performance monitoring every 5 minutes
setInterval(() => {
  databaseService.getPerformanceMetrics().catch(console.error);
}, 300000);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await databaseService.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await databaseService.shutdown();
  process.exit(0);
});