# Todo PWA - PostgreSQL Version

This is a Progressive Web Application (PWA) for managing tasks, now migrated from Firebase to PostgreSQL for better data control and performance.

## Features

- ✅ Add, edit, and delete tasks
- ✅ Mark tasks as complete/incomplete
- ✅ Real-time updates (5-second polling)
- ✅ Responsive design with Tailwind CSS
- ✅ Dark mode support
- ✅ Progressive Web App capabilities
- ✅ PostgreSQL database backend

## Database Migration

This project has been migrated from Firebase Firestore to PostgreSQL for better:

- **Data ownership**: Complete control over your data
- **Performance**: Faster queries and reduced latency
- **Cost**: No external database service fees
- **Privacy**: Data stays on your server

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v12 or higher)
3. **npm** or **yarn**

## Setup

### 1. Database Setup

#### Option A: Automatic Setup
```bash
chmod +x setup-postgresql.sh
./setup-postgresql.sh
```

#### Option B: Manual Setup
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE todo_app;

-- Connect to the new database
\c todo_app

-- Create tables
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT DEFAULT 'default-user',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Insert sample data (optional)
INSERT INTO tasks (text, user_id) VALUES 
    ('Sample task: Add your first todo item', 'default-user'),
    ('Sample task: Explore the app features', 'default-user');
```

### 2. Environment Configuration

Copy the example environment file and update it with your PostgreSQL credentials:

```bash
cp .env.example .env
```

Edit `.env` with your database configuration:

```env
# PostgreSQL Configuration
PG_USER=your_postgres_user
PG_HOST=localhost
PG_DATABASE=todo_app
PG_PASSWORD=your_postgres_password
PG_PORT=5432
PG_SSL=false
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:4321/`

## API Endpoints

The application exposes REST API endpoints for task management:

### Tasks
- `GET /api/tasks?userId=default-user` - Get all tasks for a user
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update an existing task
- `DELETE /api/tasks/:id` - Delete a task

### Example API Usage

```javascript
// Get all tasks
const response = await fetch('/api/tasks?userId=default-user');
const tasks = await response.json();

// Create a new task
const newTask = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'New task',
    userId: 'default-user'
  })
});
```

## Database Schema

### Tasks Table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| text | TEXT | Task description |
| completed | BOOLEAN | Task completion status |
| created_at | TIMESTAMP | Task creation time |
| user_id | TEXT | User identifier |
| updated_at | TIMESTAMP | Last update time |

## Deployment

### Production Build

```bash
npm run build
```

### Production Requirements

1. **Node.js** with PM2 or similar process manager
2. **PostgreSQL** database
3. **Environment variables** properly configured
4. **SSL/TLS** for production (recommended)

### Environment Variables for Production

```env
PG_USER=your_production_user
PG_HOST=your_production_db_host
PG_DATABASE=todo_app_production
PG_PASSWORD=your_production_password
PG_PORT=5432
PG_SSL=true  # Enable SSL in production
```

## Migration from Firebase

If you're migrating from the Firebase version:

1. **Backup your existing data** from Firebase
2. **Follow the setup steps** above
3. **Migrate your data** using the script or manual import
4. **Update your deployment configuration**

## Performance Considerations

- **Indexing**: Tables include indexes for common queries
- **Connection Pooling**: Using pg pool for efficient connections
- **Auto-refresh**: Frontend polls every 5 seconds (adjustable)
- **Pagination**: Implement pagination for large datasets (future enhancement)

## Security

- **SQL Injection**: Parameterized queries prevent SQL injection
- **CORS**: Configured for cross-origin requests
- **Input Validation**: Basic validation on all inputs

## Development

### Database Migrations

For future schema changes, create migration scripts in the `migrations/` folder:

```javascript
// Example migration
const { Pool } = require('pg');
const pool = new Pool();

async function migrate() {
  const client = await pool.connect();
  await client.query('ALTER TABLE tasks ADD COLUMN priority INTEGER');
  await client.release();
  await pool.end();
}

migrate();
```

### Adding New Features

1. **Database changes**: Update schema first
2. **API endpoints**: Create/modify API endpoints
3. **Frontend**: Update UI to use new features
4. **Testing**: Test thoroughly before deployment

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure PostgreSQL is running and credentials are correct
2. **CORS Errors**: Check API endpoint configuration
3. **Build Errors**: Ensure all dependencies are installed

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U your_user -d todo_app

# Check PostgreSQL status
sudo systemctl status postgresql
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.