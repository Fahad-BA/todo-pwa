# Todo PWA (PostgreSQL Version) - Advanced Task Management Application

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12%2B-blue?style=for-the-badge&logo=postgresql&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-latest-orange?style=for-the-badge&logo=astro&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Enabled-purple?style=for-the-badge&logo=pwa&logoColor=white)
![Vibe Coded](https://img.shields.io/badge/vibe_coded-purple?style=for-the-badge&logo=sparkles&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.0.0-blue?style=for-the-badge&logo=tailwindcss&logoColor=white)

An advanced task management application that works as a Progressive Web App (PWA) using ASTRO.js and PostgreSQL as the database. The app is specifically designed to work on mobile devices and support offline functionality.

## 🌟 Key Features

- 📱 **Advanced PWA** - Can be added to phone home screen
- 🌙 **Dark Mode** - Full dark mode support
- ➕ **Add Tasks** - Add new tasks easily
- ✅ **Complete Tasks** - Mark tasks as completed
- 🔄 **Auto Refresh** - Tasks update every 5 seconds
- ✏️ **Edit Tasks** - Edit existing task text
- 🗑️ **Delete Tasks** - Remove unwanted tasks
- 📡 **Offline Support** - Works without internet connection
- 🔒 **Secure & Private** - Your data on your own server
- 🎨 **Responsive Design** - Works excellently on all devices

## 🚀 System Requirements

### Required Software
- **Node.js** version 18 or later
- **PostgreSQL** version 12 or later
- **npm** or **yarn**

### Prerequisites
- Running PostgreSQL server
- Permissions to create databases and tables

## 📦 Project Installation

### 1. Clone the Project
```bash
git clone <repository-url>
cd todo-pwa
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
#### Option A: Automatic Setup (Recommended)
```bash
chmod +x setup-postgresql.sh
./setup-postgresql.sh
```

#### Option B: Manual Setup
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create the database
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

-- Create indexes for performance optimization
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Insert sample data (optional)
INSERT INTO tasks (text, user_id) VALUES 
    ('Sample task: Add your first task', 'default-user'),
    ('Sample task: Explore app features', 'default-user');
```

### 4. Environment Variables Setup
Copy the example environment file and update it:
```bash
cp .env.example .env
```

Edit the `.env` file with your PostgreSQL settings:
```env
# PostgreSQL Configuration
PG_USER=your_username
PG_HOST=localhost
PG_DATABASE=todo_app
PG_PASSWORD=your_password
PG_PORT=5432
PG_SSL=false
```

## 🏃 How to Run the Project

### 1. Start Development Server
```bash
npm run dev
```

The app will be available at: `http://localhost:4321/`

### 2. Build for Production
```bash
npm run build
```

### 3. Preview Production Build
```bash
npm run preview
```

## 🗄️ Database Setup Guide

### Database Structure

#### Tasks Table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary Key |
| text | TEXT | Task text |
| completed | BOOLEAN | Task completion status |
| created_at | TIMESTAMP | Task creation time |
| user_id | TEXT | User identifier |
| updated_at | TIMESTAMP | Last update time |

### Performance Settings
- **Indexes**: Created indexes to improve query speed
- **Connection Pooling**: Using pg pool for efficient connections
- **Auto Refresh**: Frontend updates every 5 seconds

## 🔧 Feature Explanation

### Basic Features
1. **Task Management**: Easily add, edit, and delete tasks
2. **Sync**: Automatic updates of changes across all devices
3. **Dark Mode**: Toggle between light and dark modes
4. **PWA**: Can be installed on phone as a native app

### Technical Features
- **PostgreSQL**: Powerful and secure database
- **ASTRO.js**: Modern web framework
- **Tailwind CSS**: Responsive and fast design
- **REST API**: Clear endpoints for task management

### API Endpoints
- `GET /api/tasks?userId=default-user` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update existing task
- `DELETE /api/tasks/:id` - Delete task

## 🌐 Application Link

After building and deploying the project, you can access the app via:
```
https://your-domain.com
```

**Note**: The link above is just an example. Replace it with your actual deployment link after uploading the project to a hosting service such as:
- Netlify
- Vercel
- Firebase Hosting
- Any static hosting service

## 📁 Project Structure

```
todo-pwa/
├── src/
│   ├── components/
│   │   ├── TaskList.astro
│   │   ├── TaskItem.astro
│   │   └── Header.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── api/
│   │       └── tasks.js
│   └── styles/
│       └── global.css
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── favicon.svg
│   ├── icon-192.svg
│   └── icon-512.svg
├── .env
├── .env.example
├── .gitignore
├── astro.config.mjs
├── tailwind.config.js
├── package.json
├── package-lock.json
└── setup-postgresql.sh
```

## 🔐 Security

- **SQL Injection**: Using parameterized queries to prevent SQL injection
- **CORS**: Appropriate CORS settings for cross-origin requests
- **Input Validation**: Basic validation of all inputs

## 🚀 Deployment

### Production Requirements
1. **Node.js** with process manager like PM2
2. **PostgreSQL** database
3. **Environment variables** properly configured
4. **SSL/TLS** for production (recommended)

### Production Environment Variables
```env
PG_USER=production_user
PG_HOST=production_database_host
PG_DATABASE=todo_app_production
PG_PASSWORD=production_password
PG_PORT=5432
PG_SSL=true  # Enable SSL in production
```

### Deployment Steps
1. Build the project: `npm run build`
2. Upload the `dist` folder to hosting service
3. Set up PostgreSQL database in production
4. Update production environment variables
5. Run the app: `npm start` or using PM2

## 🛠️ Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running and settings are correct
2. **CORS Errors**: Check API endpoint settings
3. **Build Errors**: Make sure all dependencies are installed

### PostgreSQL Connection Test
```bash
# Test PostgreSQL connection
psql -h localhost -U your_user -d todo_app

# Check PostgreSQL status
sudo systemctl status postgresql
```

## 🤝 Contributing

We welcome your contributions to improve this project!

1. Fork the repository
2. Create a feature branch
3. Make the required changes
4. Test your changes thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Important Note**: This project is intended for personal and educational use. In production environment, security measures should be enhanced and a user authentication system should be added instead of using the default user identifier.

---

## 📧 **Contact**

**Owner**: Fahad Alhuqaili

- 🐦 **Twitter/X**: [@falhuqaili](https://twitter.com/falhuqaili)
- 💼 **LinkedIn**: [/in/fahad-alhuqaili](https://linkedin.com/in/fahad-alhuqaili)
- 📧 **Email**: [Fahad@Alhuqaili.com](mailto:Fahad@Alhuqaili.com)
- 🤖 **Bot**: [t.me/CoolDLBot](https://t.me/CoolDLBot)